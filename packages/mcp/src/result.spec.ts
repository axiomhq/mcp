import { describe, expect, it } from 'vitest';
import { markdownResult, stringResult } from './result';

describe('markdownResult', () => {
  it('should return a CallToolResult with text content', () => {
    const result = markdownResult()
      .h1('Test Title')
      .p('Test paragraph')
      .result();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '# Test Title\n\nTest paragraph\n',
        },
      ],
    });
  });

  it('should support all markdown builder methods', () => {
    const result = markdownResult()
      .h1('Title')
      .h2('Subtitle')
      .h3('Sub-subtitle')
      .p('Paragraph')
      .list(['Item 1', 'Item 2'], 'Empty list message')
      .numberedList(['First', 'Second'])
      .code('const x = 1;', 'javascript')
      .table(
        ['Col1', 'Col2'],
        [
          ['A', 'B'],
          ['C', 'D'],
        ]
      )
      .csv(
        ['Name', 'Age'],
        [
          ['Alice', '30'],
          ['Bob', '25'],
        ]
      )
      .quote('This is a quote')
      .hr()
      .raw('Raw text')
      .result();

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
    expect(result.content[0].text).toContain('# Title');
    expect(result.content[0].text).toContain('## Subtitle');
    expect(result.content[0].text).toContain('### Sub-subtitle');
    expect(result.content[0].text).toContain('- Item 1');
    expect(result.content[0].text).toContain('1. First');
    expect(result.content[0].text).toContain('```javascript');
    expect(result.content[0].text).toContain('| Col1 | Col2 |');
    expect(result.content[0].text).toContain('Name,Age');
    expect(result.content[0].text).toContain('> This is a quote');
    expect(result.content[0].text).toContain('---');
    expect(result.content[0].text).toContain('Raw text');
  });

  it('should handle empty CSV with custom message', () => {
    const result = markdownResult()
      .csv(['Col1', 'Col2'], [], 'No data available')
      .result();

    expect(result.content[0].text).toBe('No data available');
  });

  it('should handle empty list with custom message', () => {
    const result = markdownResult().list([], 'No items found').result();

    expect(result.content[0].text).toBe('No items found\n');
  });

  it('should produce the same output as Builder + stringResult', () => {
    const markdownResultOutput = markdownResult()
      .h1('Test')
      .p('Content')
      .result();

    const expectedOutput = stringResult('# Test\n\nContent\n');

    expect(markdownResultOutput).toEqual(expectedOutput);
  });

  it('should support method chaining', () => {
    const result = markdownResult().h1('One').h2('Two').h3('Three').result();

    expect(result.content[0].text).toBe('# One\n\n## Two\n\n### Three\n');
  });

  it('should escape CSV fields properly', () => {
    const result = markdownResult()
      .csv(
        ['Name', 'Description'],
        [
          ['Alice', 'Works at "ACME, Inc."'],
          ['Bob', 'Likes\nnewlines'],
        ]
      )
      .result();

    expect(result.content[0].text).toContain('"Works at ""ACME, Inc."""');
    expect(result.content[0].text).toContain('"Likes\nnewlines"');
  });

  it('should be ready for future markdown content type', () => {
    // Currently returns text type, but the abstraction allows
    // for easy migration to a dedicated markdown type if/when supported
    const result = markdownResult().h1('Future Ready').result();

    // For now, it's text
    expect(result.content[0].type).toBe('text');

    // But the implementation could easily be changed to:
    // expect(result.content[0].type).toBe('markdown');
    // without changing any calling code
  });
});
