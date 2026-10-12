# CodeMind AI — Design System & Visual Guidelines

This document establishes the official visual language, design tokens, component architecture, and interaction states for CodeMind AI. All future phases (Phases 2 through 5) must adhere to these standards to maintain aesthetic consistency, accessibility, and a premium SaaS product feel.

---

## 1. Visual Philosophy & Core Principles

CodeMind AI is designed as a **cinematic, clean, and elegant developer intelligence platform**. Rather than resembling a generic dark-mode admin template or loud neo-brutalist tool, it embodies the restraint, polish, and clarity of modern tier-1 SaaS engineering tools (e.g., Linear, Vercel, Supabase, Raycast).

- **Light-First Identity:** Warm ivory backdrop (`#FAFAF7`) paired with crisp white surfaces (`#FFFFFF`) for maximum readability, focus, and reduced visual fatigue.
- **Atmospheric Depth:** Subtle radial gradients and soft multi-stop glows (`#EAE5FF` lavender, `#E3EEFF` pale blue) create ambient depth without heavy borders or excessive glassmorphism.
- **Generous Whitespace:** Spaced for comprehension. Content is grouped logically with breathable margins (`p-6` to `p-10`) and structured cards.
- **Sophisticated Typography:** Crisp geometric sans (`Plus Jakarta Sans`) with high-contrast slate scales and monospaced accents (`JetBrains Mono`) for technical precision.

---

## 2. Color Palette & Design Tokens

### Core Neutral Scale

| Token            | Hex Value | Semantic Role                                           |
| :--------------- | :-------- | :------------------------------------------------------ |
| `background`     | `#FAFAF7` | Warm Ivory base canvas for all views                    |
| `surface`        | `#FFFFFF` | Pure white container cards, sidebars, headers           |
| `surface-subtle` | `#F6F6F2` | Inset areas, metric pill backgrounds, hover rows        |
| `slate-850`      | `#263044` | Primary headings, prominent body text, active state     |
| `slate-600`      | `#64748B` | Secondary captions, supporting descriptions, timestamps |
| `slate-400`      | `#94A3B8` | Subtle metadata, placeholder text, inactive icons       |
| `slate-200`      | `#E2E8F0` | Hairline borders (`border-slate-200/80`), dividers      |

### Accents & Gradients

| Token               | Hex Value | Semantic Role                                                        |
| :------------------ | :-------- | :------------------------------------------------------------------- |
| `accent`            | `#7667C8` | Muted violet brand primary (buttons, active indicators, focus rings) |
| `accent-hover`      | `#6756B8` | Darkened violet for button hover states                              |
| `gradient-lavender` | `#EAE5FF` | Atmospheric radial glow backdrop, active nav background              |
| `gradient-blue`     | `#E3EEFF` | Secondary atmospheric radial glow stop                               |

### Feedback & Status Tokens

| State                  | Background | Border    | Text      | Purpose                                           |
| :--------------------- | :--------- | :-------- | :-------- | :------------------------------------------------ |
| **Success / Healthy**  | `#DDF4E7`  | `#BFE7D0` | `#1E6B43` | Operational service, healthy API, passing tests   |
| **Warning / Upcoming** | `#FEF3C7`  | `#FDE68A` | `#92400E` | Coming Soon milestones, degraded components       |
| **Error / Offline**    | `#FEE2E2`  | `#FECACA` | `#991B1B` | Offline services, network errors, critical alerts |
| **Neutral**            | `#F1F5F9`  | `#E2E8F0` | `#475569` | Unconfigured/pending Docker containers            |

---

## 3. Typography Hierarchy

- **Font Family (Sans):** `'Plus Jakarta Sans', Inter, system-ui, sans-serif`
- **Font Family (Mono):** `'JetBrains Mono', monospace`
- **Letter Spacing:** `-0.011em` across body copy for tight, cohesive typesetting.

### Heading Scales

- **Page Titles:** `text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight`
- **Section Headings:** `text-base sm:text-lg font-bold text-slate-850 tracking-tight`
- **Metric Numbers:** `text-xl font-bold tracking-tight font-mono`
- **Body Text:** `text-sm sm:text-base text-slate-600 leading-relaxed`
- **Microcopy / Badges:** `text-xs font-semibold uppercase tracking-wider`

---

## 4. Components & Elevation

### 1. Card System

- Standard surface:
  ```html
  <div class="card">...</div>
  ```
  Class definition: `bg-white border border-slate-200/70 rounded-2xl p-6 shadow-subtle hover:shadow-card transition-all duration-200`
- Interactive variant: Adds subtle hover translateY (`-translate-y-0.5`) and expanded elevation.

### 2. Buttons

- **Primary:** `bg-[#7667C8] hover:bg-[#6756B8] text-white text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm`
- **Secondary:** `bg-white hover:bg-slate-50 text-slate-850 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 shadow-subtle`

### 3. Badges & Status Indicators

- Round pill styling with hairline colored border: `px-2.5 py-1 rounded-full text-xs font-medium tracking-tight`
- Classes: `.badge-status-healthy`, `.badge-status-error`, `.badge-coming-soon`, `.badge-status-neutral`.

---

## 5. Layout & Responsive Principles

- **Desktop (>= 1024px):** Fixed left navigation rail (`w-64` / `256px`), top header bar (`h-18`) with glass blur (`bg-white/80 backdrop-blur-md`), and main scrollable content area.
- **Mobile (< 1024px):** Off-canvas slide-out navigation drawer with dark backdrop blur. TopBar displays a hamburger menu icon to toggle drawer navigation.
- **Max Content Width:** Centered containers using `max-w-6xl mx-auto` with fluid responsive padding (`p-4 sm:p-6 lg:p-10`).

---

## 6. Future Expansion Rules (Phases 2–5)

When adding features in subsequent phases:

1. **Never resort to dark-mode defaults:** Keep the light ivory background (`#FAFAF7`) and white card surfaces.
2. **No arbitrary hex values:** Consume Tailwind tokens (`bg-background`, `text-slate-850`, `bg-accent`, `bg-surface-subtle`) or predefined CSS variables.
3. **No fake analysis or mock graphs:** Real data must reflect real API endpoints; planned features must use `ComingSoon` and `badge-coming-soon`.
4. **Accessible contrast:** All text on surfaces must exceed WCAG AA 4.5:1 contrast ratios.
