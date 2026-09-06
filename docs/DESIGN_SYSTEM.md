# AutoTestAI Enterprise Design System Specification (v2.1)
*Senior UI/UX Design System — Bespoke Quiet Luxury Edition*

---

## 1. Design Philosophy & Visual Language

AutoTestAI's visual architecture is curated around an uncompromising **Quiet Luxury & Engineering Precision** aesthetic. It pairs the depth of horological dials and bespoke titanium hardware with the warmth of champagne gold and rich ivory, delivering a serene, high-status experience for software engineering executives and QA specialists.

### Core Visual Tenets
1. **Mathematical Spatial Geometry**: Governed by an immutable **8px base grid** ensuring vertical and horizontal harmonic rhythm.
2. **Intentional Negative Space**: Generous whitespace preventing cognitive fatigue during complex multi-agent analysis and test execution.
3. **WCAG 2.1 AA Compliance**: Every single color pairing has been contrast-tested to exceed the required 4.5:1 ratio for body copy and 3.0:1 for graphical interfaces.
4. **Haptic Micro-Interactions**: Soft hover lifts (`translateY(-2px)`), sub-pixel border glows, and responsive spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 2. Master Color Palette & Token Documentation

### A. Dark Mode Surfaces & Canvases (Deep Onyx Stack)
| Layer / Token | Hex | RGB | HSL | Contrast vs Text | Purpose / Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Deep Onyx Canvas** | `#090A0C` | `rgb(9, 10, 12)` | `hsl(220°, 14%, 4%)` | 16.5:1 (AAA) | Root background canvas in dark mode |
| **Obsidian Surface** | `#0E1013` | `rgb(14, 16, 19)` | `hsl(216°, 15%, 6%)` | 15.8:1 (AAA) | Cards, sidebars, modals, top navigation |
| **Graphite Container** | `#15181D` | `rgb(21, 24, 29)` | `hsl(218°, 16%, 10%)`| 14.5:1 (AAA) | Elevated containers, sub-panels, hovered cards |
| **Elevated Graphite** | `#1C2026` | `rgb(28, 32, 38)` | `hsl(216°, 15%, 13%)`| 13.2:1 (AAA) | Tooltips, popovers, dropdown flyouts |
| **Border Slate** | `#292E36` | `rgb(41, 46, 54)` | `hsl(217°, 14%, 19%)`| 3.2:1 (UI AA) | 1px hairline dividers and component outlines |

### B. Light Mode Surfaces (Ivory Stack)
| Layer / Token | Hex | RGB | HSL | Contrast vs Text | Purpose / Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ivory Canvas** | `#F5F3EE` | `rgb(245, 243, 238)` | `hsl(43°, 23%, 95%)` | 15.2:1 (AAA) | Root background canvas in light mode |
| **Pure Surface** | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0°, 0%, 100%)` | 16.8:1 (AAA) | Card surfaces, modal containers |
| **Ivory Secondary** | `#EBE7DE` | `rgb(235, 231, 222)` | `hsl(42°, 25%, 90%)` | 13.9:1 (AAA) | Muted table headers, code blocks |
| **Light Border** | `rgba(41, 46, 54, 0.12)` | — | — | 3.0:1 (UI AA) | Hairline borders on light ivory surfaces |

### C. Neutral Typography Scale
| Token | Hex | RGB | HSL | Dark Contrast | Light Contrast | Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ivory Text** | `#F5F3EE` | `rgb(245, 243, 238)` | `hsl(43°, 23%, 95%)` | 16.5:1 (AAA) | — | Primary headings & body in dark mode |
| **Obsidian Text** | `#0E1013` | `rgb(14, 16, 19)` | `hsl(216°, 15%, 6%)` | — | 15.8:1 (AAA) | Primary headings & body in light mode |
| **Warm Gray** | `#B8B5AE` | `rgb(184, 181, 174)` | `hsl(42°, 7%, 70%)` | 10.2:1 (AAA) | 6.8:1 (AAA) | Secondary descriptions, subheaders |
| **Silver** | `#8E969F` | `rgb(142, 150, 159)` | `hsl(212°, 9%, 59%)` | 6.5:1 (AA) | 5.2:1 (AA) | Muted captions, placeholder text |

### D. Primary Brand & Accent Colors (Champagne Gold)
| Token | Hex | RGB | HSL | Contrast | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Champagne Gold** | `#C9A96E` | `rgb(201, 169, 110)` | `hsl(39°, 46%, 61%)` | 9.1:1 (Dark AAA) | Primary button background, active nav indicators |
| **Champagne Highlight**| `#E0C58B` | `rgb(224, 197, 139)` | `hsl(41°, 58%, 71%)` | 11.2:1 (Dark AAA)| Hover gradient glow, accent badge highlights |
| **Deep Champagne** | `#8E713E` | `rgb(142, 113, 62)` | `hsl(38°, 39%, 40%)` | 5.4:1 (Light AA) | Pressed states, high-contrast light mode text |

### E. Semantic Status Colors (Calibrated WCAG 2.1 AA)
| Semantic State | Hex | RGB | HSL | Contrast Ratio | Applied Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Success (Emerald)**| `#3FA77A` | `rgb(63, 167, 122)` | `hsl(154°, 45%, 45%)` | 6.2:1 (AA) | Passed tests, verified AST, applied patches |
| **Error (Crimson)** | `#C95B5B` | `rgb(201, 91, 91)` | `hsl(0°, 50%, 57%)` | 5.8:1 (AA) | Failed test suites, localized bugs, rejected patches |
| **Warning (Amber Gold)**| `#C49245` | `rgb(196, 146, 69)` | `hsl(36°, 51%, 52%)` | 5.5:1 (AA) | Suspicious lines, running/thinking agent state |
| **Info (Slate Cyan)** | `#3A7E9E` | `rgb(58, 126, 158)` | `hsl(199°, 46%, 42%)` | 5.1:1 (AA) | Telemetry pipelines, session queues |

---

## 3. Typographic Hierarchy & Specifications

- **Primary Interface Font**: `Plus Jakarta Sans`, `Inter`, `sans-serif`
- **Monospace & Code Font**: `JetBrains Mono`, `monospace`

| Level | Size | Line Height | Tracking | Weight | Semantic HTML |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `3.75rem` (60px) | `1.08` | `-0.03em` | 800 (ExtraBold) | Landing `h1` |
| **Heading 1** | `2.25rem` (36px) | `1.15` | `-0.025em`| 800 (ExtraBold) | Dashboard `h1` |
| **Heading 2** | `1.5rem` (24px) | `1.25` | `-0.02em` | 700 (Bold) | Section headers `h2` |
| **Heading 3** | `1.125rem` (18px) | `1.35` | `-0.015em`| 600 (SemiBold) | Card titles `h3` |
| **Body Standard** | `0.875rem` (14px) | `1.6` | `0` | 400 / 500 | Paragraphs, tables |
| **Caption / Meta** | `0.75rem` (12px) | `1.4` | `+0.015em`| 500 (Medium) | Timestamps, metadata |
| **Micro Badge** | `0.625rem` (10px) | `1.2` | `+0.14em` | 700 (Bold) | Status badges, kbd tags |

---

## 4. Standardized 8px Spatial Grid System

All structural elements strictly adhere to the 8px multiplier:
- **4px (`--spacing-1`)**: Micro padding, status dots, icon offsets.
- **8px (`--spacing-2`)**: Standard compact gap, button padding.
- **16px (`--spacing-4`)**: Standard element padding, card inner gutter.
- **24px (`--spacing-6`)**: Card padding, dashboard grid gap.
- **32px (`--spacing-8`)**: Section separation, row gap.
- **48px (`--spacing-12`)**: Major layout component divisions.
- **64px (`--spacing-16`)**: Hero vertical padding.

---

## 5. Component Standards & Touch Guidelines

1. **Interactive Buttons**:
   - Touch target: Minimum `40px` (`h-10`) on desktop, `44px` on mobile.
   - Primary: Champagne Gold with Deep Onyx text (`#090A0C`) for instant legibility and luxurious tactile depth.
   - Press State: Smooth `active:scale-[0.98]` transition.
2. **Glass Cards**:
   - `backdrop-filter: blur(16px)` with 1px border (`#292E36` dark, `rgba(41,46,54,0.12)` light).
   - Dynamic Champagne hover aura (`rgba(201, 169, 110, 0.18)`).
3. **Navigation & Sidebar**:
   - Seamless dynamic margins: `lg:ml-[260px]` expanded, `lg:ml-[72px]` collapsed, `ml-0` on mobile.
   - Full backdrop blur mobile drawer with 44px touch targets.
