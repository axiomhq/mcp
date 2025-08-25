#!/usr/bin/env tsx
/**
 * Extract tool metadata from the MCP packages at build time
 * This script parses the source files to find all tool registrations
 * and generates a JSON file with tool metadata for the landing page
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  parameters?: Record<string, any>;
}

interface PromptMetadata {
  name: string;
  description: string;
  category: string;
}

interface ExtractedMetadata {
  tools: ToolMetadata[];
  prompts: PromptMetadata[];
  resources: any[];
}

// Find all TypeScript files in a directory recursively
function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (
        stat.isDirectory() &&
        !entry.startsWith('.') &&
        entry !== 'node_modules'
      ) {
        walk(fullPath);
      } else if (
        stat.isFile() &&
        entry.endsWith('.ts') &&
        !entry.endsWith('.test.ts') &&
        !entry.endsWith('.spec.ts')
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Extract tool registrations from source code
function extractTools(content: string, category: string): ToolMetadata[] {
  const tools: ToolMetadata[] = [];

  // First, extract tool name constants
  const toolConstants: Record<string, string> = {};
  const constantRegex = /const\s+(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = constantRegex.exec(content)) !== null) {
    const [, constName, value] = match;
    if (constName.startsWith('Tool')) {
      toolConstants[constName] = value;
    }
  }

  // Match server.tool() calls with both string literals and constants
  // Pattern 1: server.tool('name', 'description', ...)
  // Pattern 2: server.tool(ConstantName, 'description', ...)
  const toolRegex =
    /server\.tool\(\s*(?:['"`]([^'"`]+)['"`]|(\w+))\s*,\s*['"`]((?:[^'"`\\]|\\.|(?:['"`](?:[^'"`\\]|\\.)*['"`]))*?)['"`]/gms;

  while ((match = toolRegex.exec(content)) !== null) {
    const [, literalName, constantName, description] = match;

    // Get the tool name from either the literal or the constant
    let name = literalName;
    if (!name && constantName) {
      name = toolConstants[constantName];
      if (!name) {
        // If we can't find the constant value, try to derive it from the constant name
        // e.g., ToolAnalyzeCosts -> genai-analyzeCosts
        name = constantName
          .replace(/^Tool/, '')
          .replace(/([A-Z])/g, (match, char, index) =>
            index === 0 ? char.toLowerCase() : '-' + char.toLowerCase()
          );

        // Add category prefix if not already present
        if (category === 'GenAI' && !name.startsWith('genai-')) {
          name = 'genai-' + name;
        }
      }
    }

    if (!name) continue;

    // Clean up the description - remove escape sequences and normalize whitespace
    const cleanDescription = description
      .replace(/\\n/g, ' ')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    tools.push({
      name,
      description: cleanDescription,
      category,
    });
  }

  return tools;
}

// Extract prompt registrations from source code
function extractPrompts(content: string, category: string): PromptMetadata[] {
  const prompts: PromptMetadata[] = [];

  // First, extract prompt name constants
  const promptConstants: Record<string, string> = {};
  const constantRegex = /const\s+(\w+)\s*=\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = constantRegex.exec(content)) !== null) {
    const [, constName, value] = match;
    if (constName.startsWith('Prompt')) {
      promptConstants[constName] = value;
    }
  }

  // Match server.prompt() calls with both string literals and constants
  const promptRegex =
    /server\.prompt\(\s*(?:['"`]([^'"`]+)['"`]|(\w+))\s*,\s*['"`]((?:[^'"`\\]|\\.|(?:['"`](?:[^'"`\\]|\\.)*['"`]))*?)['"`]/gms;

  while ((match = promptRegex.exec(content)) !== null) {
    const [, literalName, constantName, description] = match;

    // Get the prompt name from either the literal or the constant
    let name = literalName;
    if (!name && constantName) {
      name = promptConstants[constantName];
      if (!name) {
        // If we can't find the constant value, try to derive it from the constant name
        name = constantName
          .replace(/^Prompt/, '')
          .replace(/([A-Z])/g, (match, char, index) =>
            index === 0 ? char.toLowerCase() : '-' + char.toLowerCase()
          );
      }
    }

    if (!name) continue;

    // Clean up the description
    const cleanDescription = description
      .replace(/\\n/g, ' ')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    prompts.push({
      name,
      description: cleanDescription,
      category,
    });
  }

  return prompts;
}

// Main extraction function
function extractMetadata(): ExtractedMetadata {
  const packageRoot = resolve(__dirname, '..');
  const srcDir = join(packageRoot, 'src');

  const metadata: ExtractedMetadata = {
    tools: [],
    prompts: [],
    resources: [],
  };

  // Define categories and their directories
  const categories = [
    { name: 'Core', dir: 'core' },
  ];

  for (const { name: categoryName, dir } of categories) {
    const categoryDir = join(srcDir, dir);

    try {
      const files = findTypeScriptFiles(categoryDir);

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');

        // Extract tools
        const tools = extractTools(content, categoryName);
        metadata.tools.push(...tools);

        // Extract prompts
        const prompts = extractPrompts(content, categoryName);
        metadata.prompts.push(...prompts);
      }
    } catch (error) {
      console.warn(
        `Warning: Could not process category ${categoryName}:`,
        error
      );
    }
  }

  // Sort tools and prompts alphabetically within their categories
  metadata.tools.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  metadata.prompts.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return metadata;
}

// Generate the metadata file
function generateMetadataFile() {
  console.log('Extracting MCP tool metadata...');

  const metadata = extractMetadata();

  // Output paths - generate both JSON and TypeScript module
  const outputDir = resolve(__dirname, '..');
  const jsonPath = join(outputDir, 'metadata.json');
  const tsPath = join(outputDir, 'metadata.ts');

  // Write JSON file
  writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
  console.log(`✓ Generated ${jsonPath}`);

  // Generate TypeScript module
  const tsContent = `/**
 * Auto-generated MCP metadata
 * Generated at: ${new Date().toISOString()}
 * DO NOT EDIT - This file is automatically generated by scripts/extract-tools.ts
 */

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  parameters?: Record<string, any>;
}

export interface PromptMetadata {
  name: string;
  description: string;
  category: string;
}

export interface MCPMetadata {
  tools: ToolMetadata[];
  prompts: PromptMetadata[];
  resources: any[];
}

export const metadata: MCPMetadata = ${JSON.stringify(metadata, null, 2)};

export const toolsByCategory = metadata.tools.reduce((acc, tool) => {
  if (!acc[tool.category]) {
    acc[tool.category] = [];
  }
  acc[tool.category].push(tool);
  return acc;
}, {} as Record<string, ToolMetadata[]>);

export const promptsByCategory = metadata.prompts.reduce((acc, prompt) => {
  if (!acc[prompt.category]) {
    acc[prompt.category] = [];
  }
  acc[prompt.category].push(prompt);
  return acc;
}, {} as Record<string, PromptMetadata[]>);
`;

  writeFileSync(tsPath, tsContent);
  console.log(`✓ Generated ${tsPath}`);

  // Print summary
  console.log('\nMetadata Summary:');
  console.log(`  Tools: ${metadata.tools.length}`);
  console.log(`  Prompts: ${metadata.prompts.length}`);
  console.log(`  Resources: ${metadata.resources.length}`);

  // Print by category
  const toolCategories = [...new Set(metadata.tools.map((t) => t.category))];
  for (const category of toolCategories) {
    const categoryTools = metadata.tools.filter((t) => t.category === category);
    console.log(`    ${category}: ${categoryTools.length} tools`);
  }
}

// Run the script
if (require.main === module) {
  generateMetadataFile();
}

export { extractMetadata, generateMetadataFile };
