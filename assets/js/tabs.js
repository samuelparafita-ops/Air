/* AIR · pestañas accesibles (patrón ARIA «tabs» con activación automática).
   Cada [data-tabs] contiene un [role=tablist] con botones [role=tab] que apuntan a su
   [role=tabpanel] con aria-controls. Al cambiar de pestaña se emite «tabchange». */
(function () {
  'use strict';

  function initTabs(container) {
    var list = container.querySelector('[role="tablist"]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelOf(tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    }

    function apply(selected) {
      tabs.forEach(function (tab) {
        var on = tab === selected;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        var panel = panelOf(tab);
        if (panel) panel.hidden = !on;
      });
    }

    function select(tab, focus) {
      if (focus) tab.focus();
      if (tab.getAttribute('aria-selected') === 'true') return;
      apply(tab);
      if (tab.scrollIntoView && list.scrollWidth > list.clientWidth) {
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      container.dispatchEvent(new CustomEvent('tabchange', {
        bubbles: true,
        detail: { tab: tab, panel: panelOf(tab) }
      }));
    }

    list.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab && list.contains(tab)) select(tab, false);
    });

    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': next = tabs[(i + 1) % tabs.length]; break;
        case 'ArrowLeft':
        case 'ArrowUp': next = tabs[(i - 1 + tabs.length) % tabs.length]; break;
        case 'Home': next = tabs[0]; break;
        case 'End': next = tabs[tabs.length - 1]; break;
        default: return;
      }
      e.preventDefault();
      select(next, true);
    });

    // Estado inicial a partir del HTML, sin emitir evento.
    var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    apply(initial);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-tabs]'), initTabs);
})();
