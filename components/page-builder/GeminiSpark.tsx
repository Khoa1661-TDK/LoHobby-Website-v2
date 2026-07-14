// components/page-builder/GeminiSpark.tsx — the four-pointed "spark" mark used throughout
// the AI helper (FAB, panel header, streaming/typing indicator). A single reusable SVG so
// the gradient definition (blue -> purple -> pink) lives in one place; colors are pulled
// from the --gemini-* CSS custom properties (see app/globals.css), never hardcoded here.
import { useId, type ReactElement } from 'react';

type Props = {
  size?: number;
  className?: string;
};

export default function GeminiSpark({ size = 20, className = '' }: Props): ReactElement {
  // Unique per instance so multiple sparks on screen (FAB + header + typing indicator)
  // don't collide on the same gradient id.
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Gemini"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: 'var(--gemini-blue)' }} />
          <stop offset="50%" style={{ stopColor: 'var(--gemini-purple)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--gemini-pink)' }} />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 0 12.8 5.7 15.2 8.8C17.6 11.9 24 12 24 12C24 12 17.6 12.1 15.2 15.2C12.8 18.3 12 24 12 24C12 24 11.2 18.3 8.8 15.2C6.4 12.1 0 12 0 12C0 12 6.4 11.9 8.8 8.8C11.2 5.7 12 0 12 0Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
