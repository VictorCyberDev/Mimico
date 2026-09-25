/**
 * The prototype's own glyphs, kept verbatim rather than swapped for an icon
 * library: the mic, the thinking arc and the equaliser bars are drawn to the
 * exact geometry the mic states animate against, so replacing them would
 * change the design rather than tidy it.
 */
type IconProps = { size?: number; className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const MicIcon = ({ size = 26, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.5} className={className} {...stroke}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

export const MicOffIcon = ({ size = 32, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} {...stroke}>
    <path d="M9 9v2a3 3 0 0 0 5.12 2.12M15 6.5V5a3 3 0 0 0-5.94-.6" />
    <path d="M5 11a7 7 0 0 0 10.34 6.13" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
);

export const MailIcon = ({ size = 30, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} {...stroke}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const ToneIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} fill="none" stroke="currentColor" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

export const KeyboardIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} {...stroke}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <line x1="7" y1="10" x2="7" y2="10.01" />
    <line x1="11" y1="10" x2="11" y2="10.01" />
    <line x1="15" y1="10" x2="15" y2="10.01" />
    <line x1="7" y1="14" x2="15" y2="14" />
  </svg>
);

export const HistoryIcon = ({ size = 18, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const PowerIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.7} className={className} fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M12 3v9" />
    <path d="M6.5 6.5a8 8 0 1 0 11 0" />
  </svg>
);

export const ChevronDown = ({ size = 12, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} className={className} {...stroke}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronLeft = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} className={className} {...stroke}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const CloseIcon = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} className={className} fill="none" stroke="currentColor" strokeLinecap="round">
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </svg>
);

export const InfoIcon = ({ size = 12, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} className={className} fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const WarningIcon = ({ size = 26, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.6} className={className} {...stroke}>
    <path d="M12 3 2 20h20L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
  </svg>
);

export const StopIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--text-on-accent)">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const GoogleGlyph = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
    />
  </svg>
);
