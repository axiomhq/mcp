import { cn } from "../../lib/utils"
import type { JSX } from "hono/jsx"

export interface LabelProps
  extends JSX.HTMLAttributes {
  htmlFor?: string
}

export function Label({
  class: className,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      class={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}