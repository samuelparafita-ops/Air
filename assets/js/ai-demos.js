/* AIR · demos de inteligencia artificial.
   Solo se anima la demo del panel activo, y solo mientras está en pantalla.
   Cada demo define reset (estado inicial), play (secuencia temporizada) y final (estado completo).
   Estado publicado en [data-demo][data-state]: idle | running | done. */
(function () {
  'use strict';

  var host = document.querySelector('[data-demo-host]');
  if (!host) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var timers = [];
  function at(ms, fn) { timers.push(window.setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(window.clearTimeout); timers = []; }

  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function on(el) { if (el) el.classList.add('on'); }
  function clearOn(root) { $$(root, '.on').forEach(function (el) { el.classList.remove('on'); }); }
  function sequence(list, start, gap, fn) {
    list.forEach(function (el, i) { at(start + i * gap, function () { (fn || on)(el, i); }); });
    return start + Math.max(0, list.length - 1) * gap;
  }

  var DEMOS = {
    nlp: {
      reset: function (s) { clearOn(s); },
      play: function (s, done) {
        var end = sequence($$(s, '.ent'), 500, 480);
        end = sequence($$(s, '.nlp-tags > div'), end + 500, 320);
        at(end + 2600, done);
      },
      final: function (s) { $$(s, '.ent, .nlp-tags > div').forEach(on); }
    },

    rag: {
      reset: function (s) {
        clearOn(s);
        var q = $(s, '.rag-q-text');
        q.classList.remove('is-sent');
        if (!q.firstChild || q.firstChild.nodeType !== 3) q.insertBefore(document.createTextNode(''), q.firstChild);
        q.firstChild.nodeValue = '';
      },
      play: function (s, done) {
        var q = $(s, '.rag-q-text');
        var text = q.getAttribute('data-text');
        var node = q.firstChild;
        on(q);
        for (var i = 1; i <= text.length; i++) {
          (function (n) { at(200 + n * 30, function () { node.nodeValue = text.slice(0, n); }); })(i);
        }
        var t = 200 + text.length * 30 + 250;
        at(t, function () { q.classList.add('is-sent'); });
        t = sequence($$(s, '.rag-docs li'), t + 150, 360);
        at(t + 350, function () { on($(s, '.rag-docs')); });
        t = sequence($$(s, '.rag-a .w'), t + 700, 70);
        at(t + 2600, done);
      },
      final: function (s) {
        var q = $(s, '.rag-q-text');
        q.firstChild.nodeValue = q.getAttribute('data-text');
        q.classList.add('is-sent');
        $$(s, '.rag-q-text, .rag-docs, .rag-docs li, .rag-a .w').forEach(on);
      }
    },

    vision: {
      reset: function (s) {
        clearOn(s);
        $(s, '.vision-frame').classList.remove('is-scanning');
        $(s, '.v-count').textContent = '0';
        $(s, '.v-bad').textContent = '0';
      },
      play: function (s, done) {
        var frame = $(s, '.vision-frame');
        var count = $(s, '.v-count');
        var bad = $(s, '.v-bad');
        at(150, function () { frame.classList.add('is-scanning'); });
        var n = 0, b = 0;
        var end = sequence($$(s, '.det'), 1300, 150, function (el) {
          on(el);
          count.textContent = String(++n);
          if (el.classList.contains('is-bad')) bad.textContent = String(++b);
        });
        at(end + 300, function () { on($(s, '.vision-stats')); });
        at(end + 3200, done);
      },
      final: function (s) {
        $$(s, '.det, .vision-stats').forEach(on);
        $(s, '.v-count').textContent = String($$(s, '.det').length);
        $(s, '.v-bad').textContent = String($$(s, '.det.is-bad').length);
      }
    },

    agentes: {
      reset: function (s) {
        clearOn(s);
        $$(s, '.node').forEach(function (n) { n.classList.remove('is-active', 'is-done'); });
      },
      play: function (s, done) {
        var nodes = $$(s, '.node');
        var log = $$(s, '.flow-log li');
        var t = 300;
        nodes.forEach(function (node, i) {
          var human = node.classList.contains('node--human');
          at(t, function () { node.classList.add('is-active'); on(log[i]); });
          t += human ? 1700 : 650;
          at(t, function () { node.classList.remove('is-active'); node.classList.add('is-done'); });
          t += 120;
        });
        at(t + 2600, done);
      },
      final: function (s) {
        $$(s, '.node').forEach(function (n) { n.classList.add('is-done'); });
        $$(s, '.flow-log li').forEach(on);
      }
    },

    prediccion: {
      reset: function (s) { clearOn(s); },
      play: function (s, done) {
        at(200, function () { on($(s, '.ch-hist')); });
        at(1900, function () { on($(s, '.ch-anom')); });
        at(2600, function () { on($(s, '.ch-fc')); });
        var end = sequence($$(s, '.predict-stats > div'), 3800, 250);
        at(end + 2800, done);
      },
      final: function (s) { $$(s, '.ch-hist, .ch-anom, .ch-fc, .predict-stats > div').forEach(on); }
    },

    documentos: {
      reset: function (s) {
        clearOn(s);
        $(s, '.paper').classList.remove('is-scanning');
        $$(s, '.erp-new td[data-v]').forEach(function (td) { td.textContent = ''; });
        $(s, '.erp-new .chip').classList.remove('is-ok');
      },
      play: function (s, done) {
        at(200, function () { $(s, '.paper').classList.add('is-scanning'); });
        var t = sequence($$(s, '.paper [data-f]'), 700, 260);
        var row = $(s, '.erp-new');
        at(t + 400, function () { on(row); });
        t = sequence($$(s, '.erp-new td[data-v]'), t + 700, 220, function (td) {
          td.textContent = td.getAttribute('data-v');
        });
        at(t + 450, function () { $(s, '.erp-new .chip').classList.add('is-ok'); });
        at(t + 3200, done);
      },
      final: function (s) {
        $$(s, '.paper [data-f], .erp-new').forEach(on);
        $$(s, '.erp-new td[data-v]').forEach(function (td) { td.textContent = td.getAttribute('data-v'); });
        $(s, '.erp-new .chip').classList.add('is-ok');
      }
    },

    voz: {
      reset: function (s) { clearOn(s); },
      play: function (s, done) {
        at(100, function () { on($(s, '.wave-wrap')); });
        var t = sequence($$(s, '.transcript li'), 700, 1100);
        t = sequence($$(s, '.voice-tasks li'), t + 900, 450);
        at(t + 2800, done);
      },
      final: function (s) { $$(s, '.wave-wrap, .transcript li, .voice-tasks li').forEach(on); }
    }
  };

  /* ── Controlador ── */
  var active = null;
  var onScreen = false;

  function stageOf(el) { return el.querySelector('.demo-stage'); }
  function defOf(el) { return el && DEMOS[el.getAttribute('data-demo')]; }

  function stop() {
    clearTimers();
    if (!active) return;
    var def = defOf(active);
    if (def) def.reset(stageOf(active));
    active.setAttribute('data-state', 'idle');
  }

  function run() {
    var def = defOf(active);
    if (!def || !onScreen || document.hidden) return;
    if (active.getAttribute('data-state') !== 'idle') return;
    clearTimers();
    var stage = stageOf(active);
    def.reset(stage);
    if (reduced) {
      def.final(stage);
      active.setAttribute('data-state', 'done');
      return;
    }
    active.setAttribute('data-state', 'running');
    var cycle = function () {
      def.reset(stage);
      def.play(stage, function () { at(400, cycle); });
    };
    cycle();
  }

  function visibleDemo() {
    var panel = $$(host, '[role="tabpanel"]').filter(function (p) { return !p.hidden; })[0];
    return panel ? panel.querySelector('[data-demo]') : null;
  }

  $$(host, '[data-demo]').forEach(function (el) {
    el.setAttribute('data-state', 'idle');
    var def = defOf(el);
    if (def) def.reset(stageOf(el));
  });
  active = visibleDemo();

  document.addEventListener('tabchange', function (e) {
    var panel = e.detail && e.detail.panel;
    if (!panel || !host.contains(panel)) return;
    stop();
    active = panel.querySelector('[data-demo]');
    run();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) run(); else stop();
    }, { threshold: 0.25 }).observe(host);
  } else {
    onScreen = true;
    run();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else run();
  });
})();
