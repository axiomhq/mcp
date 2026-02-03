export type ServerProps = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenKey: string;
  orgId: string;
  // Optional runtime controls from URL params
  // Parsed from `max-age` and `with-otel`
  maxCells?: number;
  withOTel?: boolean;
  traceHeaders?: Record<string, string>;
};
