/* AIR · formulario «Solicitar diagnóstico».
   Validación accesible (mensajes junto a cada campo, aria-invalid y aria-describedby),
   campo trampa antispam, modo vista previa (html[data-preview]) y envío JSON al webhook. */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var button = document.getElementById('submit-btn');
  var status = document.getElementById('form-status');
  var trap = document.getElementById('web');
  var endpoint = form.getAttribute('data-endpoint');
  var buttonLabel = button.textContent;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function field(id) { return document.getElementById(id); }
  function value(id) { return field(id).value.trim(); }
  function sizeChoice() { return form.querySelector('input[name="tamano"]:checked'); }

  var RULES = {
    nombre: function () { return value('nombre') ? '' : 'Escribe tu nombre.'; },
    empresa: function () { return value('empresa') ? '' : 'Escribe el nombre de tu empresa.'; },
    email: function () {
      var v = value('email');
      if (!v) return 'Escribe tu email.';
      return EMAIL.test(v) && !field('email').validity.typeMismatch
        ? '' : 'Escribe un email válido, por ejemplo nombre@empresa.es.';
    },
    tamano: function () { return sizeChoice() ? '' : 'Elige el tamaño de tu empresa.'; },
    privacidad: function () { return field('privacidad').checked ? '' : 'Necesitamos tu aceptación para responderte.'; }
  };
  var ORDER = ['nombre', 'empresa', 'email', 'tamano', 'privacidad'];

  // Elemento que recibe aria-invalid / aria-describedby y el foco de cada regla
  function target(id) { return id === 'tamano' ? field('tamano') : field(id); }
  function focusTarget(id) { return id === 'tamano' ? form.querySelector('input[name="tamano"]') : field(id); }

  function describe(el, errorId, add) {
    var ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var has = ids.indexOf(errorId) >= 0;
    if (add && !has) ids.push(errorId);
    if (!add && has) ids.splice(ids.indexOf(errorId), 1);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  function showError(id, msg) {
    var err = field(id + '-error');
    var el = target(id);
    err.textContent = msg;
    err.hidden = false;
    el.setAttribute('aria-invalid', 'true');
    describe(el, err.id, true);
  }

  function clearError(id) {
    var err = field(id + '-error');
    var el = target(id);
    err.textContent = '';
    err.hidden = true;
    el.removeAttribute('aria-invalid');
    describe(el, err.id, false);
  }

  function check(id) {
    var msg = RULES[id]();
    if (msg) showError(id, msg); else clearError(id);
    return !msg;
  }

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
  }

  function succeed() {
    setStatus('Recibido. Te respondemos en menos de 24 horas en días laborables.', 'ok');
    button.textContent = 'Solicitud enviada';
    button.disabled = true;
    form.reset();
  }

  // Revalida solo el campo que ya mostraba un error
  ORDER.forEach(function (id) {
    var els = id === 'tamano'
      ? Array.prototype.slice.call(form.querySelectorAll('input[name="tamano"]'))
      : [field(id)];
    els.forEach(function (el) {
      ['input', 'change', 'blur'].forEach(function (type) {
        el.addEventListener(type, function () {
          if (target(id).getAttribute('aria-invalid') === 'true') check(id);
        });
      });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('', '');

    var firstInvalid = null;
    ORDER.forEach(function (id) {
      if (!check(id) && !firstInvalid) firstInvalid = id;
    });
    if (firstInvalid) {
      focusTarget(firstInvalid).focus();
      return;
    }

    // Campo trampa relleno: casi seguro un robot. Se simula el éxito sin enviar nada.
    if (trap && trap.value) { succeed(); return; }

    if (document.documentElement.hasAttribute('data-preview')) {
      setStatus('Esto es una vista previa: el formulario no envía datos.', '');
      return;
    }

    var size = sizeChoice();
    var payload = {
      nombre: value('nombre'),
      empresa: value('empresa'),
      email: value('email'),
      telefono: value('telefono'),
      tamano: size ? size.value : '',
      mensaje: value('mensaje'),
      fecha: new Date().toISOString(),
      origen: window.location.href
    };

    button.disabled = true;
    button.textContent = 'Enviando…';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      succeed();
    }).catch(function () {
      button.disabled = false;
      button.textContent = buttonLabel;
      setStatus('No se ha podido enviar. Escríbenos a air@airconsulting.es o llama al 634 055 428.', 'error');
    });
  });
})();
