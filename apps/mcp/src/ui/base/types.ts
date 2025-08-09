import type { HtmlEscapedString } from 'hono/utils/html';

// Hono JSX child types
// Hono's JSX returns HtmlEscapedString or Promise<HtmlEscapedString>
export type Child =
  | string
  | number
  | boolean
  | null
  | undefined
  | HtmlEscapedString
  | Promise<HtmlEscapedString>
  | Child[];

export type Children = Child;

// Common HTML attribute types for our components
export type HTMLButtonType = 'button' | 'submit' | 'reset';

// Event handler types
export type ClickHandler = string | (() => void);
export type ChangeHandler = string | ((e: Event) => void);

// Base props that include children
export interface PropsWithChildren {
  children?: Children;
}

// Base props that include className
export interface PropsWithClassName {
  className?: string;
}

// Combined base props
export interface BaseProps extends PropsWithChildren, PropsWithClassName {}
