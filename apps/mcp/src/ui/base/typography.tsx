import type { FC } from 'hono/jsx';
import type { BaseProps } from './types';

interface TypographyProps extends BaseProps {}

export const H1: FC<TypographyProps> = ({ children, className = '' }) => {
  const baseStyles =
    'mb-2 font-semibold text-gray-900 text-xl dark:text-gray-100';
  return <h1 className={`${baseStyles} ${className}`}>{children}</h1>;
};

export const H2: FC<TypographyProps> = ({ children, className = '' }) => {
  const baseStyles =
    'mb-3 font-semibold text-gray-900 text-lg dark:text-gray-100';
  return <h2 className={`${baseStyles} ${className}`}>{children}</h2>;
};

export const H3: FC<TypographyProps> = ({ children, className = '' }) => {
  const baseStyles =
    'mb-2 font-semibold text-gray-900 text-base dark:text-gray-100';
  return <h3 className={`${baseStyles} ${className}`}>{children}</h3>;
};

interface TextProps extends BaseProps {
  variant?: 'body' | 'muted';
}

export const Text: FC<TextProps> = ({
  children,
  className = '',
  variant = 'body',
}) => {
  const variantStyles = {
    body: 'p-0 m-0 text-gray-700 leading-tight dark:text-gray-400',
    muted: 'p-0 m-0 text-gray-500 dark:text-gray-400',
  };

  return <p className={`${variantStyles[variant]} ${className}`}>{children}</p>;
};

interface LinkProps extends BaseProps {
  href: string;
  target?: string;
  rel?: string;
}

export const Link: FC<LinkProps> = ({
  children,
  href,
  target,
  rel,
  className = '',
}) => {
  const baseStyles =
    'text-gray-600 underline hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300';

  return (
    <a
      className={`${baseStyles} ${className}`}
      href={href}
      rel={rel}
      target={target}
    >
      {children}
    </a>
  );
};
