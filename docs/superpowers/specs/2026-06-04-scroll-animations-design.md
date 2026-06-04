# Air — Minimal Interactive Scroll Animations (Cathode Noir)

- **Date:** 2026-06-04
- **Status:** Approved (design), pending implementation plan
- **Repo:** `Air`
- **Topic:** Interactive Dot-Matrix Canvas Background with Spring Physics

## 1. Goal Description

The user wants to make the landing page feel more animated, with movement responsive to scroll depth and cursor interaction, while remaining minimal and matching the black-and-white editorial aesthetic ("Cathode Noir").

We are adding an interactive **Dot-Matrix background canvas** representing a physical display grid. The dots slowly drift, shift with scroll parallax, and smoothly run away (repelled) from the mouse cursor using spring-mass-damper physics to create an organic, fluid rebound effect.

## 2. Animation Parameter Specifications

From user feedback and calibration in the visual customizer, the approved settings are:

| Parameter | Value | Details |
|---|---|---|
| Style | `dots` | Grid coordinate dot intersections |
| Grid Opacity | `9.5%` (`0.095`) | Canvas element opacity variable |
| Dot Size | `1.8px` radius | Circle drawing radius |
| Grid Spacing | `20px` | Base cell grid size |
| Repulsion Radius | `150px` | Mouse cursor avoidance distance boundary |
| Repulsion Force | `25` | Scalar for repulsion acceleration |
| Spring Tension | `0.08` | Restoring acceleration factor |
| Friction | `0.80` | Velocity dampening multiplier per frame |
| Auto Drift Speed | `0.1 px/s` | Continuous auto-scrolling rate |
| Scroll Parallax | `0.2x` | Parallax offset multiplier for page scrolls |
| Scanline Opacity | `7%` (`0.07`) | Vertical/horizontal scanline gradient opacity overlay |

## 3. Proposed Changes

### `index.html`

#### 1. DOM Modifications
- Append `<canvas id="crt-canvas"></canvas>` as the first child under `<body>` to serve as the background rendering surface.
- Update the `.crt-scanlines` class opacity styling to `0.07` to match the scanline preference.

#### 2. CSS Rules
Add or update the following styles to support the background positioning:
```css
#crt-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.095;
}
```

#### 3. Javascript Implementation
Implement the particle engine in a script tag just before the closing `</body>` tag:
- **`Particle` Class**:
  - Properties: `gx`, `gy` (grid coords), `x`, `y` (current position), `vx`, `vy` (velocity), `baseX`, `baseY` (spring target coords).
  - Method `update(xOffset, yOffset, mouse)`:
    - Calculates grid target `(baseX, baseY)` incorporating current global scroll and auto-drift offsets.
    - Double modulo wrapping logic handles screen boundary transitions.
    - Snaps position if wrapping occurs to avoid massive spring tension spikes.
    - Calculates restoring spring acceleration: $a_{spring} = (base - position) \times 0.08$.
    - Calculates mouse repulsion: if distance to mouse is $< 150px$, adds quadratic repulsion acceleration $a_{rep} = \frac{vector}{distance} \times \left(\frac{150 - distance}{150}\right)^2 \times 25 \times 0.08$.
    - Integrates acceleration: $velocity = (velocity + acceleration) \times 0.80$.
    - Updates coordinate: $position += velocity$.
  - Method `draw(ctx, time)`:
    - Draws a filled circle at `(x, y)` with radius `1.8px` in `#ffffff`.
    - Modulates opacity dynamically with a slow sine wave based on coordinate position and elapsed time to simulate screen glow.
- **Initialization & Events**:
  - `initParticles()` maps viewport width/height to particle grids with padding.
  - `window.addEventListener('resize')` updates canvas size and calls `initParticles()`.
  - `window.addEventListener('mousemove')` tracks mouse coordinate.
  - `window.addEventListener('mouseleave')` resets mouse coordinate off-screen.
  - `requestAnimationFrame` loop handles continuous state updates, drift calculation, and drawing.

## 4. Verification Plan

### Manual Verification
1. Run local web server and open the page in a browser.
2. Confirm the background dot matrix is visible and displays a subtle breathing pulse.
3. Move the cursor around the screen and verify the dots smoothly flow away from the mouse, elastic-bouncing back into alignment.
4. Scroll the page downwards and confirm the dot matrix shifts vertically slower than content (scroll parallax).
5. Verify no script errors in the developer console.
