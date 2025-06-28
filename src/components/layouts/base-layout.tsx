import { globalStyles } from '../../lib/styles';

interface BaseLayoutProps {
  title: string;
  children: any;
  description?: string;
}

export function BaseLayout({ title, children, description }: BaseLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>{title}</title>
        {description && <meta content={description} name="description" />}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link
          crossorigin="anonymous"
          href="https://fonts.gstatic.com"
          rel="preconnect"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
