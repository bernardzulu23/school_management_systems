# ZSMS (EduZambia) — Color Scheme Reference

This document lists every color used in the school management system, where it is defined, how it is applied, and how the system fits together. The palette matches the brutalist reference: cream paper, black ink, orange accent.

---

## How colors work in this project

The app uses a **brutalist, high-contrast** palette: warm off-white surfaces, near-black ink, and a single loud accent (orange-red). Colors arrive through four mechanisms:

| Mechanism                          | Location                                          | Role                                                                                |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Hard-coded hex in Tailwind**     | `className="bg-paper"`, `text-ink`, `text-accent` | Primary UI (dashboard, admin, auth)                                                 |
| **CSS variables (`:root`)**        | `app/globals.css`                                 | Single source: `--color-paper`, `--color-ink`, `--color-accent`, `--text-secondary` |
| **`lib/theme/brutalistColors.js`** | JS constants                                      | Shared hex for inline styles                                                        |
| **`lib/design-tokens.ts`**         | TypeScript tokens                                 | Charts, legacy components                                                           |
| **Tailwind palette remap**         | `tailwind.config.js`                              | `slate`, `gray`, `violet`, `purple`, `indigo` → brutalist (all routes)              |

Legacy `slate-*`, `violet-*`, and `purple-*` class names still work but resolve to **paper / ink / accent / muted** via Tailwind config — no route should show the old purple dashboard theme.

---

## Core palette (brand / structural)

These four colors drive almost the entire student and admin experience.

| Swatch     | Hex                 | Names              | Typical role                                                       |
| ---------- | ------------------- | ------------------ | ------------------------------------------------------------------ |
| Off-white  | `#EFECE5`           | Paper, cream       | Page background, light panels, inverted text on dark blocks        |
| Ink        | `#111111`           | Black, charcoal    | Body text, borders (2px), dark headers, active nav, shadows        |
| Accent     | `#FF3B00`           | Orange-red, signal | CTAs, errors, highlights, selection, progress bars, hover emphasis |
| Pure white | `#FFFFFF` / `white` | —                  | Cards, inputs, table cells, icon tiles                             |

**Shorthand in code:** `#111` appears in dot-grid backgrounds (`radial-gradient(#111 1px, …)`). Scrollbar CSS uses `#111` and `#EFECE5` (same as above).

### Opacity modifiers (same hues)

Used everywhere for subtle UI without new hex values:

| Pattern     | Example                                      | Effect                                |
| ----------- | -------------------------------------------- | ------------------------------------- |
| `/10`       | `bg-[#111111]/10`, `bg-[#FF3B00]/10`         | Tinted fills (errors, progress track) |
| `/20`       | `divide-[#111111]/10`, `border-[#EFECE5]/20` | Dividers, dashed placeholders         |
| `/30`       | `placeholder:text-[#111111]/30`              | Input placeholders                    |
| `/40`–`/60` | `opacity-40`, `text-[#EFECE5]/60`            | Muted labels, secondary copy          |
| `black/5`   | `hover:bg-black/5`                           | Light hover on cream (≈5% black)      |
| `white/10`  | `bg-white/10`                                | Skill tags on dark profile block      |

### Semantic usage of core colors

| Role                     | Colors                                                | Where                                                                        |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Surface (light)**      | `#EFECE5`                                             | `App.tsx` shell, home, discovery tiles, payment layout, admin page bg        |
| **Surface (dark)**       | `#111111` + `#EFECE5` text                            | Auth left panel, verify screens, splash loader, discovery header, onboarding |
| **Borders**              | `#111111` 2px                                         | All brutalist boxes, nav, forms, tables                                      |
| **Primary CTA**          | `#FF3B00` bg + `#111111` text                         | Submit, pay, onboarding continue                                             |
| **CTA hover (inverted)** | `#111111` bg + `#EFECE5` text                         | Buttons, sidebar items, job rows                                             |
| **Focus**                | `focus:border-[#FF3B00]`                              | Inputs across auth, admin editors, profile                                   |
| **Alerts / errors**      | `#FF3B00` border + `bg-[#FF3B00]/10` + `#FF3B00` text | Auth errors, payment errors, CMS warnings                                    |
| **Text selection**       | `selection:bg-[#FF3B00] selection:text-white`         | `App.tsx` root                                                               |
| **Draft preview banner** | `#FF3B00` bar, `#111111` text                         | `DraftPreviewBanner` in `App.tsx`                                            |

---

## Global CSS (`apps/web/src/index.css`)

### `@theme` — RIASEC & cluster tokens

Registered for Tailwind v4 as `--color-*` (usable as `bg-riasec-r`, `text-riasec-i`, etc., if referenced):

| Token                    | Hex       | Holland type / cluster alias |
| ------------------------ | --------- | ---------------------------- |
| `--color-riasec-r`       | `#C2653C` | Realistic                    |
| `--color-riasec-i`       | `#1A6B6A` | Investigative                |
| `--color-riasec-a`       | `#8B3A8B` | Artistic                     |
| `--color-riasec-s`       | `#3A8B8B` | Social                       |
| `--color-riasec-e`       | `#C99A2E` | Enterprising                 |
| `--color-riasec-c`       | `#5A6B7E` | Conventional                 |
| `--color-cluster-eng`    | `#C2653C` | Engineering cluster accent   |
| `--color-cluster-land`   | `#1A6B6A` | Land / resources             |
| `--color-cluster-policy` | `#8B3A8B` | Policy / governance          |
| `--color-cluster-biz`    | `#C99A2E` | Business / finance           |

**Wiring:** `src/data/riasec-types.json` sets `"color": "var(--color-riasec-r)"` (etc.). `RiasecCard.tsx` applies `type.color` to SVG hexagon fills, strokes, and score bars when a type is matched/revealed; unmatched segments use `#111111`.

### Utility classes

| Class                   | Colors                     | Purpose                                 |
| ----------------------- | -------------------------- | --------------------------------------- |
| `.brutal-shadow`        | Shadow `#111111` 4×4px     | Card depth                              |
| `.brutal-shadow-hover`  | Shadow `#111111` 6×6px     | Hover lift                              |
| `.brutal-shadow-active` | Shadow cleared             | Pressed state                           |
| `.noise-bg`             | SVG noise, `opacity: 0.04` | Full-screen texture overlay (`App.tsx`) |
| `.cms-html a`           | `#ff3b00`                  | Links in published HTML (`HtmlContent`) |
| Scrollbar track         | `#EFECE5`, border `#111`   | WebKit scrollbar                        |
| Scrollbar thumb         | `#111`, hover `#FF3B00`    | WebKit scrollbar                        |

### Fonts (not colors, but paired with palette)

- **JetBrains Mono** — default `--font-sans` / `font-tech`
- **Instrument Serif** — `font-editorial` headlines
- **Montserrat** — `font-statement` display type

---

## Content-driven colors (CMS / JSON)

### Interest clusters — `accentColor`

File: `apps/web/src/data/interest-clusters.json`

| Cluster ID                         | Hex       | Used in                                                |
| ---------------------------------- | --------- | ------------------------------------------------------ |
| `eng_arts`                         | `#FF3B00` | Left stripe + icon color in `InterestClusterTiles.tsx` |
| `land_resources`                   | `#00A884` | Same                                                   |
| `policy_governance_social_justice` | `#E17B24` | Same                                                   |
| `business_finance_data`            | `#111111` | Same                                                   |

Admin: `InterestClustersEditor.tsx` — color picker + hex field per tile.

### Career clusters — `colour_hex`

File: `apps/web/src/data/career-clusters.json` (examples)

| Cluster                      | Hex       | Used in                                                                            |
| ---------------------------- | --------- | ---------------------------------------------------------------------------------- |
| Mission & Voluntary Services | `#00A884` | Top bar, icon, borders in `PathwayDetail.tsx`; hover wash in `DiscoverySearch.tsx` |
| (second cluster in file)     | `#E17B24` | Same                                                                               |

Applied via inline `style={{ backgroundColor: cluster.colour_hex }}` / `color: cluster.colour_hex`. Default in admin new cluster: `#111111`. DB default: `#000000` (`server.ts` schema).

### RIASEC types

File: `src/data/riasec-types.json` → CSS variables above → `RiasecCard.tsx`.

---

## Career step type colors (`PathwayDetail.tsx` only)

Tailwind **default** colors (not in `@theme`):

| `step_type`  | Background / text classes  | Header row               |
| ------------ | -------------------------- | ------------------------ |
| `education`  | `blue-600` (+ `/10` tints) | `bg-blue-600` white text |
| `internship` | `green-600`                | `bg-green-600`           |
| `first_job`  | `amber-600`                | `bg-amber-600`           |
| `mid_level`  | `purple-600`               | `bg-purple-600`          |
| `senior`     | `red-600`                  | `bg-red-600`             |
| default      | `#111111` tints            | `bg-[#111111]`           |

Salary column in step tables: `text-[#FF3B00]` for column 5 values.

---

## Payment provider assets

Placeholder brand tiles in `apps/web/src/assets/payments/` (not the app chrome):

| File         | Background | Text   |
| ------------ | ---------- | ------ |
| `mtn.svg`    | `#FFCC00`  | `#111` |
| `airtel.svg` | `#E40000`  | `#fff` |
| `zamtel.svg` | `#00A651`  | `#fff` |

Shown in `PaymentCheckout.tsx` provider grid only.

---

## Component / screen map

### Shell & navigation — `App.tsx`

| Element                 | Colors                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Root layout             | `bg-[#EFECE5]`, `text-[#111111]`, dot grid `#111` at 10% opacity                              |
| Desktop sidebar         | Cream bg; header `bg-[#111111] text-[#EFECE5]`; active item inverted; hover `#FF3B00` + white |
| Mobile bottom nav       | Cream; active `bg-[#111111] text-[#EFECE5]`                                                   |
| Splash loader           | Dark bg; progress fill `#FF3B00`                                                              |
| Auth screen             | Split: dark left / cream right; tabs invert when active                                       |
| Home, jobs, profile     | Cream + black section headers; job hover invert; stats accent `#FF3B00`                       |
| Pathway carousel blocks | Hover `bg-[#FF3B00] text-[#EFECE5]`                                                           |

### Feature components

| File                       | Color notes                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `DiscoverySearch.tsx`      | Dark sticky header; cards use `cluster.colour_hex` on hover overlay |
| `InterestClusterTiles.tsx` | `accentColor` stripe + icons; grid gap shows `#111111`              |
| `PathwayDetail.tsx`        | Cluster `colour_hex` + step-type rainbow + core brutalist palette   |
| `RiasecCard.tsx`           | CSS var types + `#111111` / `#FF3B00` chrome                        |
| `PaymentCheckout.tsx`      | Same as auth/payment flow; selected provider `border-[#FF3B00]`     |
| `OnboardingModal.tsx`      | Full-screen `#111111`; steps `#FF3B00` / cream; CTA orange          |
| `AdminDashboard.tsx`       | Cream/dark/white admin shell; active nav `#FF3B00` or `#111111`     |
| `AdminStudentsPanel.tsx`   | Payment badges: completed = dark; pending = orange tint             |
| All `admin/*Editor.tsx`    | Shared input focus `#FF3B00`, borders `#111111`, cream headers      |

### Legacy / alternate UI (semantic tokens **undefined** in `index.css`)

| File            | Classes used                                                                           | Status                                                                             |
| --------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Navbar.tsx`    | `bg-primary`, `text-text-secondary`, `bg-bg-light`, `border-bg-medium`, `bg-secondary` | Likely **not** part of brutalist theme; may be unused or broken in main `App` flow |
| `JobBoard.tsx`  | Same + `shadow-primary/10`                                                             | Standalone soft UI pattern                                                         |
| `AuthModal.tsx` | `bg-primary`, rounded-xl, `border-bg-medium`                                           | Modal variant; not the main full-page auth in `App.tsx`                            |

If you unify the design system, either map these to the four core hex values in `@theme` or remove unused components.

---

## Admin & status semantics

| State                        | Colors                           | File                           |
| ---------------------------- | -------------------------------- | ------------------------------ |
| Unpublished draft hint       | `text-[#FF3B00]`                 | `AdminDashboard.tsx`           |
| Error / validation blocks    | Orange border + 10% orange fill  | Admin editors, `App.tsx` forms |
| Payment completed            | `bg-[#111111] text-[#EFECE5]`    | `AdminStudentsPanel.tsx`       |
| Payment pending / processing | `bg-[#FF3B00]/20 text-[#FF3B00]` | Same                           |
| Publish CTA                  | `bg-[#FF3B00]` → hover dark      | `AdminDashboard.tsx`           |

---

## Database & defaults

| Field                        | Default   | Notes                        |
| ---------------------------- | --------- | ---------------------------- |
| `career_clusters.colour_hex` | `#000000` | Overridden by CMS content    |
| New cluster in admin         | `#111111` | `CareerClustersEditor.tsx`   |
| New interest tile in admin   | `#111111` | `InterestClustersEditor.tsx` |

---

## Quick reference — all unique hex values

| Hex                             | Role                             |
| ------------------------------- | -------------------------------- |
| `#EFECE5`                       | Primary light surface            |
| `#111111` / `#111`              | Ink, borders, dark surfaces      |
| `#FF3B00` / `#ff3b00`           | Accent, links, CTAs, alerts      |
| `#FFFFFF`                       | Cards, inputs                    |
| `#00A884`                       | Land cluster / interest accent   |
| `#E17B24`                       | Policy cluster / interest accent |
| `#C2653C`                       | RIASEC R, cluster eng            |
| `#1A6B6A`                       | RIASEC I, cluster land           |
| `#8B3A8B`                       | RIASEC A, cluster policy         |
| `#3A8B8B`                       | RIASEC S                         |
| `#C99A2E`                       | RIASEC E, cluster biz            |
| `#5A6B7E`                       | RIASEC C                         |
| `#000000`                       | DB default cluster color         |
| `#FFCC00`, `#E40000`, `#00A651` | Payment SVG placeholders only    |

Tailwind step colors: `blue-600`, `green-600`, `amber-600`, `purple-600`, `red-600` (PathwayDetail only).

---

## Design intent (how it should feel)

1. **Read like print:** cream paper, black rules, monospace labels.
2. **One scream color:** `#FF3B00` for action and urgency, not decoration.
3. **Data carries color:** clusters and RIASEC types get distinct hues from JSON/CSS vars.
4. **Motion via inversion:** hover often swaps light/dark or cream/orange rather than new colors.
5. **Consistency gap:** admin + student flows use the brutalist hex set; `Navbar` / `JobBoard` / `AuthModal` use a different token naming scheme that is not wired in `index.css`.

For changes, prefer adding tokens to `@theme` in `index.css` and replacing `bg-[#…]` duplicates rather than introducing a fifth accent color.
