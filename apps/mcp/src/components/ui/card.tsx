import type { JSX } from 'hono/jsx';
import { cn } from '../../lib/utils';

export function Card({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <div
      class={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <div class={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <h3
      class={cn(
        'font-semibold text-2xl leading-none tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <p class={cn('text-muted-foreground text-sm', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <div class={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <div class={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
