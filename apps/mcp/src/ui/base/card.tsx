import type { FC } from 'hono/jsx';
import type { BaseProps } from './types';

interface CardProps extends BaseProps {}

export const Card: FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      <div className="flex border-b  dark:border-gray-700 justify-between">
        <div className="border-r dark:border-gray-700 w-8 h-8"></div>
        <div className="border-l dark:border-gray-700 w-8 h-8"></div>
      </div>
      <div className="flex">
        <div className="border-r  dark:border-gray-700 w-8 flex-none"></div>
        <div className="p-8 grow">{children}</div>
        <div className="border-l  dark:border-gray-700 w-8 flex-none"></div>
      </div>
      <div className="flex border-t  dark:border-gray-700 justify-between">
        <div className="border-r dark:border-gray-700 w-8 h-8"></div>
        <div className="border-l dark:border-gray-700 w-8 h-8"></div>
      </div>
    </div>
  );
};
