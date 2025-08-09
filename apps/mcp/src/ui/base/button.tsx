import type { FC } from 'hono/jsx';
import type { BaseProps, ClickHandler, HTMLButtonType } from './types';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  type?: HTMLButtonType;
  onclick?: ClickHandler;
  disabled?: boolean;
  name?: string;
  value?: string;
  style?: Record<string, string>;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gray-800 text-gray-100 hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-gray-100',
  secondary:
    'bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500',
};

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  onclick,
  className = '',
  children,
  disabled,
  name,
  value,
  style,
}) => {
  const baseStyles =
    'rounded px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  const widthStyles = fullWidth ? 'w-full' : '';
  const variantStyle = variantStyles[variant];
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseStyles} ${widthStyles} ${variantStyle} ${disabledStyles} ${className}`}
      disabled={disabled}
      name={name}
      onclick={onclick}
      style={style}
      type={type}
      value={value}
    >
      {children}
    </button>
  );
};
