# MyCareerWeb - Color reference

Quick guide to backgrounds, text, cards, and accents. Copy hex values into your design system or CSS.

---

## 1. Quick lookup

| Name   | Hex       | Use                                   |
| ------ | --------- | ------------------------------------- |
| Paper  | `#EFECE5` | Main background, light sections       |
| Ink    | `#111111` | Text, borders, dark bars, shadows     |
| Accent | `#FF3B00` | Buttons, selection, highlights, focus |
| White  | `#FFFFFF` | Cards, inputs, tiles                  |

---

## 2. Brutalist shell (main app)

**Backgrounds**

- Page: `#EFECE5`
- Dark panels: `#111111`
- Cards: `#FFFFFF`

**Text**

- On paper: `#111111`
- On dark: `#EFECE5`
- Muted: ink with opacity (example: `text-[#111111]/70`)

**Borders**

- Default: `2px solid #111111`
- Soft dividers: `#111111` at 10% opacity

**Accent**

- Actions: `#FF3B00`
- Selection: bg `#FF3B00`, text white
- Soft alert: `#FF3B00` at ~10% opacity on cream

**States**

- Hover wash: `black` at 5% (`hover:bg-black/5`)
- Pathway row hover: bg `#FF3B00`, text `#EFECE5`

**Decor**

- Dot grid: `#111`, ~10% opacity
- Noise: ~4% (see `index.css`)

---

## 3. RIASEC (CSS variables in `index.css`)

| Code | Variable           | Hex       |
| ---- | ------------------ | --------- |
| R    | `--color-riasec-r` | `#C2653C` |
| I    | `--color-riasec-i` | `#1A6B6A` |
| A    | `--color-riasec-a` | `#8B3A8B` |
| S    | `--color-riasec-s` | `#3A8B8B` |
| E    | `--color-riasec-e` | `#C99A2E` |
| C    | `--color-riasec-c` | `#5A6B7E` |

**Cluster aliases**

| Variable                 | Hex       |
| ------------------------ | --------- |
| `--color-cluster-eng`    | `#C2653C` |
| `--color-cluster-land`   | `#1A6B6A` |
| `--color-cluster-policy` | `#8B3A8B` |
| `--color-cluster-biz`    | `#C99A2E` |

Pathway detail also uses `colour_hex` from data per cluster.

---

## 4. Interest tiles (JSON)

File: `apps/web/src/data/interest-clusters.json`

| Tile                                  | Hex       |
| ------------------------------------- | --------- |
| Engineering, Arts and Creativity      | `#FF3B00` |
| Land, Resources and Infrastructure    | `#00A884` |
| Policy, Governance and Social Justice | `#E17B24` |
| Business, Finance and Data            | `#111111` |

---

## 5. Pathway steps (`PathwayDetail.tsx`)

| Step type  | Tailwind   |
| ---------- | ---------- |
| education  | blue-600   |
| internship | green-600  |
| first_job  | amber-600  |
| mid_level  | purple-600 |
| senior     | red-600    |
| default    | `#111111`  |

Table / tips highlights: `#FF3B00`.

---

## 6. Shadows and scrollbar

- Shadow: `4px 4px 0 0 #111111`
- Hover shadow: `6px 6px 0 0 #111111`
- Scrollbar: track `#EFECE5`, thumb `#111111`, hover `#FF3B00`

---

## 7. Job Board / Auth / Navbar

Suggested mapping for `primary`, `text-text-primary`, etc.:

| Token     | Hex                    |
| --------- | ---------------------- |
| primary   | `#FF3B00`              |
| secondary | `#00A884` or `#1A6B6A` |
| text      | `#111111`              |
| muted     | `#4A4A4A`              |
| soft bg   | `#EFECE5`              |
| border    | `#E0DDD6`              |

Primary button: filled accent, **white** text.

---

## 8. CSS starter

```css
:root {
  --color-paper: #efece5;
  --color-ink: #111111;
  --color-accent: #ff3b00;
  --color-white: #ffffff;
}
```

---

## 9. Fonts

- Instrument Serif (editorial)
- JetBrains Mono (`font-tech`)
- Montserrat (`font-statement`)

See `apps/web/src/index.css`.
