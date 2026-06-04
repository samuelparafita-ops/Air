# Air — Sober General-Tech Redesign (Cathode Noir)

- **Date:** 2026-06-04
- **Status:** Approved (design), pending implementation plan
- **Repo:** `Air` (static site, nginx via Docker), branch `develop`

## 1. Context

`Air` is a single-page Spanish marketing site for a company currently positioned as
an **AI consultancy** ("Consultoría en IA"), based in A Coruña. The codebase is plain
static HTML with inline `<style>` and `<script>` per page:

- `index.html` — hero, 4 AI-focused service cards, 5-step process, contact form, footer,
  plus a floating AI chat widget and a decorative green "network canvas" animation.
- `aviso-legal.html`, `privacidad.html`, `cookies.html`, `terminos.html` — legal pages
  that each carry their **own copy** of the same `:root` token block and styling.
- `vision.html` + `assets/cv/` (YOLOv8) + `assets/js/cv-detector.js` — a Computer Vision
  live demo.

Current visual identity: dark `#0A0A0A` base, a bright green accent token, animated
particle network, ambient green glow, legacy sans + legacy display fonts.

The owner provided a design system, **"Cathode Noir"** (`DESIGN.md`): a high-end,
monochrome, editorial-minimalist look — pure black, white/grey only, JetBrains Mono
micro-labels, sharp-cornered cards, subtle film grain, no shadows, no color accent.

## 2. Goals

1. **Reposition** Air from "AI consultancy" to a **general technology firm** where AI is
   one capability among several (the strongest track record, but not the headline).
2. **Re-skin** the homepage and the 4 legal pages to the Cathode Noir system, followed
   faithfully (monochrome, film grain, mono labels, sharp cards, no green).
3. **De-emphasize AI** in messaging and **detach the CV demo** without deleting it.

## 3. Non-Goals (out of scope)

- `vision.html` internals, `cv-detector.js`, and the YOLO model assets — left untouched
  on disk; only links *to* the demo are removed.
- The n8n backends (contact webhook, chat webhook) — unchanged endpoints and behavior.
- No new demo/tool page is created. (A planning/Gantt demo is planned by the owner but
  is not part of this work; no card button or link is added for it.)
- Language stays Spanish throughout.

## 4. Decisions (from brainstorming)

| Decision | Outcome |
|---|---|
| Positioning | General tech; AI is one of three service tracks |
| Service cards | 3 cards (down from 4), **no demo/CTA buttons on cards** |
| CV demo (`vision.html`) | Detached — remove nav + card links, leave file on disk |
| Chat widget | Kept, restyled monochrome, reworded away from "IA" |
| Design fidelity | Follow Cathode Noir exactly |
| Legal pages | Included in the re-skin (token + font swap) |

## 5. Design

### 5.1 Positioning & copy (Spanish)

- **`<title>` / meta:** `Air | Consultoría en IA` → `Air | Soluciones tecnológicas`.
  Rewrite `meta[name=description]` and OG title/description toward general tech
  ("software, integraciones e inteligencia artificial").
- **Hero:** eyebrow `SOLUCIONES TECNOLÓGICAS`; H1 *"Tecnología a medida para tu negocio"*;
  hero copy frames AI as one capability alongside software and automation. CTAs unchanged
  (*Hablemos* / *Ver servicios*).
- **Process section:** remove AI-specific wording — e.g. step 1
  "dónde la IA puede generar mayor impacto" → "dónde la tecnología puede generar mayor
  impacto". Steps otherwise unchanged.
- **Footer tagline:** "Soluciones de Inteligencia Artificial aplicadas a negocio." →
  "Soluciones tecnológicas aplicadas a negocio."

### 5.2 Services — 3 uniform cards (was 4)

1. **Software y Desarrollo Web** — software a medida, aplicaciones web, herramientas
   internas, integraciones. (Monochrome line icon: code/window or Gantt-bars glyph.)
2. **Inteligencia Artificial y Datos** — LLMs, visión por computador, modelos
   predictivos, data science. Merges the old *LLMs*, *Computer Vision*, and
   *Modelos a medida / Data Science* cards. AI present, not dominant.
3. **Automatización e Integraciones** — automatización de procesos, CRM/ERP/email,
   agentes de flujo.

All three cards share identical structure (icon, title, `✓` feature list) and **no
buttons**. The old per-card "LIVE DEMO" button and the `model-flow` mini-diagram on the
CV card are removed. The nav "LIVE DEMO" link and mobile-menu "LIVE DEMO" link are
removed.

### 5.3 Visual system (Cathode Noir, faithful)

**Color tokens** (replace the green palette in every page's `:root`):

- `--bg: #000000` (Level 0 base)
- `--surface: #0A0A0A`, `--surface-2: #1A1A1A` (Level 1 containers)
- `--border: #222222` (1px low-contrast outlines)
- `--text: #FFFFFF` (headings/primary), `--body: #E2E2E2` (paragraph text),
  `--muted: #8E9192` (mono micro-labels, meta, inactive)
- **Remove** `--accent`, `--accent-strong`, and all `--shadow` drop shadows.
- Sweep all hardcoded greens (legacy accent hex values and green RGB tints) to
  monochrome equivalents.

**Typography:**

- Replace the Google Fonts import (legacy sans + legacy display) with **Hanken Grotesk**
  (weights 300/400/500) + **JetBrains Mono** (500).
- Headings use Hanken Grotesk light (300) with tight tracking (≈ -0.02em to -0.04em),
  per `display-xl` / `headline-lg`. Hero H1 large and light.
- **JetBrains Mono**, uppercase, +letter-spacing for all micro-labels: eyebrows, step
  badges, footer column headers, form field labels, chat header status/title.

**Shape:**

- Buttons & inputs: `0.25rem` rounding (soft).
- Cards & layout containers: **sharp, 0px**.

**Depth (no shadows):**

- Remove every `box-shadow` drop shadow and every hover `transform: translateY(...)`
  lift. Hover states **brighten** (border `#222`→lighter, bg lifts toward `#1A1A1A`)
  instead of lifting.
- Primary button: solid white bg, black text; hover adds faint glow
  `0 0 15px rgba(255,255,255,0.1)`.
- Secondary button: transparent with 1px white border.

**Texture:**

- **Remove** the green network-canvas animation (the `<canvas>` element, the
  `ambient-glow` div, and all related JS: `randomVelocity`, `resizeNetworkCanvas`,
  `createNetworkNodes`, `drawNetwork`, `networkNodes`, and their listeners).
- **Remove** the hero grid (`.hero::after` grid lines).
- **Add** a single persistent **SVG film-grain overlay**: a fixed, full-viewport `<div>`
  using an inline SVG `feTurbulence` noise as background, ~4% opacity, `pointer-events:
  none`, top-most z-index. Static (non-animated) to stay sober and cheap.

**Details:**

- Green list-check `✓` → monochrome `✓` in `--body` color.
- Eyebrow's green leading dot → removed.
- Logo dot (`.logo-dot`) → white, glow removed.
- Inputs → 1px `#222` outline (soft `0.25rem`); labels above in JetBrains Mono 11px.
- Chips / step badges → rectangular sharp, `#1A1A1A` bg, uppercase mono, grey/white text.
- **Favicon** (data-URI in all 5 pages): green circle → white dot; keep black square +
  white "Air".

### 5.4 Chat widget

Kept and fully functional (same `n8n` chat webhook, same session logic). Restyled
monochrome: white send button with black icon, grey "En línea" status (no green dot
glow), JetBrains Mono header label, `#0A0A0A`/`#1A1A1A` surfaces with `#222` borders.
The intro message "servicios de IA" → "servicios de tecnología".

### 5.5 Legal pages (4)

Each of `aviso-legal.html`, `privacidad.html`, `cookies.html`, `terminos.html` gets the
**same** `:root` token swap + font `@import` swap + green→monochrome sweep + favicon
update. Legal **content is untouched**; only presentation tokens change. Shared header/
footer markup in these pages is restyled consistently with the homepage.

## 6. Files changed

| File | Change |
|---|---|
| `index.html` | Tokens, fonts, copy reposition, 4→3 cards, remove demo links + network canvas + glow + grid, add film grain, restyle chat widget, favicon |
| `aviso-legal.html` | Token + font swap, green sweep, favicon |
| `privacidad.html` | Token + font swap, green sweep, favicon |
| `cookies.html` | Token + font swap, green sweep, favicon |
| `terminos.html` | Token + font swap, green sweep, favicon |
| `vision.html`, `assets/**` | **Unchanged** (detached, not deleted) |
| `DockerFile`, `.gitignore` | Unchanged |

## 7. Verification

- Open each page locally (e.g. `python -m http.server` or the nginx Docker image) and
  visually confirm: no green anywhere, film grain visible but subtle, fonts loaded,
  sharp cards / soft buttons, hovers brighten (no lift), 3 service cards, no demo links.
- Confirm no console errors after removing the canvas JS (no dangling references).
- Confirm contact form and chat widget still POST to their webhooks (network tab).
- Grep the repo for residual legacy color/font markers, `network-canvas`,
  `ambient-glow`, `LIVE DEMO` to ensure a clean sweep.

## 8. Open questions

None — all brainstorming decisions resolved.
