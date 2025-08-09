import type { FC } from 'hono/jsx';
import type { BaseProps, ChangeHandler } from './types';

interface SelectProps extends BaseProps {
  fullWidth?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  autofocus?: boolean;
  value?: string;
  onchange?: ChangeHandler;
}

export const Select: FC<SelectProps> = ({
  fullWidth = true,
  className = '',
  children,
  id,
  name,
  required,
  disabled,
  autofocus,
  value,
  onchange,
}) => {
  const baseStyles =
    'appearance-none cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-all duration-200 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400';
  const widthStyles = fullWidth ? 'w-full' : '';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={`relative ${widthStyles}`}>
      <select
        autofocus={autofocus}
        className={`${baseStyles} ${widthStyles} ${disabledStyles} ${className} pr-10`}
        disabled={disabled}
        id={id}
        name={name}
        onchange={onchange}
        required={required}
        value={value}
      >
        {children}
      </select>
      {/* Custom dropdown arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          className="h-4 w-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M7 7l3 3 3-3"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
      </div>
    </div>
  );
};
