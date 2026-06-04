# Air — Minimal Interactive Scroll Animations (Cathode Noir)

- **Date:** 2026-06-04
- **Status:** Approved (design), pending implementation plan
- **Repo:** `Air`
- **Topic:** Interactive Dot-Matrix Canvas Background with Concentric Ripple Waves

## 1. Goal Description

The user wants to make the landing page feel more animated, with movement responsive to scroll depth and cursor interaction, while remaining minimal and matching the black-and-white editorial aesthetic ("Cathode Noir").

We are adding an interactive **Dot-Matrix background canvas** representing a physical display grid. The dots slowly drift, shift with scroll parallax, and bob/ripple in response to concentric ripple waves triggered by cursor movements.

## 2. Animation Parameter Specifications

From user feedback and calibration in the visual customizer, the approved settings are:

| Parameter | Value | Details |
|---|---|---|
| Style | `dots` | Grid coordinate dot intersections |
| Grid Opacity | `9.5%` (`0.095`) | Canvas element opacity variable |
| Dot Size | `1.8px` radius | Circle drawing radius |
| Grid Spacing | `20px` | Base cell grid size |
| Ripple Radius (Max) | `180px` | Distance a wave propagates before fading out |
| Ripple Speed | `4px` / frame | Rate of wave propagation |
| Wave Width | `30px` | Physical width of the wave envelope |
| Wave Amplitude | `8px` | Maximum displacement shift |
| Spring Tension | `0.08` | Restoring acceleration factor |
| Friction | `0.80` | Velocity dampening multiplier per frame |
| Auto Drift Speed | `0.1 px/s` | Continuous auto-scrolling rate |
| Scroll Parallax | `0.2x` | Parallax offset multiplier for page scrolls |
| Scanline Opacity | `7%` (`0.07`) | Vertical/horizontal scanline gradient opacity overlay |

## 3. Proposed Changes

### `index.html`

#### 1. DOM Modifications
- Append `<canvas id="crt-canvas"></canvas>` as the first child under `<body>` to serve as the background rendering surface.
- Add `<div class="crt-scanlines" aria-hidden="true"></div>` and `<div class="crt-flicker" aria-hidden="true"></div>` overlays.
- Update CSS variable `--grid-opacity` to `0.095` and `--scanline-opacity` to `0.07`.

#### 2. CSS Rules
Add styles for `#crt-canvas`, `.crt-scanlines`, and `.crt-flicker` (incorporating `will-change: opacity` and accessibility media queries to support `prefers-reduced-motion`).

#### 3. Javascript Implementation
Implement the particle engine in a script tag just before the closing `</body>` tag:
- **`Ripple` Class / Object**:
  - Properties: `x`, `y` (center), `radius`, `maxRadius` (`180`), `speed` (`4`), `amplitude` (`8`).
- **`Particle` Class**:
  - Properties: `gx`, `gy` (grid coords), `x`, `y` (current position), `vx`, `vy` (velocity), `baseX`, `baseY` (spring target coords).
  - Method `update(xOffset, yOffset, dt, ripples)`:
    - Calculates standard grid target `(targetX, targetY)` incorporating scroll and drift.
    - Loops through active ripples. For each ripple, checks if distance `dist` to ripple center is within the wave width envelope ($|dist - radius| < 30px$).
    - If inside the envelope, calculates offset shift using a sine wave: $wavePush = \sin((radius - dist) \times 0.15) \times 8 \times \left(\frac{30 - diff}{30}\right)$.
    - Offsets grid target: `baseX = targetX + cos(angle) * wavePush`, `baseY = targetY + sin(angle) * wavePush`.
    - Calculates restoring spring acceleration: $a_{spring} = (base - position) \times 0.08 \times dt$.
    - Integrates velocity with continuous damping: $velocity = (velocity + acceleration) \times \text{friction}^{dt}$.
    - Updates coordinate: $position += velocity \times dt$.
- **Initialization & Events**:
  - Track cursor movements. If cursor moves more than `40px` from the last registered ripple, append a new ripple (capped at max `5` active ripples to preserve CPU).
  - `requestAnimationFrame` loop updates scroll coordinates, accumulates auto-drift, steps ripple radiuses, filters dead ripples, and renders particle matrix using optimized `fillRect`.

## 4. Verification Plan

### Manual Verification
1. Run local web server and open the page in a browser.
2. Confirm the background dot matrix is visible and displays a subtle breathing pulse.
3. Move the cursor and verify concentric ripple waves propagate outward from the path of motion, making the dots wave and sway elastically.
4. Verify scrolling parallax shifts grid.
5. Confirm prefers-reduced-motion media query disables flicker and javascript animation loop.
6. Verify no script errors in the developer console.
