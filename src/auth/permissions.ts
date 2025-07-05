// Typed permission names for reference
export const PERMISSION_NAMES = {
  LIST_DATASETS: 'List Datasets',
  APL_QUERIES: 'APL Queries',
  LIST_ANNOTATIONS: 'List Annotations',
  LIST_DASHBOARDS: 'List Dashboards',
  LIST_MONITORS: 'List Monitors',
  LIST_VIRTUAL_FIELDS: 'List Virtual Fields',
} as const;

export type PermissionName = typeof PERMISSION_NAMES[keyof typeof PERMISSION_NAMES];

interface PermissionTest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  name: PermissionName;
  description: string;
  required: boolean;
  category: string;
}

interface PermissionTestResult {
  test: PermissionTest;
  status: 'pass' | 'fail' | 'error';
  statusCode?: number;
  error?: string;
}

export interface PermissionReport {
  overallStatus: 'pass' | 'fail';
  requiredPassed: number;
  requiredFailed: number;
  optionalPassed: number;
  optionalFailed: number;
  results: PermissionTestResult[];
  recommendations: string[];
}

// Define all the endpoints we want to test
const PERMISSION_TESTS: PermissionTest[] = [
  // Core user permissions (required)
  // Dataset permissions (required)
  {
    endpoint: '/v1/datasets',
    method: 'GET',
    name: PERMISSION_NAMES.LIST_DATASETS,
    description: 'View available datasets',
    required: true,
    category: 'Datasets',
  },

  // Query permissions (required)
  {
    endpoint: '/v1/datasets/_apl?format=tabular',
    method: 'POST',
    name: PERMISSION_NAMES.APL_QUERIES,
    description: 'Execute APL queries on datasets',
    required: true,
    category: 'Queries',
  },

  // Annotation permissions (optional)
  {
    endpoint: '/v2/annotations',
    method: 'GET',
    name: PERMISSION_NAMES.LIST_ANNOTATIONS,
    description: 'View annotations and comments',
    required: false,
    category: 'Annotations',
  },

  // Dashboard permissions (optional)
  {
    endpoint: '/v1/dashboards',
    method: 'GET',
    name: PERMISSION_NAMES.LIST_DASHBOARDS,
    description: 'View dashboards',
    required: false,
    category: 'Dashboards',
  },

  // Monitor permissions (optional)
  {
    endpoint: '/v1/monitors',
    method: 'GET',
    name: PERMISSION_NAMES.LIST_MONITORS,
    description: 'View monitors and alerts',
    required: false,
    category: 'Monitors',
  },

  // Virtual field permissions (optional)
  {
    endpoint: '/v1/vfields',
    method: 'GET',
    name: PERMISSION_NAMES.LIST_VIRTUAL_FIELDS,
    description: 'View virtual fields',
    required: false,
    category: 'Virtual Fields',
  },
];

async function testSinglePermission(
  test: PermissionTest,
  token: string,
  baseUrl: string
): Promise<PermissionTestResult> {
  try {
    const url = `${baseUrl}${test.endpoint}`;

    // For POST endpoints that require a body, send a minimal valid request
    let body: string | undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (test.method === 'POST') {
      headers['Content-Type'] = 'application/json';

      // Special handling for specific endpoints
      if (test.endpoint === '/v1/datasets/_apl?format=tabular') {
        // APL query endpoint needs a valid query
        body = JSON.stringify({
          apl: `print "hello from axiom mcp"`,
          startTime: new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
          endTime: new Date().toISOString(),
        });
      } else {
        // For other POST endpoints, we'll just check if they reject properly
        body = JSON.stringify({});
      }
    }

    const response = await fetch(url, {
      method: test.method,
      headers,
      body,
    });

    // For write operations (POST, PUT, DELETE), we consider 400-level errors
    // as "pass" if they're not auth errors, since we're not sending valid data
    if (
      test.method !== 'GET' &&
      response.status >= 400 &&
      response.status < 403
    ) {
      return {
        test,
        status: 'pass',
        statusCode: response.status,
      };
    }

    // 403 Forbidden or 401 Unauthorized means no permission
    if (response.status === 403 || response.status === 401) {
      return {
        test,
        status: 'fail',
        statusCode: response.status,
        error: 'Insufficient permissions',
      };
    }

    // 404 might mean the endpoint doesn't exist or the user has no access
    if (response.status === 404) {
      return {
        test,
        status: 'fail',
        statusCode: response.status,
        error: 'Endpoint not found or no access',
      };
    }

    // 200-299 is success
    if (response.status >= 200 && response.status < 300) {
      return {
        test,
        status: 'pass',
        statusCode: response.status,
      };
    }

    // Other status codes are treated as errors
    return {
      test,
      status: 'error',
      statusCode: response.status,
      error: `Unexpected status code: ${response.status}`,
    };
  } catch (error) {
    return {
      test,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testTokenPermissions(
  token: string,
  baseUrl: string
): Promise<PermissionReport> {
  // Run all tests in parallel for speed
  const results = await Promise.all(
    PERMISSION_TESTS.map((test) => testSinglePermission(test, token, baseUrl))
  );

  // Calculate statistics
  const requiredTests = results.filter((r) => r.test.required);
  const optionalTests = results.filter((r) => !r.test.required);

  const requiredPassed = requiredTests.filter(
    (r) => r.status === 'pass'
  ).length;
  const requiredFailed = requiredTests.filter(
    (r) => r.status !== 'pass'
  ).length;
  const optionalPassed = optionalTests.filter(
    (r) => r.status === 'pass'
  ).length;
  const optionalFailed = optionalTests.filter(
    (r) => r.status !== 'pass'
  ).length;

  // Overall status is pass only if all required permissions pass
  const overallStatus = requiredFailed === 0 ? 'pass' : 'fail';

  // Generate recommendations
  const recommendations: string[] = [];

  if (requiredFailed > 0) {
    recommendations.push(
      '⚠️ Your token is missing required permissions. Please ensure your API token has the necessary scopes.'
    );

    const failedRequired = results
      .filter((r) => r.test.required && r.status !== 'pass')
      .map((r) => `• ${r.test.name}: ${r.test.description}`)
      .join('\n');

    recommendations.push(`Missing required permissions:\n${failedRequired}`);
  }

  if (optionalFailed > 0) {
    const failedOptional = results
      .filter((r) => !r.test.required && r.status !== 'pass')
      .map((r) => r.test);

    // Group by category
    const categorizedOptional = failedOptional.reduce(
      (acc, test) => {
        if (!acc[test.category]) {
          acc[test.category] = [];
        }
        acc[test.category].push(test);
        return acc;
      },
      {} as Record<string, PermissionTest[]>
    );

    const optionalMessage = Object.entries(categorizedOptional)
      .map(([category, tests]) => {
        const testList = tests.map((t) => `  • ${t.name}`).join('\n');
        return `${category}:\n${testList}`;
      })
      .join('\n\n');

    recommendations.push(
      `ℹ️ Optional features unavailable with current permissions:\n\n${optionalMessage}\n\nThese features will be disabled but core functionality will work.`
    );
  }

  if (overallStatus === 'pass' && optionalFailed === 0) {
    recommendations.push('✅ Your token has all available permissions!');
  }

  return {
    overallStatus,
    requiredPassed,
    requiredFailed,
    optionalPassed,
    optionalFailed,
    results,
    recommendations,
  };
}

// Helper function to format the report for display
export function formatPermissionReport(report: PermissionReport): string {
  const {
    overallStatus,
    requiredPassed,
    requiredFailed,
    optionalPassed,
    optionalFailed,
    recommendations,
  } = report;

  const lines = [
    '=== Token Permission Report ===',
    '',
    `Overall Status: ${overallStatus === 'pass' ? '✅ PASS' : '❌ FAIL'}`,
    '',
    'Summary:',
    `• Required Permissions: ${requiredPassed} passed, ${requiredFailed} failed`,
    `• Optional Permissions: ${optionalPassed} passed, ${optionalFailed} failed`,
    '',
    'Detailed Results:',
  ];

  // Group results by category
  const byCategory = report.results.reduce(
    (acc, result) => {
      const category = result.test.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(result);
      return acc;
    },
    {} as Record<string, PermissionTestResult[]>
  );

  Object.entries(byCategory).forEach(([category, results]) => {
    lines.push('', `[${category}]`);
    results.forEach((result) => {
      const status =
        result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      const required = result.test.required ? ' (required)' : '';
      const error = result.error ? ` - ${result.error}` : '';
      lines.push(`${status} ${result.test.name}${required}${error}`);
    });
  });

  if (recommendations.length > 0) {
    lines.push('', 'Recommendations:', '');
    recommendations.forEach((rec) => lines.push(rec));
  }

  return lines.join('\n');
}
