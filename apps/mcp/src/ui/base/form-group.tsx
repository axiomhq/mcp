import type { FC } from 'hono/jsx';
import type { BaseProps } from './types';

interface FormGroupProps extends BaseProps {
  label: string;
  htmlFor: string;
}

export const FormGroup: FC<FormGroupProps> = ({
  label,
  htmlFor,
  className = '',
  children,
}) => {
  const baseStyles = 'mb-6';

  return (
    <div className={`${baseStyles} ${className}`}>
      {children}
    </div>
  );
};
