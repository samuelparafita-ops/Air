/* AIR · comportamiento general: cabecera, menú móvil, aparición al hacer scroll,
   línea del método, aviso de cookies y año del pie. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Las secciones usan content-visibility: auto (carga más rápida). Antes de saltar a un ancla se
     pintan todas, para que el navegador calcule la posición con las alturas reales. */
  var renderAll = function () { root.classList.add('cv-all'); };
  if (window.location.hash) renderAll();
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (link && link.getAttribute('href').length > 1) renderAll();
  }, true);

  /* Cabecera: filete al hacer scroll */
  var header = document.getElementById('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    // La primera lectura espera a la carga: leer el scroll antes fuerza una maquetación completa.
    window.addEventListener('load', function () { window.requestAnimationFrame(onScroll); }, { once: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menú móvil */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var setOpen = function (open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    toggle.addEventListener('click', function () { setOpen(menu.hidden); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    var wide = window.matchMedia('(min-width: 960px)');
    var onWide = function () { if (wide.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }

  /* Aparición suave al entrar en pantalla */
  var items = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Línea de tiempo del método: se completa al avanzar por la sección */
  var method = document.querySelector('.method');
  if (method) {
    if (reduced) {
      method.style.setProperty('--progress', '1');
    } else {
      var ticking = false;
      var update = function () {
        ticking = false;
        var r = method.getBoundingClientRect();
        var vh = window.innerHeight || root.clientHeight;
        var p = (vh * 0.62 - r.top) / Math.max(r.height, 1);
        method.style.setProperty('--progress', String(Math.min(1, Math.max(0, p))));
      };
      var request = function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
      };
      window.addEventListener('load', request, { once: true });
      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', request, { passive: true });
    }
  }

  /* Menú: marca la sección que se está leyendo (aria-current), en escritorio y en móvil */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"], #mobile-menu a[href^="#"]:not(.btn)'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var setCurrent = function (id) {
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    var ids = navLinks.map(function (a) { return a.getAttribute('href').slice(1); })
      .filter(function (id, i, all) { return all.indexOf(id) === i; });
    var watched = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    watched.forEach(function (el) { spy.observe(el); });
    // Por encima de la primera sección enlazada no se marca nada
    var hero = document.getElementById('inicio');
    if (hero) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) setCurrent('');
      }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
    }
  }

  /* Pestañas de IA en móvil: el degradado que indica «hay más» desaparece al llegar al final */
  var aiTabs = document.querySelector('.ai-tabs');
  if (aiTabs) {
    var checkEnd = function () {
      aiTabs.classList.toggle('is-end', aiTabs.scrollLeft + aiTabs.clientWidth >= aiTabs.scrollWidth - 4);
    };
    aiTabs.addEventListener('scroll', checkEnd, { passive: true });
    window.addEventListener('resize', checkEnd, { passive: true });
    window.addEventListener('load', checkEnd, { once: true });
  }

  /* Año del pie */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* Aviso de cookies (solo informativo: no hay cookies que no sean técnicas) */
  var banner = document.getElementById('cookie-banner');
  var accept = document.getElementById('accept-cookies');
  if (banner && accept) {
    var seen = false;
    try { seen = window.localStorage.getItem('airCookiesAccepted') === 'true'; } catch (e) { /* sin almacenamiento */ }
    if (!seen) banner.hidden = false;
    accept.addEventListener('click', function () {
      try { window.localStorage.setItem('airCookiesAccepted', 'true'); } catch (e) { /* sin almacenamiento */ }
      banner.hidden = true;
    });
  }
})();
