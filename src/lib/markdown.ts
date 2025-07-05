export class Builder {
  private content: string[] = [];

  h1(text: string): this {
    this.content.push(`# ${text}\n`);
    return this;
  }

  h2(text: string): this {
    this.content.push(`## ${text}\n`);
    return this;
  }

  h3(text: string): this {
    this.content.push(`### ${text}\n`);
    return this;
  }

  p(text: string): this {
    this.content.push(`${text}\n`);
    return this;
  }

  list(items: string[], contentIfEmpty?: string): this {
    if (items.length === 0 && contentIfEmpty !== undefined) {
      this.content.push(contentIfEmpty);
    } else {
      items.forEach((item) => this.content.push(`- ${item}`));
    }
    this.content.push('');
    return this;
  }

  numberedList(items: string[]): this {
    items.forEach((item, index) => this.content.push(`${index + 1}. ${item}`));
    this.content.push('');
    return this;
  }

  code(code: string, language = ''): this {
    this.content.push(`\`\`\`${language}\n${code}\n\`\`\`\n`);
    return this;
  }

  inlineCode(text: string): string {
    return `\`${text}\``;
  }

  table(headers: string[], rows: string[][]): this {
    this.content.push(`| ${headers.join(' | ')} |`);
    this.content.push(`| ${headers.map(() => '---').join(' | ')} |`);
    rows.forEach((row) => {
      this.content.push(`| ${row.join(' | ')} |`);
    });
    this.content.push('');
    return this;
  }

  csv(headers: string[], rows: string[][]): this {
    // Helper to escape CSV fields
    const escapeCSV = (field: string): string => {
      // Convert to string if not already
      const str = String(field);
      // Check if escaping is needed
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape quotes by doubling them and wrap in quotes
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Add headers
    this.content.push(headers.map(escapeCSV).join(','));

    // Add rows
    rows.forEach((row) => {
      this.content.push(row.map(escapeCSV).join(','));
    });

    this.content.push('');
    return this;
  }

  quote(text: string): this {
    this.content.push(`> ${text}\n`);
    return this;
  }

  hr(): this {
    this.content.push('---\n');
    return this;
  }

  raw(text: string): this {
    this.content.push(text);
    return this;
  }

  build(): string {
    return this.content.join('\n');
  }

  toString(): string {
    return this.build();
  }
}

export const Format = {
  listItem(...args: (string | undefined | null)[]): string {
    return args.filter((arg) => arg != null && arg !== '').join(' - ');
  },

  link(text: string, url: string): string {
    return `[${text}](${url})`;
  },

  bold(text: string): string {
    return `**${text}**`;
  },

  italic(text: string): string {
    return `*${text}*`;
  },

  ident(text: string): string {
    return `\`${text}\``;
  },
};
