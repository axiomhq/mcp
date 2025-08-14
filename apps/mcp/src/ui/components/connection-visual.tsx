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
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-white">
            <img
              alt={`${clientName} icon`}
              className="h-16 w-16 object-contain"
              src={iconUrl}
            />
          </div>
        </div>

        {/* Connection Icon */}
        <div className="flex items-center">
          <svg
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        {/* Axiom Icon */}
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-white">
            <img
              alt="Axiom logo"
              className="h-16 w-16 object-contain"
              src="https://axiom.co/android-chrome-512x512.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
