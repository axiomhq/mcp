import { cn } from "../../lib/utils"
import type { JSX } from "hono/jsx"

export interface SpinnerProps extends JSX.HTMLAttributes {
  size?: "sm" | "md" | "lg"
}

export function Spinner({ class: className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  return (
    <div
      class={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}