import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import type { JSX } from "hono/jsx"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AlertProps
  extends JSX.HTMLAttributes,
    VariantProps<typeof alertVariants> {}

export function Alert({ class: className, variant, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      class={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function AlertTitle({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <h5
      class={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h5>
  )
}

export function AlertDescription({
  class: className,
  children,
  ...props
}: JSX.HTMLAttributes) {
  return (
    <div
      class={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  )
}