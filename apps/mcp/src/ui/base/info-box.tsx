import type { FC } from 'hono/jsx';
import type { BaseProps, Children, PropsWithClassName } from './types';

interface InfoBoxProps extends BaseProps {}

interface InfoItemProps extends PropsWithClassName {
  label: string;
  children: Children;
}

export const InfoBox: FC<InfoBoxProps> = ({ children, className = '' }) => {
  const baseStyles =
    'border rounded border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50';

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
};

export const InfoItem: FC<InfoItemProps> = ({
  label,
  children,
  className = '',
}) => {
  const labelStyles = 'font-semibold text-gray-700 dark:text-gray-300';
  const valueStyles = 'break-all text-gray-600 dark:text-gray-400 text-right';

  return (
    <div className={`m-0 flex px-4 py-2 text-xs ${className}`}>
      <div className={`grow ${labelStyles}`}>{label}</div>
      <div className={`${valueStyles}`}>{children}</div>
    </div>
  );
};
