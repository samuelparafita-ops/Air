# CRT Dot-Matrix Background Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, highly responsive CRT-style dot-matrix background animation with concentric ripple waves and scroll parallax to the Air homepage.

**Architecture:** We will create a fixed full-screen canvas background positioned under the main content. A vanilla JS particle engine will simulate a grid of dot coordinates attracted via springs to their moving grid targets. Mouse/touch movements trigger expanding ripple wave objects that offset the spring targets, causing dots to sway in concentric ripples.

**Tech Stack:** HTML5 Canvas, Vanilla Javascript, CSS Custom Properties

---

### Task 1: DOM Elements and CSS Configuration in index.html

**Files:**
- Modify: `c:\Users\agrille\Documents\Air\index.html`

- [ ] **Step 1: Define CSS Custom Properties inside the `:root` block**

In `index.html`, locate the `:root` styling block (around lines 16-30) and add the animation control variables.

```css
    :root {
      /* Existing tokens... */
      --bg: #000000;
      --surface: #0A0A0A;
      --surface-2: #1A1A1A;
      --text: #FFFFFF;
      --body: #E2E2E2;
      --muted: #8E9192;
      --accent: #FFFFFF;
      --accent-strong: #E2E2E2;
      --border: #222222;
      --max-width: 1200px;
      --radius: 0;
      --radius-control: 0.25rem;

      /* CRT Animation Tokens */
      --grid-opacity: 0.095;
      --scanline-opacity: 0.07;
    }
```

- [ ] **Step 2: Add CSS rules for canvas, scanlines, and flicker**

Locate the styling block near the `.film-grain` styling (around lines 51-58) and add the following rules (with `will-change` compositor hints and prefers-reduced-motion triggers).

```css
    .film-grain {
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    #crt-canvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      opacity: var(--grid-opacity);
      transition: opacity 0.2s ease;
    }

    .crt-scanlines {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 97; /* Just below film grain, above content & canvas */
      opacity: var(--scanline-opacity);
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
                  linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
      background-size: 100% 4px, 3px 100%;
    }

    .crt-flicker {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 96;
      background: rgba(255, 255, 255, 0.005);
      animation: crtFlicker 0.15s infinite;
      will-change: opacity;
    }

    @keyframes crtFlicker {
      0% { opacity: 0.97; }
      50% { opacity: 1; }
      100% { opacity: 0.98; }
    }

    @media (prefers-reduced-motion: reduce) {
      .crt-flicker {
        animation: none;
        opacity: 0.005;
      }
    }
```

- [ ] **Step 3: Insert the HTML elements**

Locate the opening `<body>` tag and the `.film-grain` div (around lines 955-956). Insert the canvas, scanlines, and flicker elements.

```html
<body>
  <div class="film-grain" aria-hidden="true"></div>
  <canvas id="crt-canvas"></canvas>
  <div class="crt-scanlines" aria-hidden="true"></div>
  <div class="crt-flicker" aria-hidden="true"></div>
```

- [ ] **Step 4: Commit UI markup changes**

```bash
git add index.html
git commit -m "style: add crt background elements and css properties to index.html"
```

---

### Task 2: Implement the Concentric Ripple Particle Engine in index.html

**Files:**
- Modify: `c:\Users\agrille\Documents\Air\index.html`

- [ ] **Step 1: Write Javascript block at the bottom of the body**

In `index.html`, locate the closing `</body>` tag (around line 1409). Just before it, insert the script block containing the physics configuration, ripple event listeners, `Particle` class, and animation loop.

```html
  <script>
  (function () {
    const canvas = document.getElementById('crt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Accessibility check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Physics & Rendering Constants
    const gridSpacing = 20;
    const dotRadius = 1.8;
    const springConstant = 0.08;
    const friction = 0.80;
    const autoDriftSpeed = prefersReducedMotion ? 0 : 0.1;
    const parallaxSpeed = prefersReducedMotion ? 0 : 0.2;

    // Ripple wave properties
    const maxRipples = 5;
    const maxWaveRadius = 180;
    const waveSpeed = 4;
    const waveWidth = 30;
    const waveAmplitude = 8;
    let ripples = [];

    // Movement offsets
    let currentYOffset = -window.scrollY * parallaxSpeed;
    let lastScrollY = window.scrollY;

    // Last registered ripple coordinates
    let lastRippleMouse = { x: -1000, y: -1000 };

    function triggerRipple(x, y) {
      if (prefersReducedMotion) return;
      
      // Calculate distance to last ripple to prevent over-triggering
      const dx = x - lastRippleMouse.x;
      const dy = y - lastRippleMouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 40 || lastRippleMouse.x < 0) {
        lastRippleMouse.x = x;
        lastRippleMouse.y = y;
        
        ripples.push({
          x: x,
          y: y,
          radius: 0
        });

        // Enforce maximum concurrent ripples
        if (ripples.length > maxRipples) {
          ripples.shift();
        }
      }
    }

    // Input interaction listeners
    window.addEventListener('mousemove', (e) => {
      triggerRipple(e.clientX, e.clientY);
    });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        triggerRipple(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        triggerRipple(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Logical dimensions for scale tracking
    let logicalWidth = window.innerWidth;
    let logicalHeight = window.innerHeight;
    let cols = Math.ceil(logicalWidth / gridSpacing) + 2;
    let rows = Math.ceil(logicalHeight / gridSpacing) + 2;

    class Particle {
      constructor(gx, gy) {
        this.gx = gx; // Grid column index
        this.gy = gy; // Grid row index
        this.x = gx * gridSpacing;
        this.y = gy * gridSpacing;
        this.vx = 0;
        this.vy = 0;
        this.baseX = this.x;
        this.baseY = this.y;
      }

      update(xOffset, yOffset, dt, activeRipples) {
        const wrapW = cols * gridSpacing;
        const wrapH = rows * gridSpacing;

        let targetX = ((this.gx * gridSpacing + xOffset) % wrapW + wrapW) % wrapW - gridSpacing;
        let targetY = ((this.gy * gridSpacing + yOffset) % wrapH + wrapH) % wrapH - gridSpacing;

        // Snap coordinates if wrapped around screen boundary to prevent massive spring tension pull
        if (Math.abs(targetX - this.x) > logicalWidth / 2) {
          this.x = targetX;
          this.vx = 0;
        }
        if (Math.abs(targetY - this.y) > logicalHeight / 2) {
          this.y = targetY;
          this.vy = 0;
        }

        // Calculate Concentric Ripple shifts
        let shiftX = 0;
        let shiftY = 0;

        if (!prefersReducedMotion) {
          activeRipples.forEach(r => {
            let dx = targetX - r.x;
            let dy = targetY - r.y;
            let distSq = dx * dx + dy * dy;
            
            if (distSq > 0) {
              let dist = Math.sqrt(distSq);
              let diff = Math.abs(dist - r.radius);
              
              if (diff < waveWidth) {
                let strength = (waveWidth - diff) / waveWidth;
                let angle = Math.atan2(dy, dx);
                let wavePush = Math.sin((r.radius - dist) * 0.15) * waveAmplitude * strength;
                
                shiftX += Math.cos(angle) * wavePush;
                shiftY += Math.sin(angle) * wavePush;
              }
            }
          });
        }

        this.baseX = targetX + shiftX;
        this.baseY = targetY + shiftY;

        // 1. Spring force pull to grid target (scaled by dt)
        let ax = (this.baseX - this.x) * springConstant * dt;
        let ay = (this.baseY - this.y) * springConstant * dt;

        // 2. Euler integration with continuous friction damping
        this.vx = (this.vx + ax) * Math.pow(friction, dt);
        this.vy = (this.vy + ay) * Math.pow(friction, dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }

      draw(time) {
        // Brightness wave computed dynamically from coordinates + time
        const pulse = Math.sin((this.x * 0.005) + (this.y * 0.005) + time) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;

        // Render square dot which is extremely fast and pixel-like
        ctx.fillRect(this.x - dotRadius, this.y - dotRadius, dotRadius * 2, dotRadius * 2);
      }
    }

    let particles = [];

    function initParticles() {
      particles = [];
      cols = Math.ceil(logicalWidth / gridSpacing) + 2;
      rows = Math.ceil(logicalHeight / gridSpacing) + 2;
      
      for (let c = -1; c < cols - 1; c++) {
        for (let r = -1; r < rows - 1; r++) {
          particles.push(new Particle(c, r));
        }
      }
    }

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      logicalWidth = window.innerWidth;
      logicalHeight = window.innerHeight;
      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    }

    window.addEventListener('resize', resizeCanvas);

    let lastTime = performance.now();

    function tick() {
      const now = performance.now();
      // Cap dt to prevent particle flinging when backgrounded
      const dt = Math.min((now - lastTime) / 16.666, 4.0);
      lastTime = now;

      // 1. Step active ripples
      if (!prefersReducedMotion) {
        ripples.forEach(r => {
          r.radius += waveSpeed * dt;
        });
        
        // Remove ripples that finished propagation
        ripples = ripples.filter(r => r.radius <= maxWaveRadius);
      }

      // 2. Accumulate auto-drift multiplied by dt
      currentYOffset += autoDriftSpeed * 0.1 * dt;
      
      // 3. Add scroll parallax delta (subtracting scrollDiff to match content scroll direction)
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      currentYOffset -= scrollDiff * parallaxSpeed;
      lastScrollY = currentScrollY;

      // 4. Clear and render scene
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = '#ffffff';
      
      const time = now * 0.001;

      particles.forEach(p => {
        p.update(0, currentYOffset, dt, ripples);
        p.draw(time);
      });

      ctx.globalAlpha = 1.0;
      requestAnimationFrame(tick);
    }

    // Startup
    resizeCanvas();
    tick();
  })();
  </script>
```

- [ ] **Step 2: Commit particle engine implementation**
```bash
git add index.html
git commit -m "feat: implement interactive dot-matrix background with concentric ripples"
```

---

### Task 3: Verification and Manual Testing

- [ ] **Step 1: Start local test server and check browser rendering**

Start local HTTP server:
`python -m http.server 8000`

Expected behavior in browser:
1. Open `http://localhost:8000`.
2. Confirm the background dot-matrix is visible.
3. Confirm that moving the mouse cursor triggers beautiful ripples expanding outwards, making the dots wave.
4. Verify scroll down moves dots upwards slower than content (scroll parallax).
5. Verify no console errors.

- [ ] **Step 2: Stop local server**
Terminate the local server process.
