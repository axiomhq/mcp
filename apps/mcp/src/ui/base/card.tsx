import type { FC } from 'hono/jsx';
import type { BaseProps } from './types';

interface CardProps extends BaseProps {}

export const Card: FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="flex justify-between border-b dark:border-gray-700">
        <div className="h-8 w-8 border-r dark:border-gray-700" />
        <div className="h-8 w-8 border-l dark:border-gray-700" />
      </div>
      <div className="flex">
        <div className="w-8 flex-none border-r dark:border-gray-700" />
        <div className="grow p-8">{children}</div>
        <div className="w-8 flex-none border-l dark:border-gray-700" />
      </div>
      <div className="flex justify-between border-t dark:border-gray-700">
        <div className="h-8 w-8 border-r dark:border-gray-700" />
        <div className="h-8 w-8 border-l dark:border-gray-700" />
      </div>
    </div>
  );
};
