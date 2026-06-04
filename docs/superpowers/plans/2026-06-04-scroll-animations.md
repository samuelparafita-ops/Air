# CRT Dot-Matrix Background Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, highly responsive CRT-style dot-matrix background animation with spring-mass physics cursor repulsion and scroll parallax to the Air homepage.

**Architecture:** We will create a fixed full-screen canvas background positioned under the main content. A vanilla JS particle engine will simulate a grid of dot coordinates attracted via springs to their moving grid targets, which drift continuously and shift with scroll offsets. Nearby mouse movements will apply quadratic repulsion forces to dots, creating a smooth organic repulsion and elastic bounce-back.

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

Locate the styling block near the `.film-grain` styling (around lines 51-58) and add the following rules.

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
    }

    @keyframes crtFlicker {
      0% { opacity: 0.97; }
      50% { opacity: 1; }
      100% { opacity: 0.98; }
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

### Task 2: Implement the Particle Physics Engine in index.html

**Files:**
- Modify: `c:\Users\agrille\Documents\Air\index.html`

- [ ] **Step 1: Write Javascript block at the bottom of the body**

Locate the closing `</body>` tag (around line 1409). Just before it, insert the script block containing the physics configuration, `Particle` class, listeners, and animation loop.

```html
  <script>
  (function () {
    const canvas = document.getElementById('crt-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Physics & Rendering Constants
    const gridSpacing = 20;
    const dotRadius = 1.8;
    const repulsionRadius = 150;
    const repulsionForce = 25;
    const springConstant = 0.08;
    const friction = 0.80;
    const autoDriftSpeed = 0.1;
    const parallaxSpeed = 0.2;

    // Movement offsets
    let currentYOffset = 0;
    let lastScrollY = window.scrollY;

    // Mouse coordinates (start off screen)
    let mouse = { x: -1000, y: -1000 };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

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

      update(xOffset, yOffset) {
        const wrapW = canvas.width + gridSpacing * 2;
        const wrapH = canvas.height + gridSpacing * 2;

        let targetX = ((this.gx * gridSpacing + xOffset) % wrapW + wrapW) % wrapW - gridSpacing;
        let targetY = ((this.gy * gridSpacing + yOffset) % wrapH + wrapH) % wrapH - gridSpacing;

        // Snap coordinates if wrapped around screen boundary to prevent massive spring tension pull
        if (Math.abs(targetX - this.x) > canvas.width / 2) {
          this.x = targetX;
          this.vx = 0;
        }
        if (Math.abs(targetY - this.y) > canvas.height / 2) {
          this.y = targetY;
          this.vy = 0;
        }

        this.baseX = targetX;
        this.baseY = targetY;

        // 1. Spring force pull to grid target
        let ax = (this.baseX - this.x) * springConstant;
        let ay = (this.baseY - this.y) * springConstant;

        // 2. Mouse repulsion force (quadratic falloff)
        let dx = this.x - mouse.x;
        let dy = this.y - mouse.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < repulsionRadius && dist > 0) {
          let force = (repulsionRadius - dist) / repulsionRadius;
          force = force * force; // Quadratic curves for soft push
          
          ax += (dx / dist) * force * repulsionForce * 0.08;
          ay += (dy / dist) * force * repulsionForce * 0.08;
        }

        // 3. Euler integration with dampening
        this.vx = (this.vx + ax) * friction;
        this.vy = (this.vy + ay) * friction;
        this.x += this.vx;
        this.y += this.vy;
      }

      draw(time) {
        // Brightness wave computed dynamically from coordinates + time
        const pulse = Math.sin((this.x * 0.005) + (this.y * 0.005) + time) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;

        ctx.beginPath();
        ctx.arc(this.x, this.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let particles = [];

    function initParticles() {
      particles = [];
      const cols = Math.ceil(canvas.width / gridSpacing) + 2;
      const rows = Math.ceil(canvas.height / gridSpacing) + 2;
      
      for (let c = -1; c < cols; c++) {
        for (let r = -1; r < rows; r++) {
          particles.push(new Particle(c, r));
        }
      }
    }

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    }

    window.addEventListener('resize', resizeCanvas);

    function tick() {
      // 1. Accumulate auto-drift
      currentYOffset += autoDriftSpeed * 0.1;
      
      // 2. Add scroll parallax delta
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY;
      currentYOffset += scrollDiff * parallaxSpeed;
      lastScrollY = currentScrollY;

      // 3. Clear and render scene
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      
      const time = Date.now() * 0.001;

      particles.forEach(p => {
        p.update(0, currentYOffset);
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
git commit -m "feat: implement interactive dot-matrix physics canvas background"
```

---

### Task 3: Verification and Manual Testing

- [ ] **Step 1: Start local test server and check browser rendering**

Start local HTTP server:
`python -m http.server 8000` (or similar available web server)

Expected behavior in browser:
1. Open `http://localhost:8000`.
2. Verify that the faint dot-matrix background is visible on the landing page.
3. Verify that the breathing brightness pulse of the dots is visible and working.
4. Verify that moving the mouse cursor pushes the dots away fluidly and they bounce back softly.
5. Verify that scrolling down the landing page shifts the grid position dynamically slower than content.
6. Check developer tools console (F12) to confirm there are zero Javascript syntax or runtime errors.

- [ ] **Step 2: Stop local server**

Terminate the local server process.
