import { useState } from "react";

type BadgeTier = "creator" | "leader" | "elite";

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  tier?: BadgeTier;
}

const BADGE_CONFIG = {
  creator: {
    label: "Creator Verified",
    icon: "🔵",
    description: "Active creator with quality content",
    gradient: {
      id: "blue-grad",
      stops: [
        { offset: "0%", color: "#1E3A8A" },
        { offset: "15%", color: "#3B82F6" },
        { offset: "35%", color: "#60A5FA" },
        { offset: "55%", color: "#2563EB" },
        { offset: "75%", color: "#93C5FD" },
        { offset: "100%", color: "#1E40AF" },
      ],
    },
    bevel: [
      { offset: "0%", color: "#FFFFFF", opacity: 0.6 },
      { offset: "30%", color: "#FFFFFF", opacity: 0.1 },
      { offset: "70%", color: "#1E3A8A", opacity: 0.15 },
      { offset: "100%", color: "#0C1B44", opacity: 0.45 },
    ],
    shadow: "#0C1B44",
  },
  leader: {
    label: "Leader Verified",
    icon: "🏆",
    description: "Verified business leader and professional",
    gradient: {
      id: "gold-grad",
      stops: [
        { offset: "0%", color: "#9A7B1C" },
        { offset: "15%", color: "#E6C762" },
        { offset: "35%", color: "#FFF4C2" },
        { offset: "55%", color: "#C89D2D" },
        { offset: "75%", color: "#F7E28B" },
        { offset: "100%", color: "#8A6614" },
      ],
    },
    bevel: [
      { offset: "0%", color: "#FFFFFF", opacity: 0.6 },
      { offset: "30%", color: "#FFFFFF", opacity: 0.1 },
      { offset: "70%", color: "#7A5810", opacity: 0.15 },
      { offset: "100%", color: "#503505", opacity: 0.45 },
    ],
    shadow: "#503505",
  },
  elite: {
    label: "Elite Verified",
    icon: "💎",
    description: "Top contributor and exceptional leader",
    gradient: {
      id: "diamond-grad",
      stops: [
        { offset: "0%", color: "#4C1D95" },
        { offset: "15%", color: "#7C3AED" },
        { offset: "35%", color: "#A78BFA" },
        { offset: "55%", color: "#8B5CF6" },
        { offset: "75%", color: "#C4B5FD" },
        { offset: "100%", color: "#5B21B6" },
      ],
    },
    bevel: [
      { offset: "0%", color: "#FFFFFF", opacity: 0.7 },
      { offset: "30%", color: "#FFFFFF", opacity: 0.2 },
      { offset: "70%", color: "#4C1D95", opacity: 0.2 },
      { offset: "100%", color: "#2E1065", opacity: 0.5 },
    ],
    shadow: "#2E1065",
  },
};

/**
 * Three-tier verification badge system
 * - creator (blue): Active creators with quality content
 * - leader (gold): Verified business leaders and professionals
 * - elite (diamond): Top contributors and exceptional leaders
 */
export function VerifiedBadge({ size = 16, className = "", tier = "leader" }: VerifiedBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = BADGE_CONFIG[tier];
  const id = `vb-${tier}`;

  return (
    <div className="relative inline-block">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`${className} cursor-pointer`}
        aria-label={config.label}
        role="img"
        style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <defs>
          {/* Gradient for the badge */}
          <linearGradient id={`${id}-grad`} x1="0%" y1="100%" x2="100%" y2="0%">
            {config.gradient.stops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* 3D Bevel/Highlight border gradient */}
          <linearGradient id={`${id}-bevel`} x1="0%" y1="0%" x2="100%" y2="100%">
            {config.bevel.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
            ))}
          </linearGradient>

          {/* Outer drop shadow */}
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.75" floodColor={config.shadow} floodOpacity="0.35" />
          </filter>

          {/* Inner shadow for checkmark */}
          <filter id={`${id}-tick-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.75" stdDeviation="0.5" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Main Starburst/Badge Shape */}
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
            <div className="text-2xl flex-shrink-0">{config.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground mb-1">{config.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.description}
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
