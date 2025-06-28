import type { JSX } from 'hono/jsx';
import { cn } from '../../lib/utils';

export interface LabelProps extends JSX.HTMLAttributes {
  htmlFor?: string;
}

export function Label({ class: className, children, ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: This is a reusable component, htmlFor is passed via props
    <label
      class={cn(
        'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
