# Air — Cathode Noir General-Tech Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Air site from "AI consultancy" to a general technology firm and re-skin the homepage + 4 legal pages to the monochrome "Cathode Noir" design system.

**Architecture:** Plain static HTML, one `<style>` and `<script>` block per page (no build step, no framework, no test runner). Changes are surgical edits to existing inline CSS/markup/JS. The CV demo (`vision.html`) is detached by removing links to it, not deleted.

**Tech Stack:** HTML5, vanilla CSS, vanilla JS. Google Fonts (Hanken Grotesk + JetBrains Mono). Served by nginx (`DockerFile`).

**Verification model:** No test framework exists. Each task verifies via `git grep` (expecting specific presence/absence of tokens) and a visual check, then commits. Run grep commands from the repo root.

**Reference spec:** `docs/superpowers/specs/2026-06-04-air-cathode-noir-redesign-design.md`

**Canonical monochrome mapping** (used throughout — green → monochrome):

| Old (green) | New (monochrome) | Meaning |
|---|---|---|
| `#4ADE80` | `#FFFFFF` | accent → white |
| `#6EE7A1` | `#FFFFFF` | accent hover → white |
| `#22C55E` | `#E2E2E2` | accent-strong → body grey |
| `#052E16`, `#062E16` | `#000000` | dark-green text on accent → black |
| `rgba(74, 222, 128, X)` | `rgba(255, 255, 255, X)` | green tints → white tints |
| green `box-shadow` glows | removed (`none`) | no drop shadows |

---

## Task 1: Fonts, tokens, base styles & film grain (index.html)

**Files:**
- Modify: `index.html` (font `@import`, `:root`, `body`, add `.film-grain`)

- [ ] **Step 1: Swap the Google Fonts import**

In `index.html`, replace the `@import` line (currently line ~14):

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
```

with:

```css
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500&family=JetBrains+Mono:wght@500&display=swap');
```

- [ ] **Step 2: Replace the `:root` token block**

Replace the entire `:root { … }` block with:

```css
:root {
  --bg: #000000;
  --surface: #0A0A0A;
  --surface-2: #1A1A1A;
  --text: #FFFFFF;
  --body: #E2E2E2;
  --muted: #8E9192;
  /* accent kept as white so cascading var(--accent) usages render monochrome */
  --accent: #FFFFFF;
  --accent-strong: #E2E2E2;
  --border: #222222;
  --max-width: 1200px;
  --radius: 0;            /* cards & layout containers: sharp */
  --radius-control: 0.25rem; /* buttons & inputs: soft */
}
```

- [ ] **Step 3: Update base `body` typography**

In the `body { … }` rule, change the `font-family` and `background`:

```css
body {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: "Hanken Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
  text-rendering: optimizeLegibility;
}
```

- [ ] **Step 4: Add the film-grain overlay CSS**

Add this rule immediately after the `body { … }` rule:

```css
.film-grain {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

- [ ] **Step 5: Verify**

Run: `git grep -n "Hanken Grotesk" index.html`
Expected: matches in the `@import` and `body` rules.
Run: `git grep -n "Inter:wght\|Space+Grotesk" index.html`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "style: swap to Hanken Grotesk + JetBrains Mono, Cathode Noir tokens, film grain"
```

---

## Task 2: Remove network canvas, ambient glow, hero grid (index.html)

**Files:**
- Modify: `index.html` (markup, CSS, JS)

- [ ] **Step 1: Add the film-grain element, remove canvas + glow markup**

Replace these two lines near the top of `<body>` (currently ~1064–1065):

```html
  <div class="ambient-glow" aria-hidden="true"></div>
  <canvas class="network-canvas" id="network-canvas" aria-hidden="true"></canvas>
```

with:

```html
  <div class="film-grain" aria-hidden="true"></div>
```

- [ ] **Step 2: Remove the `.network-canvas` and `.ambient-glow` CSS rules**

Delete both rules in full:

```css
.network-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  opacity: 0.12;
  pointer-events: none;
}

.ambient-glow {
  position: fixed;
  width: min(48vw, 640px);
  aspect-ratio: 1;
  top: 14%;
  right: 2%;
  z-index: 0;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2), rgba(74, 222, 128, 0.07) 42%, transparent 72%);
  filter: blur(2px);
  pointer-events: none;
}
```

- [ ] **Step 3: Remove the hero grid overlay**

Delete the entire `.hero::after { … }` rule (the grid lines block, currently ~231–242).

- [ ] **Step 4: Remove the network-canvas JavaScript**

In the first `<script>` block, delete:
- the two lines `const networkCanvas = document.getElementById('network-canvas');` and `const networkContext = networkCanvas.getContext('2d');`
- the block of variables `const networkNodes = []; const maxDistance = 150; let canvasWidth = 0; let canvasHeight = 0; let pixelRatio = 1;`
- the functions `randomVelocity()`, `resizeNetworkCanvas()`, `createNetworkNodes()`, `drawNetwork()` in full
- the three call lines `resizeNetworkCanvas(); createNetworkNodes(); requestAnimationFrame(drawNetwork);`
- the `window.addEventListener('resize', () => { resizeNetworkCanvas(); createNetworkNodes(); });` block

Keep `const header = …`, `menuToggle`, `mobileMenu`, `cookieBanner`, `acceptCookies`, `updateHeader()`, the scroll/menu/cookie listeners, the contact-form IIFE, and the chat IIFE.

- [ ] **Step 5: Verify no dangling references**

Run: `git grep -n "network\|ambient-glow\|drawNetwork\|networkNodes\|canvasWidth\|resizeNetworkCanvas\|createNetworkNodes\|randomVelocity\|hero::after" index.html`
Expected: no output.
Open `index.html` in a browser; confirm DevTools console shows **no errors** and the page renders with grain but no moving particles/glow/grid.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "refactor: remove green network canvas, ambient glow, hero grid"
```

---

## Task 3: Reposition copy — general tech (index.html)

**Files:**
- Modify: `index.html` (`<head>` meta, hero, process step 1, footer tagline)

- [ ] **Step 1: Update title + meta + OG**

Replace the relevant `<head>` tags:

```html
<title>Air | Soluciones tecnológicas</title>
<meta name="description" content="Air diseña, desarrolla e implementa soluciones tecnológicas a medida para empresas: software, integraciones e inteligencia artificial con resultados medibles.">
<meta property="og:title" content="Air | Soluciones tecnológicas">
<meta property="og:description" content="Soluciones tecnológicas a medida: software, automatización e inteligencia artificial para empresas.">
```

- [ ] **Step 2: Rewrite the hero**

Replace the hero `.hero-inner` content:

```html
<div class="hero-inner">
  <p class="eyebrow">Soluciones tecnológicas</p>
  <h1>Tecnología a medida para tu negocio</h1>
  <p class="hero-copy">Diseñamos, desarrollamos e implementamos soluciones tecnológicas para empresas: desde software e integraciones hasta inteligencia artificial. Tecnología práctica, con resultados reales.</p>
  <div class="actions" aria-label="Acciones principales">
    <a class="btn btn-primary" href="#contacto">Hablemos</a>
    <a class="btn btn-secondary" href="#servicios">Ver servicios</a>
  </div>
</div>
```

- [ ] **Step 3: Update the services intro description**

Replace the services `.section-description` text:

```html
<p class="section-description">Ayudamos a empresas a aprovechar la tecnología de forma práctica y rentable. Nos encargamos de todo el proceso: desde la idea inicial hasta el despliegue, integración con tus sistemas actuales y mantenimiento continuo.</p>
```

And replace the `impact-badge` text:

```html
<div class="impact-badge"><span aria-hidden="true">●</span> Tecnología que trabaja por ti</div>
```

- [ ] **Step 4: De-AI the process step 1**

Replace the step-1 paragraph:

```html
<p>Analizamos tu negocio, procesos y objetivos para identificar dónde la tecnología puede generar mayor impacto.</p>
```

- [ ] **Step 5: Update footer tagline**

Replace the footer brand paragraph:

```html
<p>Soluciones tecnológicas aplicadas a negocio.</p>
```

- [ ] **Step 6: Verify**

Run: `git grep -n "Consultoría en IA\|Inteligencia Artificial aplicada\|soluciones de IA" index.html`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "content: reposition Air from AI consultancy to general tech"
```

---

## Task 4: Services 4→3 cards, remove demo links (index.html)

**Files:**
- Modify: `index.html` (nav, mobile menu, services grid)

- [ ] **Step 1: Remove the nav "LIVE DEMO" link**

Delete this line in the desktop nav (~1079):

```html
<a class="btn btn-primary nav-demo" href="vision.html">LIVE DEMO</a>
```

- [ ] **Step 2: Remove the mobile-menu "LIVE DEMO" link**

Delete this line in `.mobile-menu` (~1089):

```html
<a href="vision.html">LIVE DEMO</a>
```

- [ ] **Step 3: Replace the four service cards with three**

Replace the entire `<div class="services-grid"> … </div>` block with:

```html
<div class="services-grid">
  <article class="service-card">
    <div class="service-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 7l-2 10" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </div>
    <h3>Software y Desarrollo Web</h3>
    <ul class="feature-list">
      <li><span class="check" aria-hidden="true">✓</span><span>Software a medida y aplicaciones web</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Herramientas internas y paneles de gestión</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Integraciones con tus sistemas actuales</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Planificación, calendarios y flujos de trabajo</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Mantenimiento y evolución continua</span></li>
    </ul>
  </article>

  <article class="service-card">
    <div class="service-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-1 7.9A3.5 3.5 0 0 0 10 21a3 3 0 0 0 2-1 3 3 0 0 0 2 1 3.5 3.5 0 0 0 3-6.1A4 4 0 0 0 16 7a4 4 0 0 0-4-4Z" stroke-linejoin="round"></path>
        <path d="M12 7v14" stroke-linecap="round"></path>
      </svg>
    </div>
    <h3>Inteligencia Artificial y Datos</h3>
    <ul class="feature-list">
      <li><span class="check" aria-hidden="true">✓</span><span>Soluciones con LLMs y asistentes a medida</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Visión por computador y análisis de imagen</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Modelos predictivos, scoring y recomendación</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Análisis avanzado de datos y forecasting</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Sistemas RAG sobre tus propios datos</span></li>
    </ul>
  </article>

  <article class="service-card">
    <div class="service-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 3v5M18 16v5M6 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"></path>
        <path d="M9 11h3a3 3 0 0 0 3-3V5M15 13h-3a3 3 0 0 0-3 3v3" stroke-linecap="round"></path>
      </svg>
    </div>
    <h3>Automatización e Integraciones</h3>
    <ul class="feature-list">
      <li><span class="check" aria-hidden="true">✓</span><span>Automatización de procesos internos</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Integración con CRM, ERP, email y herramientas actuales</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Agentes y flujos automáticos basados en decisiones</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Despliegue en la nube o on-premise</span></li>
      <li><span class="check" aria-hidden="true">✓</span><span>Monitorización y mejora continua</span></li>
    </ul>
  </article>
</div>
```

This removes the `model-flow` mini-diagram and both `service-demo` "LIVE DEMO" buttons.

- [ ] **Step 4: Verify**

Run: `git grep -n "LIVE DEMO\|vision.html\|model-flow\|service-demo\|flow-node\|flow-dot" index.html`
Expected: no output (CSS for `.model-flow`/`.flow-*`/`.service-demo`/`.nav-demo` may remain but is now unused; it is removed in Task 5 Step 5).
Run: `git grep -c "service-card" index.html`
Expected: 3 article matches (count includes the CSS selector, so confirm exactly 3 `<article class="service-card">` by eye).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "content: collapse services to 3 cards, remove CV demo links"
```

---

## Task 5: Monochrome component restyle (index.html)

**Files:**
- Modify: `index.html` (component CSS, favicon, contact-form JS status colors)

- [ ] **Step 1: Cards & containers — sharp corners, no shadow, brighten-on-hover**

Replace these rules:

`.service-card`:
```css
.service-card {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 26px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.3s ease, background 0.3s ease;
}

.service-card:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: var(--surface-2);
}
```

`.process-card`:
```css
.process-card {
  position: relative;
  display: grid;
  gap: 16px;
  padding: 26px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.3s ease, background 0.3s ease;
}

.process-card:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: var(--surface-2);
}
```

`.contact-form`: change `border-radius: var(--radius);` (already var) and **remove** the `box-shadow: var(--shadow);` line.
`.cookie-banner`: **remove** the `box-shadow: var(--shadow);` line (keep `border-radius: var(--radius);`).

- [ ] **Step 2: Buttons — white primary, soft corners, glow-on-hover only**

Replace `.btn`, `.btn:hover`, `.btn-primary`, `.btn-primary:hover`, `.btn-secondary`, `.btn-secondary:hover`:

```css
.btn {
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 13px 22px;
  border-radius: var(--radius-control);
  font-weight: 500;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

.btn:focus-visible { outline: none; }

.btn-primary {
  background: var(--text);
  color: #000000;
  border: 1px solid var(--text);
}

.btn-primary:hover,
.btn-primary:focus-visible {
  background: var(--text);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
}

.btn-secondary {
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: transparent;
}

.btn-secondary:hover,
.btn-secondary:focus-visible {
  border-color: var(--text);
  background: rgba(255, 255, 255, 0.06);
}
```

(Removes the `transform: translateY(-2px)` lift.)

- [ ] **Step 3: Headings & labels — Hanken Grotesk + mono micro-labels**

Replace the `h1, h2, h3` family rule:
```css
h1, h2, h3 {
  font-family: "Hanken Grotesk", sans-serif;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
```

Replace `h1`:
```css
h1 {
  max-width: 100%;
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 300;
  letter-spacing: -0.03em;
  margin-bottom: 22px;
}
```

Replace `.eyebrow` (drop the leading green dot, set mono):
```css
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
```

Delete the `.eyebrow::before { … }` rule entirely (the green dot).

Replace `.step-badge`:
```css
.step-badge {
  width: fit-content;
  display: inline-flex;
  padding: 7px 11px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

Replace the `.footer-column h2` family + the `.field label, .privacy-check label` rule to mono:
```css
.footer-column h2 {
  margin-bottom: 14px;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
```
```css
.field label,
.privacy-check label {
  color: var(--text);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Inputs, icons, badges, checks, logo dot**

`.field input` — replace radius and focus:
```css
.field input {
  width: 100%;
  min-height: 50px;
  padding: 13px 14px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  outline: none;
  transition: border-color 0.3s ease;
}

.field input:focus {
  border-color: rgba(255, 255, 255, 0.55);
}
```

`.service-icon`:
```css
.service-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
}
```

`.impact-badge`:
```css
.impact-badge {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 15px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}
.impact-badge span { color: var(--muted); }
```

`.feature-list .check`:
```css
.feature-list .check {
  color: var(--body);
  font-weight: 500;
  line-height: 1.3;
}
```

`.corner-check`:
```css
.corner-check {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}
```

`.logo-dot`:
```css
.logo-dot {
  width: 0.34em;
  height: 0.34em;
  margin-left: 0.08em;
  margin-top: 0.48em;
  border-radius: 999px;
  background: var(--text);
  flex: 0 0 auto;
}
```

`.menu-toggle:hover`:
```css
.menu-toggle:hover {
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.06);
}
```

- [ ] **Step 5: Delete now-unused CSS rules**

Delete these rules entirely (their markup was removed in Task 4): `.nav-demo`, `.service-demo`, `.model-flow`, `.model-flow::before`, `.flow-node`, `.flow-dot`, `.flow-dot svg`.

- [ ] **Step 6: Sweep remaining green literals**

Apply these global replacements across `index.html` (these catch any stragglers in `process`, `submit-status`, `privacy-check a`, `social-link:hover`, `footer-column a:hover`, etc.):

| Find (all occurrences) | Replace with |
|---|---|
| `rgba(74, 222, 128,` | `rgba(255, 255, 255,` |
| `#4ADE80` | `#FFFFFF` |
| `#6EE7A1` | `#FFFFFF` |
| `#22C55E` | `#E2E2E2` |
| `#052E16` | `#000000` |
| `#062E16` | `#000000` |

Then in the contact-form IIFE, update the status color and `box-shadow var(--shadow)` survivors:
- `status.style.color = ok ? '#4ADE80' : '#F87171';` → `status.style.color = ok ? '#FFFFFF' : '#FFB4AB';`

- [ ] **Step 7: Monochrome favicon**

Replace the favicon `<link rel="icon" …>` href so the green circle becomes white:

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23000000'/%3E%3Ctext x='12' y='42' font-family='Arial' font-size='25' font-weight='700' fill='white'%3EAir%3C/text%3E%3Ccircle cx='52' cy='43' r='5' fill='%23FFFFFF'/%3E%3C/svg%3E">
```

- [ ] **Step 8: Verify the sweep**

Run: `git grep -ni "4ADE80\|6EE7A1\|22C55E\|052E16\|062E16\|74, 222, 128\|nav-demo\|service-demo\|model-flow\|flow-dot\|flow-node" index.html`
Expected: no output.
Open `index.html`: confirm primary buttons are white with black text, hover adds a faint white glow (no lift), cards are sharp with no shadow, labels render in monospace, nothing green remains.

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "style: monochrome Cathode Noir components, sharp cards, mono labels"
```

---

## Task 6: Chat widget restyle (index.html)

**Files:**
- Modify: `index.html` (chat widget CSS, intro message)

> Note: after Task 5's global sweep, the chat widget's `#4ADE80`/`#6EE7A1`/`#052E16` and `rgba(74,222,128,…)` literals are already converted to white/black/white-tints. This task fixes the cases where white is wrong and updates copy.

- [ ] **Step 1: Status dot → grey, no glow**

Replace `#air-chat-header-status::before`:
```css
#air-chat-header-status::before {
  content: "";
  width: 7px; height: 7px;
  border-radius: 999px;
  background: var(--muted);
}
```

- [ ] **Step 2: User message bubble → white on black text, keep readable**

Confirm `.air-msg-user` reads (after the sweep) `background: #FFFFFF; color: #000000;`. If not, set it explicitly:
```css
.air-msg-user {
  align-self: flex-end;
  background: #FFFFFF;
  color: #000000;
  font-weight: 500;
  border-bottom-right-radius: 4px;
}
```

- [ ] **Step 3: Avatar → mono**

Replace `#air-chat-avatar`:
```css
#air-chat-avatar {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font-family: "JetBrains Mono", monospace;
  font-weight: 500;
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Header title/status → mono label feel**

Replace `#air-chat-header-status`:
```css
#air-chat-header-status {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--muted);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
}
```

- [ ] **Step 5: Toggle button glow → none/white**

In `#air-chat-toggle`, ensure `background: #FFFFFF; color: #000000;` (post-sweep) and replace its `box-shadow` with a subtle neutral one:
```css
box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
```
And `#air-chat-toggle:hover { transform: translateY(-3px); background: #FFFFFF; }` → remove the color change, keep or drop the lift (drop for consistency):
```css
#air-chat-toggle:hover { box-shadow: 0 0 15px rgba(255, 255, 255, 0.12); }
```

- [ ] **Step 6: Reword the intro message away from "IA"**

In the chat IIFE `openPanel()`, replace the intro `addMessage(...)` text:
```js
addMessage('Hola 👋 Soy el asistente de Air. ¿En qué puedo ayudarte? Puedo contarte sobre nuestros servicios de tecnología, nuestro proceso de trabajo o cómo contactar con el equipo.', 'bot');
```

- [ ] **Step 7: Verify**

Run: `git grep -ni "4ADE80\|6EE7A1\|052E16\|74, 222, 128\|servicios de IA" index.html`
Expected: no output.
Open the chat widget: confirm white send button/black icon, grey uppercase "EN LÍNEA" status with no green glow, white user bubbles with black text, readable. Send a test message; confirm the network request still POSTs to the chat webhook.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "style: monochrome chat widget, reword intro to general tech"
```

---

## Task 7: Re-skin the 4 legal pages

**Files:**
- Modify: `aviso-legal.html`, `privacidad.html`, `cookies.html`, `terminos.html`

> Each legal page carries its own copy of the same `@import`, `:root`, and shared header/footer styling and the green accent. Run the **same set of replacements on each of the four files**. Legal text content is not touched.

For **each** of the four files, apply these edits:

- [ ] **Step 1 (per file): Swap font import**

Replace:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
```
with:
```css
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500&family=JetBrains+Mono:wght@500&display=swap');
```

- [ ] **Step 2 (per file): Replace the `:root` block**

Replace the legal page `:root { … }` block with:
```css
:root {
  --bg: #000000;
  --surface: #0A0A0A;
  --surface-2: #1A1A1A;
  --text: #FFFFFF;
  --body: #E2E2E2;
  --muted: #8E9192;
  --accent: #FFFFFF;
  --border: #222222;
  --max-width: 1200px;
  --radius: 0;
  --radius-control: 0.25rem;
}
```

- [ ] **Step 3 (per file): Update `body` font-family**

Set the `body` rule's font stack to:
```css
font-family: "Hanken Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```
And confirm `background: var(--bg);` (now `#000000`).

- [ ] **Step 4 (per file): Heading font swap**

In any `h1, h2, h3` (or equivalent) rule using `"Space Grotesk"`, change the family to `"Hanken Grotesk"`.

- [ ] **Step 5 (per file): Green literal sweep**

Apply the same global replacements as Task 5 Step 6:

| Find | Replace |
|---|---|
| `rgba(74, 222, 128,` | `rgba(255, 255, 255,` |
| `#4ADE80` | `#FFFFFF` |
| `#6EE7A1` | `#FFFFFF` |
| `#22C55E` | `#E2E2E2` |
| `#052E16` | `#000000` |
| `#062E16` | `#000000` |

- [ ] **Step 6 (per file): Remove drop shadows**

Replace any `box-shadow: var(--shadow);` lines with nothing (delete the line). If a `--shadow` token is defined in `:root` of the file and now unused, it was already removed in Step 2.

- [ ] **Step 7 (per file): Monochrome favicon**

Replace the favicon `<link rel="icon" …>` href with:
```html
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23000000'/%3E%3Ctext x='12' y='42' font-family='Arial' font-size='25' font-weight='700' fill='white'%3EAir%3C/text%3E%3Ccircle cx='52' cy='43' r='5' fill='%23FFFFFF'/%3E%3C/svg%3E">
```

- [ ] **Step 8: Verify all four**

Run: `git grep -nil "4ADE80\|6EE7A1\|22C55E\|052E16\|062E16\|74, 222, 128\|Space+Grotesk\|Inter:wght" aviso-legal.html privacidad.html cookies.html terminos.html`
Expected: no output.
Open each legal page in a browser: monochrome, Hanken Grotesk body, no green links, sharp containers, no shadows, readable. Confirm header logo + footer links match the homepage.

- [ ] **Step 9: Commit**

```bash
git add aviso-legal.html privacidad.html cookies.html terminos.html
git commit -m "style: re-skin legal pages to Cathode Noir monochrome"
```

---

## Task 8: Repo-wide final verification

**Files:** none (verification + optional cleanup commit)

- [ ] **Step 1: Confirm no green anywhere in the active site**

Run: `git grep -nil "4ADE80\|6EE7A1\|22C55E\|052E16\|062E16\|74, 222, 128" -- ':!vision.html' ':!assets/**'`
Expected: no output. (`vision.html` and `assets/` are intentionally excluded — the CV demo is detached, not restyled.)

- [ ] **Step 2: Confirm old fonts gone from active pages**

Run: `git grep -nil "Inter:wght\|Space+Grotesk" -- ':!vision.html'`
Expected: no output.

- [ ] **Step 3: Confirm no dead CV-demo links remain**

Run: `git grep -nil "vision.html" -- ':!docs/**'`
Expected: no output (no page links to the detached demo).

- [ ] **Step 4: Functional smoke test**

Serve the site and click through:
```bash
python -m http.server 8080
```
Visit `http://localhost:8080/index.html`:
- No console errors.
- Film grain visible, subtle; no moving particles, glow, or grid.
- 3 service cards, no demo buttons, no nav "LIVE DEMO".
- Hover a card → it brightens, does not lift.
- Submit the contact form (or watch the Network tab) → POST fires to the contact webhook.
- Open chat, send a message → POST fires to the chat webhook; bubbles are monochrome.
- Footer legal links open the restyled monochrome legal pages.

- [ ] **Step 5: Final commit (if any verification fixes were made)**

```bash
git add -A
git commit -m "chore: final Cathode Noir redesign verification fixes"
```

---

## Self-Review Notes (author)

- **Spec coverage:** positioning/copy → Task 3; 3 cards + demo detach → Task 4; color/type/shape/depth/texture/details → Tasks 1, 2, 5; chat widget → Task 6; legal pages → Task 7; verification → Task 8. All spec sections mapped.
- **Token names consistent:** `--bg`, `--surface`, `--surface-2`, `--text`, `--body`, `--muted`, `--accent` (white), `--border`, `--radius` (0), `--radius-control` (0.25rem) used identically across index and legal tasks.
- **No placeholders:** every CSS/HTML/JS step shows the literal code; verification steps show exact commands and expected output.
