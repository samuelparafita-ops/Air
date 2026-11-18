/* AIR · campo isométrico de la portada.
   Una malla de puntos en perspectiva isométrica (la geometría del logotipo) que ondula
   despacio, se eleva bajo el puntero y por la que circulan pulsos de datos.
   Estado publicado en canvas[data-state]: running | paused | static.
   Rendimiento: arranca cuando el navegador está libre tras la carga, mide con ResizeObserver
   (sin forzar maquetación), dibuja los puntos por lotes y anima a 30 fps. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-field');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var host = canvas.parentElement;
  var hero = canvas.closest('.hero') || host;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COS = Math.cos(Math.PI / 6);
  var SIN = Math.sin(Math.PI / 6);
  var LEVELS = 12;           // niveles de opacidad para dibujar por lotes
  var FRAME_MS = 1000 / 30;  // 30 fps

  function rgb(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    var m = /^#?([0-9a-f]{6})$/i.exec(v);
    var n = parseInt(m ? m[1] : fallback.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(c, a) {
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
  }

  function mix(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  var C_DOT, C_GREEN, C_MID, DOT_STYLES, LINE_STYLE, TRAIL_STYLES, HALO_STYLE, HEAD_STYLE;

  function palette() {
    C_DOT = rgb('--muted', '#9AA6A1');
    C_GREEN = rgb('--green', '#4ADE80');
    C_MID = rgb('--green-mid', '#2FBF68');
    DOT_STYLES = [];
    for (var l = 0; l < LEVELS; l++) DOT_STYLES.push(rgba(C_DOT, 0.24 + 0.56 * l / (LEVELS - 1)));
    LINE_STYLE = rgba(C_DOT, 0.085);
    TRAIL_STYLES = [];
    for (var s = 0; s < 10; s++) TRAIL_STYLES.push(rgba(C_MID, 0.9 * (1 - s / 10)));
    HALO_STYLE = rgba(C_GREEN, 0.18);
    HEAD_STYLE = rgba(C_GREEN, 1);
  }

  // Geometría
  var W = 0, H = 0, N = 26, S = 20, CX = 0, CY = 0, half = 12.5;
  var px, py, glow, baseR, level;

  // Puntero (en coordenadas de rejilla) con relajación
  var pointer = { u: 0, v: 0, tu: 0, tv: 0, k: 0, tk: 0 };

  var pulses = [];
  var ripples = [];

  function layout(width, height) {
    W = Math.max(1, Math.round(width));
    H = Math.max(1, Math.round(height));
    var dpr = Math.min(window.devicePixelRatio || 1, W < 600 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target;
    if (W >= 960) {
      N = 26; target = Math.min(W * 0.62, 1000); CX = W * 0.68; CY = H * 0.46;
    } else if (W >= 600) {
      // Banda bajo el texto (la portada reserva 220 px de aire inferior)
      N = 22; target = W * 0.8; CX = W * 0.5; CY = H - 250;
    } else {
      N = 18; target = W * 1.15; CX = W * 0.5; CY = H - 235;
    }
    half = (N - 1) / 2;
    S = target / (2 * (N - 1) * COS);
    px = new Float32Array(N * N);
    py = new Float32Array(N * N);
    glow = new Float32Array(N * N);
    baseR = new Float32Array(N * N);
    level = new Uint8Array(N * N);
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var depth = (i + j) / (2 * (N - 1)); // 0 fondo, 1 frente
        baseR[i * N + j] = 0.75 + depth * 0.95;
        level[i * N + j] = Math.round(depth * (LEVELS - 1));
      }
    }
  }

  function spawnPulse(p, at) {
    p.axis = Math.random() < 0.5 ? 0 : 1;
    p.line = 1 + Math.floor(Math.random() * (N - 2));
    p.dir = Math.random() < 0.5 ? 1 : -1;
    p.pos = at !== undefined ? at : (p.dir > 0 ? -1 : N);
    p.speed = 2.6 + Math.random() * 2.2; // celdas por segundo
    p.len = 4;
    p.done = false;
  }

  function initPulses() {
    pulses = [];
    for (var i = 0; i < 4; i++) {
      var p = {};
      spawnPulse(p, reduced ? 3 + i * 4 : undefined);
      if (!reduced) p.pos -= p.dir * i * 5; // escalonados
      pulses.push(p);
    }
    ripples = [];
  }

  function project(t) {
    var active = pointer.k > 0.001;
    for (var i = 0; i < N; i++) {
      var u = i - half;
      var su = 0.75 * Math.sin(u * 0.42 + t * 0.00065);
      for (var j = 0; j < N; j++) {
        var v = j - half;
        var z = su + 0.45 * Math.cos(v * 0.36 - t * 0.0005) + 0.25 * Math.sin((u + v) * 0.22 + t * 0.0004);
        var k = i * N + j;
        var g = 0;
        if (active) {
          var du = u - pointer.u, dv = v - pointer.v;
          var d2 = du * du + dv * dv;
          z += pointer.k * 2.4 * Math.exp(-d2 / 20.48);
          g = pointer.k * Math.exp(-d2 / 13.52);
        }
        glow[k] = g;
        px[k] = CX + (u - v) * COS * S;
        py[k] = CY + (u + v) * SIN * S - z * S * 0.9;
      }
    }
  }

  function pointAt(axis, line, pos) {
    var a = Math.max(0, Math.min(N - 1, pos));
    var a0 = Math.floor(a), a1 = Math.min(N - 1, a0 + 1), f = a - a0;
    var k0 = axis === 0 ? line * N + a0 : a0 * N + line;
    var k1 = axis === 0 ? line * N + a1 : a1 * N + line;
    return [px[k0] + (px[k1] - px[k0]) * f, py[k0] + (py[k1] - py[k0]) * f];
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    project(t);
    var TAU = Math.PI * 2;
    var total = N * N;
    var i, j, k;

    // Malla: un único trazo con todas las filas y columnas
    ctx.lineWidth = 1;
    ctx.strokeStyle = LINE_STYLE;
    ctx.beginPath();
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        k = i * N + j;
        if (j === 0) ctx.moveTo(px[k], py[k]); else ctx.lineTo(px[k], py[k]);
      }
    }
    for (j = 0; j < N; j++) {
      for (i = 0; i < N; i++) {
        k = i * N + j;
        if (i === 0) ctx.moveTo(px[k], py[k]); else ctx.lineTo(px[k], py[k]);
      }
    }
    ctx.stroke();

    // Puntos sin brillo: un relleno por nivel de opacidad
    for (var l = 0; l < LEVELS; l++) {
      ctx.fillStyle = DOT_STYLES[l];
      ctx.beginPath();
      for (k = 0; k < total; k++) {
        if (level[k] !== l || glow[k] > 0.02) continue;
        ctx.moveTo(px[k] + baseR[k], py[k]);
        ctx.arc(px[k], py[k], baseR[k], 0, TAU);
      }
      ctx.fill();
    }

    // Puntos iluminados por el puntero (pocos): uno a uno
    if (pointer.k > 0.001) {
      for (k = 0; k < total; k++) {
        var g = glow[k];
        if (g <= 0.02) continue;
        var alpha = Math.min(1, 0.24 + 0.56 * level[k] / (LEVELS - 1) + g * 0.4);
        ctx.fillStyle = rgba(mix(C_DOT, C_GREEN, Math.min(1, g * 1.4)), alpha);
        ctx.beginPath();
        ctx.arc(px[k], py[k], baseR[k] + g * 1.1, 0, TAU);
        ctx.fill();
      }
    }

    // Pulsos con estela
    ctx.lineWidth = 1.6;
    for (var p = 0; p < pulses.length; p++) {
      var pl = pulses[p];
      for (var s = 0; s < 10; s++) {
        var t0 = pl.pos - pl.dir * (pl.len * s / 10);
        var t1 = pl.pos - pl.dir * (pl.len * (s + 1) / 10);
        if ((t0 < 0 && t1 < 0) || (t0 > N - 1 && t1 > N - 1)) continue;
        var p0 = pointAt(pl.axis, pl.line, t0);
        var p1 = pointAt(pl.axis, pl.line, t1);
        ctx.strokeStyle = TRAIL_STYLES[s];
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.stroke();
      }
      if (pl.pos >= 0 && pl.pos <= N - 1) {
        var head = pointAt(pl.axis, pl.line, pl.pos);
        ctx.fillStyle = HALO_STYLE;
        ctx.beginPath(); ctx.arc(head[0], head[1], 6, 0, TAU); ctx.fill();
        ctx.fillStyle = HEAD_STYLE;
        ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, TAU); ctx.fill();
      }
    }

    // Ondas en rombo donde termina un pulso
    ctx.lineWidth = 1;
    for (var q = 0; q < ripples.length; q++) {
      var rp = ripples[q];
      var life = rp.age / 1100;
      var rr = 4 + life * S * 2.2;
      ctx.strokeStyle = rgba(C_GREEN, 0.55 * (1 - life));
      ctx.beginPath();
      ctx.moveTo(rp.x - rr * COS * 1.15, rp.y);
      ctx.lineTo(rp.x, rp.y - rr * SIN);
      ctx.lineTo(rp.x + rr * COS * 1.15, rp.y);
      ctx.lineTo(rp.x, rp.y + rr * SIN);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function step(dt) {
    var ease = 1 - Math.pow(1 - 0.08, dt / 16.7);
    pointer.u += (pointer.tu - pointer.u) * ease;
    pointer.v += (pointer.tv - pointer.v) * ease;
    pointer.k += (pointer.tk - pointer.k) * ease;

    for (var p = 0; p < pulses.length; p++) {
      var pl = pulses[p];
      pl.pos += pl.dir * pl.speed * dt / 1000;
      if (!pl.done && ((pl.dir > 0 && pl.pos > N - 1) || (pl.dir < 0 && pl.pos < 0))) {
        pl.done = true;
        var e = pointAt(pl.axis, pl.line, pl.dir > 0 ? N - 1 : 0);
        ripples.push({ x: e[0], y: e[1], age: 0 });
      }
      var gone = pl.dir > 0 ? pl.pos - pl.len > N - 1 : pl.pos + pl.len < 0;
      if (gone) spawnPulse(pl);
    }
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].age += dt;
      if (ripples[r].age > 1100) ripples.splice(r, 1);
    }
  }

  // Bucle
  var raf = 0, last = 0, onScreen = true, ready = false, state = '';

  function setState(s) {
    if (s !== state) { state = s; canvas.setAttribute('data-state', s); }
  }

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    if (last && now - last < FRAME_MS - 1) return;
    var dt = last ? Math.min(66, now - last) : FRAME_MS;
    last = now;
    step(dt);
    draw(now);
  }

  function start() {
    if (reduced || !ready) return;
    if (!raf && onScreen && !document.hidden) {
      last = 0;
      raf = window.requestAnimationFrame(frame);
      setState('running');
    }
  }

  function stop() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    if (!reduced && ready) setState('paused');
  }

  function boot() {
    palette();
    var first = true;
    var pending = 0;
    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      var apply = function () {
        layout(box.width, box.height);
        initPulses();
        if (first) {
          first = false;
          ready = true;
          if (reduced) { draw(0); setState('static'); return; }
          draw(0);
          setState(onScreen && !document.hidden ? 'running' : 'paused');
          start();
        } else if (reduced || !raf) {
          draw(0);
        }
      };
      if (first) apply();
      else { window.cancelAnimationFrame(pending); pending = window.requestAnimationFrame(apply); }
    }).observe(host);

    if (reduced) return;

    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start(); else stop();
    }).observe(canvas);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    var toGrid = function (clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var dx = (clientX - rect.left - CX) / (COS * S);
      var dy = (clientY - rect.top - CY) / (SIN * S);
      pointer.tu = (dx + dy) / 2;
      pointer.tv = (dy - dx) / 2;
      pointer.tk = 1;
    };
    hero.addEventListener('pointermove', function (e) { toGrid(e.clientX, e.clientY); }, { passive: true });
    hero.addEventListener('pointerdown', function (e) { toGrid(e.clientX, e.clientY); }, { passive: true });
    hero.addEventListener('pointerleave', function () { pointer.tk = 0; }, { passive: true });
  }

  if (!('ResizeObserver' in window) || !('IntersectionObserver' in window)) return;

  // Arranque cuando el navegador queda libre tras la carga: no compite con el primer pintado.
  var schedule = function () {
    if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 1500 });
    else window.setTimeout(boot, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
