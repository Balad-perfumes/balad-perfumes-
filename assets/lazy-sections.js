/* Loads homepage sections on demand. See snippets/lazy-section.liquid for the why and how. */
(function () {
  if (window.__lazySections) return;
  var cache = {};
  var started = false;
  var SELECTOR = '[data-lazy-section]';
  window.__lazySections = true;

  function sectionUrl(id) {
    var url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set('section_id', id);
    return url.toString();
  }

  function fetchSection(id) {
    if (!cache[id]) {
      cache[id] = fetch(sectionUrl(id), { credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      });
      // Allow a retry later if this attempt fails
      cache[id].catch(function () { delete cache[id]; });
    }
    return cache[id];
  }

  function loadStylesheet(href) {
    var abs = new URL(href, document.baseURI).href;
    var existing = Array.prototype.find.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return l.href === abs; });
    if (existing && existing.sheet) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = existing || document.createElement('link');
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      if (!existing) {
        link.rel = 'stylesheet';
        link.href = abs;
        document.head.appendChild(link);
      } else if (link.media !== 'all') {
        link.media = 'all';
      }
      setTimeout(resolve, 3000);
    });
  }

  function render(placeholder) {
    if (placeholder.dataset.lazyState) return;
    placeholder.dataset.lazyState = 'loading';
    var id = placeholder.getAttribute('data-lazy-section');
    var wrapper = placeholder.closest('.shopify-section') || placeholder;

    fetchSection(id).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      // Only ever insert the exact section asked for. Anything else (an error page, a bot challenge, a
      // redirect to another page) is treated as a failure and the skeleton stays.
      var fresh = doc.getElementById('shopify-section-' + id);
      if (!fresh) throw new Error('section ' + id + ' missing from response');

      // Stylesheets first, so the section never shows unstyled
      var links = Array.prototype.slice.call(fresh.querySelectorAll('link[rel="stylesheet"]'));
      var cssReady = Promise.all(links.map(function (l) { return loadStylesheet(l.getAttribute('href')); }));
      links.forEach(function (l) { l.remove(); });

      // Park the scripts so they can't run (or run twice) while being moved; re-created below in order
      fresh.querySelectorAll('script').forEach(function (s) {
        var type = s.getAttribute('type');
        if (type && !/javascript|module/i.test(type)) return; // e.g. application/ld+json
        s.setAttribute('data-lazy-type', type || '');
        s.setAttribute('type', 'text/lazy-section');
      });

      return cssReady.then(function () {
        var node = document.importNode(fresh, true);
        wrapper.replaceWith(node);
        node.querySelectorAll('script[type="text/lazy-section"]').forEach(function (old) {
          var s = document.createElement('script');
          for (var i = 0; i < old.attributes.length; i++) {
            var a = old.attributes[i];
            if (a.name !== 'type' && a.name !== 'data-lazy-type') s.setAttribute(a.name, a.value);
          }
          var originalType = old.getAttribute('data-lazy-type');
          if (originalType) s.setAttribute('type', originalType);
          s.text = old.text;
          old.replaceWith(s);
        });
        // Same event the theme editor fires after re-rendering a section; theme scripts (e.g. deferred card
        // images in balad-product-card.js) already listen for it.
        node.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true, detail: { sectionId: id, lazy: true } }));
      });
    }).catch(function () {
      // Network/API failure: fall back to a normal page load of the section next time it's needed
      placeholder.dataset.lazyState = '';
    });
  }

  function init() {
    var placeholders = document.querySelectorAll(SELECTOR);
    if (!placeholders.length) return;
    if (!('IntersectionObserver' in window)) { placeholders.forEach(render); return; }

    // Anything actually on screen loads immediately (tall screens, crawlers that render with a tall viewport)
    var onScreen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { onScreen.unobserve(e.target); render(e.target); } });
    });
    placeholders.forEach(function (p) { onScreen.observe(p); });

    // Everything else: once the visitor starts moving, load sections as they come within 1200px
    var near = null;
    function start() {
      if (started) return;
      started = true;
      ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) { window.removeEventListener(t, start, true); });
      near = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { near.unobserve(e.target); render(e.target); } });
      }, { rootMargin: '1200px 0px' });
      document.querySelectorAll(SELECTOR).forEach(function (p) { if (!p.dataset.lazyState) near.observe(p); });
    }
    ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) { window.addEventListener(t, start, { capture: true, passive: true }); });
    if (window.scrollY > 0) start(); // restored scroll position (back/forward, anchors)

    // A link like /#our-stores whose target lives in a section that hasn't loaded yet: load the
    // placeholders, then jump to the target once it exists.
    var hash = window.location.hash && window.location.hash.length > 1 ? decodeURIComponent(window.location.hash.slice(1)) : '';
    if (hash && !document.getElementById(hash)) {
      placeholders.forEach(render);
      document.addEventListener('shopify:section:load', function onLoad() {
        var target = document.getElementById(hash);
        if (!target) return;
        document.removeEventListener('shopify:section:load', onLoad);
        target.scrollIntoView();
      });
    }

    // Prefetch the HTML (network only, no rendering) once the page has finished loading
    function prefetch() {
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 300); };
      idle(function () {
        document.querySelectorAll(SELECTOR).forEach(function (p) { fetchSection(p.getAttribute('data-lazy-section')).catch(function () {}); });
      });
    }
    if (document.readyState === 'complete') prefetch();
    else window.addEventListener('load', prefetch, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
