/**
 * Custom SVG Icon Library — AutoTestAI White & Brown Theme
 *
 * All icons:
 *  - aria-hidden="true" by default (decorative)
 *  - Consistent stroke-width of 1.75
 *  - Default size of 16×16 (overridable via className or width/height props)
 *  - Use on buttons: add aria-label to the parent <button> element
 */

import { cn } from "@/lib/utils";

export interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const defaultSvgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
});

// ─── Navigation & Layout ──────────────────────────────────────────────────────

export function IconDashboard({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconFolderGit({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="14" r="2" />
      <path d="M12 12v-2" />
      <path d="M10 14H8a2 2 0 0 1 0-4" />
      <path d="M14 14h2a2 2 0 0 0 0-4" />
    </svg>
  );
}

export function IconMenu({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function IconClose({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconChevronLeft({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function IconChevronRight({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IconChevronDown({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconChevronUp({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function IconArrowRight({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function IconArrowLeft({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ─── Brand & Status ───────────────────────────────────────────────────────────

export function IconZap({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function IconSparkles({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M12 3c-.5 2-2 3.5-4 4 2 .5 3.5 2 4 4 .5-2 2-3.5 4-4-2-.5-3.5-2-4-4z" />
      <path d="M5 12c-.3 1.2-1.2 2.2-2.5 2.5 1.3.3 2.2 1.3 2.5 2.5.3-1.2 1.2-2.2 2.5-2.5C6.2 14.2 5.3 13.2 5 12z" />
      <path d="M19 6c-.2.8-.8 1.5-1.7 1.7.9.2 1.5.9 1.7 1.7.2-.8.8-1.5 1.7-1.7-.9-.2-1.5-.9-1.7-1.7z" />
    </svg>
  );
}

export function IconShield({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconShieldCheck({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function IconCheckCircle({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function IconXCircle({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function IconAlertTriangle({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconAlertCircle({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function IconInfo({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ─── AI & Agents ──────────────────────────────────────────────────────────────

export function IconBot({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 11v2M15 11v2" />
      <path d="M7 8V6a5 5 0 0 1 10 0v2" />
      <path d="M9 20v1M15 20v1" />
      <rect x="10" y="14" width="4" height="2" rx="1" />
    </svg>
  );
}

export function IconBrain({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.74-4.42 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.54-4.54z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.74-4.42 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.54-4.54z" />
    </svg>
  );
}

export function IconNetwork({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <line x1="12" y1="8" x2="12" y2="12" />
    </svg>
  );
}

export function IconCpu({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

export function IconLayers({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function IconTarget({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconMicroscope({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M6 18h8" />
      <path d="M3 21h18" />
      <path d="M14 21v-4" />
      <path d="M14 7v4" />
      <path d="M10 7H6" />
      <rect x="10" y="3" width="6" height="8" rx="1" />
      <path d="M6 11v7" />
    </svg>
  );
}

// ─── Development & Code ───────────────────────────────────────────────────────

export function IconCode({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function IconFileCode({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 12 8 14 10 16" />
      <polyline points="14 12 16 14 14 16" />
    </svg>
  );
}

export function IconFileDiff({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="13" x2="12" y2="17" />
      <line x1="10" y1="15" x2="14" y2="15" />
      <line x1="10" y1="11" x2="14" y2="11" />
    </svg>
  );
}

export function IconFileSearch({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="11.5" cy="14.5" r="2.5" />
      <line x1="13.25" y1="16.25" x2="15" y2="18" />
    </svg>
  );
}

export function IconScrollText({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <line x1="12" y1="10" x2="16" y2="10" />
      <line x1="12" y1="14" x2="16" y2="14" />
    </svg>
  );
}

export function IconGitBranch({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

export function IconGitCommit({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="4" />
      <line x1="1.05" y1="12" x2="7" y2="12" />
      <line x1="17.01" y1="12" x2="22.96" y2="12" />
    </svg>
  );
}

export function IconGitCompare({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

export function IconGitPullRequest({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
      <polyline points="15 14 18 17 15 20" />
    </svg>
  );
}

export function IconClipboardCheck({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function IconFlask({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M9 3h6" />
      <path d="M10 3v5l-4.5 8.5A2 2 0 0 0 7.25 19h9.5a2 2 0 0 0 1.75-2.5L14 8V3" />
      <path d="M8 17h8" />
    </svg>
  );
}

// ─── Actions & Controls ───────────────────────────────────────────────────────

export function IconPlay({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function IconRefreshCw({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function IconLoader({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={cn("animate-spin", className)} {...rest}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

export function IconCopy({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconCheck({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconX({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconFilter({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function IconSearch({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconCommand({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

// ─── User & Auth ──────────────────────────────────────────────────────────────

export function IconUser({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconLogOut({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconLock({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconMail({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

// ─── Monitoring & Analytics ───────────────────────────────────────────────────

export function IconActivity({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconBarChart({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export function IconBarChart2({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export function IconTrendingUp({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function IconTimer({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 14 15" />
      <path d="M9 3h6" />
    </svg>
  );
}

export function IconClock({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Tools & System ───────────────────────────────────────────────────────────

export function IconBug({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M8 2l1.88 1.88M16 2l-1.88 1.88" />
      <path d="M12 6C9.78 6 8 7.78 8 10v4a4 4 0 0 0 8 0v-4c0-2.22-1.78-4-4-4z" />
      <path d="M2 12h4M18 12h4" />
      <path d="M4 8l3 2M20 8l-3 2" />
      <path d="M4 16l3-2M20 16l-3-2" />
    </svg>
  );
}

export function IconWrench({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IconSettings({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconBell({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconGlobe({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function IconSave({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function IconKey({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3" />
    </svg>
  );
}

export function IconTrash({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function IconPlus({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconUpload({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconFileArchive({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h2" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="20" r="2" />
      <path d="M10 7V5" />
      <path d="M10 11v-2" />
      <path d="M10 15v-2" />
      <path d="M10 18v-1" />
    </svg>
  );
}

export function IconLink({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconDatabase({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function IconServer({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

export function IconTerminal({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

export function IconWifi({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function IconWifiOff({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function IconSquare({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}

export function IconHardDrive({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}

export function IconDownload({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconSun({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function IconMoon({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconArrowUpRight({ className, size = 16, ...rest }: IconProps) {
  return (
    <svg {...defaultSvgProps(size)} className={className} {...rest}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
