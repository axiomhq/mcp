import type { FC } from 'hono/jsx';

interface ConnectionVisualProps {
  clientUri: string;
  clientName: string;
}

export const ConnectionVisual: FC<ConnectionVisualProps> = ({
  clientUri,
  clientName,
}) => {
  // Use the icon endpoint to get the best available icon
  const iconUrl = `/icon?domain=${encodeURIComponent(clientUri)}`;

  return (
    <div className=" mb-6">
      <div className="flex items-center gap-4">
        {/* Client App Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded bg-white flex items-center justify-center overflow-hidden border">
            <img
              alt={`${clientName} icon`}
              className="w-16 h-16 object-contain"
              src={iconUrl}
            />
          </div>
        </div>

        {/* Connection Icon */}
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        {/* Axiom Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded bg-white flex items-center justify-center overflow-hidden border">
            <img
              alt="Axiom logo"
              className="w-16 h-16 object-contain"
              src="https://axiom.co/android-chrome-512x512.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
