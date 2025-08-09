import type { FC } from 'hono/jsx';
import { H1, Text } from '../base';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-6 text-center">
      <svg
        aria-label="Axiom logomark"
        className="mx-auto mb-4"
        fill="none"
        height="64"
        role="img"
        title="Axiom logo"
        viewBox="0 0 32 32"
        width="64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clip-path="url(#clip0_366_3390)">
          <path
            className="fill-gray-900 dark:fill-gray-100"
            d="M26.8391 20.2575L22.1395 12.4016C21.9241 12.0406 21.3931 11.7452 20.9595 11.7452H18.0255C17.3436 11.7452 17.064 11.2811 17.4042 10.7139L19.0131 8.03132C19.1408 7.81839 19.1406 7.55632 19.0124 7.34365C18.8842 7.13099 18.6477 7 18.3917 7H14.2988C13.8652 7 13.333 7.29476 13.1161 7.65498L5.1628 20.8625C4.94587 21.2227 4.94571 21.8123 5.16248 22.1726L7.20891 25.5745C7.54988 26.1413 8.10908 26.1419 8.45149 25.576L10.0506 22.9331C10.393 22.3671 10.9522 22.3678 11.2932 22.9346L12.7429 25.3444C12.9596 25.7048 13.4917 25.9995 13.9252 25.9995H23.3832C23.8167 25.9995 24.3488 25.7048 24.5656 25.3444L26.8367 21.5692C27.0535 21.2088 27.0545 20.6186 26.8391 20.2575ZM20.4924 19.8794C20.8312 20.4474 20.5505 20.9121 19.8685 20.9121H12.5119C11.8299 20.9121 11.5509 20.4483 11.8919 19.8815L15.5732 13.7623C15.9141 13.1955 16.4721 13.1955 16.813 13.7624L20.4924 19.8794Z"
          />
        </g>
        <defs>
          <clipPath id="clip0_366_3390">
            <rect
              fill="white"
              height="19"
              transform="translate(5 7)"
              width="22"
            />
          </clipPath>
        </defs>
      </svg>
      <H1>{title}</H1>
      {subtitle && <Text>{subtitle}</Text>}
    </div>
  );
};
