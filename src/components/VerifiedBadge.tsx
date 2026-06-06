import { useState } from "react";

/**
 * Professional golden verification badge — shown next to verified user names.
 * Inspired by premium social platform verification badges with a rich gold gradient,
 * subtle shadow, and precise white checkmark geometry.
 */
export function VerifiedBadge({ size = 16, className = "" }: { size?: number; className?: string }) {
  const id = "vb-gold";
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`${className} cursor-pointer`}
        aria-label="Verified"
        role="img"
        style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
      <defs>
        {/* Rich multi-stop gold gradient with high metallic contrast */}
        <linearGradient id={`${id}-grad`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9A7B1C" />
          <stop offset="15%" stopColor="#E6C762" />
          <stop offset="35%" stopColor="#FFF4C2" />
          <stop offset="55%" stopColor="#C89D2D" />
          <stop offset="75%" stopColor="#F7E28B" />
          <stop offset="100%" stopColor="#8A6614" />
        </linearGradient>

        {/* 3D Bevel/Highlight border gradient */}
        <linearGradient id={`${id}-bevel`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="70%" stopColor="#7A5810" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#503505" stopOpacity="0.45" />
        </linearGradient>

        {/* Outer drop shadow for the entire badge */}
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.75" floodColor="#503505" floodOpacity="0.35" />
        </filter>

        {/* Inner shadow / dimension for checkmark */}
        <filter id={`${id}-tick-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.75" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main Starburst/Badge Shape with multi-stop gold gradient */}
      <path
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.407.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
        fill={`url(#${id}-grad)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* Bevel Outline Layer for 3D effect */}
      <path
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.407.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
        fill="none"
        stroke={`url(#${id}-bevel)`}
        strokeWidth="0.8"
      />

      {/* Bold white checkmark with drop shadow */}
      <path
        d="M8.2 12.2l2.6 2.6 5.2-5.2"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id}-tick-shadow)`}
      />
    </svg>

      {/* Tooltip Card */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 bg-card border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width={20}
              height={20}
              className="flex-shrink-0 mt-0.5"
            >
              <defs>
                <linearGradient id="tooltip-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9A7B1C" />
                  <stop offset="50%" stopColor="#FFF4C2" />
                  <stop offset="100%" stopColor="#8A6614" />
                </linearGradient>
              </defs>
              <path
                d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.407.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
                fill="url(#tooltip-grad)"
              />
              <path
                d="M8.2 12.2l2.6 2.6 5.2-5.2"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground mb-1">Verified User</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This account has been verified by the Yesp Leaders team as an authentic member of the community.
              </p>
            </div>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-card border-r border-b border-border rotate-45" />
        </div>
      )}
    </div>
  );
}
