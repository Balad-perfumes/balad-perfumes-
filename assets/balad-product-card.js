/* Balad product card behaviour: image-loaded state (removes the skeleton) + global Quick View modal.
   Loaded once from layout/theme.liquid (was inlined in every card, ~10 KB x every card on the page). */
/* Deferred images for sections further down the page (product cards, parallax backgrounds, promo cards).
   They ship their URLs as data-defer-src / data-defer-srcset. Native loading="lazy" still fetched them
   during page load (Chrome loads lazy images up to ~1250px below the screen), so ~600 KB of photos
   competed with the hero image on mobile. Here a whole section loads together once any of its deferred
   images comes within 300px of the viewport, so cards in horizontal rows don't pop in one by one. */
if (!window.__baladDeferInit) {
  window.__baladDeferInit = true;
  (function () {
    var SELECTOR = 'img[data-defer-src], img[data-defer-srcset]';

    function loadImg(img) {
      var picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
      if (picture) {
        picture.querySelectorAll('source[data-defer-srcset]').forEach(function (source) {
          source.srcset = source.getAttribute('data-defer-srcset');
          source.removeAttribute('data-defer-srcset');
        });
      }
      var srcset = img.getAttribute('data-defer-srcset');
      var src = img.getAttribute('data-defer-src');
      img.removeAttribute('data-defer-srcset');
      img.removeAttribute('data-defer-src');
      if (srcset) img.srcset = srcset;
      if (src) img.src = src;
    }

    function loadGroup(img) {
      var group = img.closest('.shopify-section') || img.parentElement;
      group.querySelectorAll(SELECTOR).forEach(function (el) {
        if (io) io.unobserve(el);
        loadImg(el);
      });
    }

    var io = 'IntersectionObserver' in window
      ? new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.target.isConnected) loadGroup(entry.target);
          });
        }, { rootMargin: '300px 0px' })
      : null;

    function scan(scope) {
      (scope || document).querySelectorAll(SELECTOR).forEach(function (img) {
        if (io) io.observe(img);
        else loadImg(img);
      });
    }

    // Start only once the hero (the mobile LCP image) has painted. Any request that starts before
    // that paint counts against LCP in PageSpeed's simulation (every byte goes through the same
    // throttled 4G link), so "Shop Our Collections" photos just below the hero waited for it.
    function afterHeroPaint(fn) {
      var done = false;
      function run() {
        if (done) return;
        done = true;
        requestAnimationFrame(function () { setTimeout(fn, 0); });
      }
      var hero = document.querySelector('.balad-min-hero__img');
      if (!hero || hero.complete || document.readyState === 'complete') return run();
      hero.addEventListener('load', run, { once: true });
      hero.addEventListener('error', run, { once: true });
      window.addEventListener('load', run, { once: true });
    }

    function start() { afterHeroPaint(function () { scan(); }); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
    document.addEventListener('shopify:section:load', function (e) { scan(e.target); });
    // Printing shows the whole page; make sure every photo is there.
    window.addEventListener('beforeprint', function () {
      document.querySelectorAll(SELECTOR).forEach(loadImg);
    });
  })();
}

if (!window.__bpcInit) {
  window.__bpcInit = true;
  (function () {
    function markBpcLoaded(scope) {
      (scope || document).querySelectorAll('.bpc__image').forEach(function (img) {
        if (img.complete && img.naturalWidth > 0) {
          img.classList.add('is-loaded');
          var m = img.closest('.bpc__media');
          if (m) m.classList.add('is-loaded');
        }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { markBpcLoaded(); });
    } else {
      markBpcLoaded();
    }
    document.addEventListener('shopify:section:load', function (e) { markBpcLoaded(e.target); });

    // Carousel photos after the first one ship as data-src/data-srcset (see the card snippet),
    // so only one photo per card downloads with the page. Fill them in the first time a
    // pointer, finger or keyboard reaches the card, just before the section's carousel
    // (hover / dot tap) shows them.
    function hydrateCard(target) {
      var media = target && target.closest && target.closest('.bpc__media, .bpc');
      if (!media) return;
      var card = media.closest('.bpc') || media;
      if (card.dataset.bpcHydrated) return;
      card.dataset.bpcHydrated = '1';
      card.querySelectorAll('img[data-src]').forEach(function (img) {
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
      });
    }
    ['pointerover', 'touchstart', 'focusin'].forEach(function (type) {
      document.addEventListener(type, function (e) { hydrateCard(e.target); }, { passive: true, capture: true });
    });

    var qaSelectedSize = null;
    var qaProductUrl = '';

    // Payment icons for the Buy Now button: copied from one the page already rendered
    // (snippets/balad-pay-icons-stack.liquid), since this fallback popup is built in JS.
    function payIconsHtml() {
      var stack = document.querySelector('.balad-pay-stack');
      return stack ? stack.outerHTML : '';
    }

    function getOrCreateQAModal() {
      var modal = document.querySelector('[data-qa-modal]');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'balad-qa-modal';
        modal.setAttribute('data-qa-modal', '');
        modal.style.display = 'none';
        modal.setAttribute('hidden', '');
        modal.innerHTML = ''
          + '<div class="balad-qa-modal__backdrop" data-qa-close></div>'
          + '<div class="balad-qa-modal__card">'
          + '  <button type="button" class="balad-qa-modal__close" data-qa-close aria-label="Close">'
          + '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
          + '      <line x1="18" y1="6" x2="6" y2="18"></line>'
          + '      <line x1="6" y1="6" x2="18" y2="18"></line>'
          + '    </svg>'
          + '  </button>'
          + '  <div class="balad-qa-modal__header">'
          + '    <div class="balad-qa-modal__product-img" data-qa-img></div>'
          + '    <div class="balad-qa-modal__product-info">'
          + '      <span class="balad-qa-modal__eyebrow">Quick View</span>'
          + '      <h3 class="balad-qa-modal__title" data-qa-title></h3>'
          + '      <div class="balad-qa-modal__price-wrap">'
          + '        <span class="balad-qa-modal__price" data-qa-price></span>'
          + '        <span class="balad-qa-modal__compare-price" data-qa-compare-price></span>'
          + '      </div>'
          + '    </div>'
          + '  </div>'
          + '  <div class="balad-qa-modal__sizes">'
          + '    <div class="balad-qa-modal__sizes-top">'
          + '      <span class="balad-qa-modal__label">Size</span>'
          + '    </div>'
          + '    <div class="balad-qa-modal__size-grid" data-qa-sizes></div>'
          + '  </div>'
          + '  <div class="balad-qa-modal__actions" data-qa-actions>'
          + '    <button type="button" class="balad-qa-modal__btn balad-qa-modal__btn--bag" data-qa-add-bag>Add To Bag</button>'
          + '    <button type="button" class="balad-qa-modal__btn balad-qa-modal__btn--buy" data-qa-buy-now><span class="balad-qa-modal__btn-label">Buy Now</span>' + payIconsHtml() + '</button>'
          + '  </div>'
          + '  <div class="balad-qa-modal__sold-out" data-qa-sold-out style="display:none;">'
          + '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
          + '      <circle cx="12" cy="12" r="10"></circle>'
          + '      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>'
          + '    </svg>'
          + '    <span>Sold Out</span>'
          + '  </div>'
          + '</div>';
        document.body.appendChild(modal);
      }
      bindModalEvents(modal);
      return modal;
    }

    function closeQAModal() {
      var modal = document.querySelector('[data-qa-modal]');
      if (!modal) return;
      modal.classList.remove('is-open');
      setTimeout(function () {
        if (!modal.classList.contains('is-open')) {
          modal.style.display = 'none';
          modal.setAttribute('hidden', '');
        }
      }, 220);
      document.body.style.overflow = '';
    }

    function resolveVariantId(modal) {
      var variantsData = modal && modal.dataset ? modal.dataset.qaVariants : '';
      var firstVariant = modal && modal.dataset ? modal.dataset.qaFirstVariant : '';
      var variantId = '';
      if (variantsData && qaSelectedSize) {
        var pairs = variantsData.split(',');
        for (var i = 0; i < pairs.length; i++) {
          if (!pairs[i]) continue;
          var parts = pairs[i].split(':');
          var name = parts[0];
          var id = parts[1];
          if (name && id && name.trim() === qaSelectedSize.trim()) {
            variantId = id.trim();
            break;
          }
        }
      }
      if (!variantId && firstVariant) variantId = firstVariant;
      return variantId;
    }

    async function addToCartAndRedirect(variantId, shouldRedirect) {
      if (!variantId) return;
      try {
        var cartAddUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root)
          ? window.Shopify.routes.root + 'cart/add.js'
          : '/cart/add.js';
        var res = await fetch(cartAddUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: 1 }] })
        });
        if (!res.ok) throw new Error('Add to cart failed');
        if (shouldRedirect) {
          window.location.href = '/checkout';
          return;
        }
        closeQAModal();
        if (window.pfOpenCart) { window.pfOpenCart('quick-add'); } else { window.location.href = '/cart'; }
      } catch (err) {
        console.error('Add to cart error:', err);
        if (qaProductUrl) window.location.href = qaProductUrl;
      }
    }

    function bindModalEvents(modal) {
      if (!modal || modal.dataset.qaEventsBound === 'true') return;
      modal.dataset.qaEventsBound = 'true';

      modal.querySelectorAll('[data-qa-close]').forEach(function (el) {
        el.addEventListener('click', closeQAModal);
      });

      var bagBtn = modal.querySelector('[data-qa-add-bag]');
      if (bagBtn) {
        bagBtn.addEventListener('click', function () {
          var vId = resolveVariantId(modal);
          if (window.baladBtnLoading) window.baladBtnLoading(bagBtn, true);
          Promise.resolve(addToCartAndRedirect(vId, false)).finally(function () { if (window.baladBtnLoading) window.baladBtnLoading(bagBtn, false); });
        });
      }

      var buyBtn = modal.querySelector('[data-qa-buy-now]');
      if (buyBtn) {
        buyBtn.addEventListener('click', function () {
          var vId = resolveVariantId(modal);
          if (window.baladBtnLoading) window.baladBtnLoading(buyBtn, true);
          addToCartAndRedirect(vId, true);
        });
      }
    }

    function openQAModal(btn) {
      var modal = getOrCreateQAModal();
      if (!modal) return;

      var titleEl = modal.querySelector('[data-qa-title]');
      var priceEl = modal.querySelector('[data-qa-price]');
      var compareEl = modal.querySelector('[data-qa-compare-price]');
      var imgEl = modal.querySelector('[data-qa-img]');
      var sizesEl = modal.querySelector('[data-qa-sizes]');
      var actionsEl = modal.querySelector('[data-qa-actions]');
      var soldOutEl = modal.querySelector('[data-qa-sold-out]');

      var title = btn.dataset.qaTitle || '';
      var price = btn.dataset.qaPrice || '0';
      var comparePrice = btn.dataset.qaComparePrice || '';
      qaProductUrl = btn.dataset.qaUrl || '';
      var image = btn.dataset.qaImage || '';
      var sizesRaw = btn.dataset.qaSizes || '';
      var firstVariant = btn.dataset.qaFirstVariant || '';
      var variantsData = btn.dataset.qaVariants || '';
      var isAvailable = btn.dataset.qaAvailable === 'true';
      var presetSize = btn.dataset.qaSelectedSize || null;

      modal.dataset.qaFirstVariant = firstVariant;
      modal.dataset.qaVariants = variantsData;

      if (titleEl) {
        if (qaProductUrl) {
          titleEl.innerHTML = '<a href="' + qaProductUrl + '" style="color:inherit;text-decoration:none;">' + title.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a>';
        } else {
          titleEl.textContent = title;
        }
      }
      if (priceEl) priceEl.textContent = '₹' + Number(price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      if (compareEl) {
        if (comparePrice && Number(comparePrice) > Number(price)) {
          compareEl.textContent = '₹' + Number(comparePrice).toLocaleString('en-IN', { maximumFractionDigits: 0 });
          compareEl.style.display = 'inline';
        } else {
          compareEl.textContent = '';
          compareEl.style.display = 'none';
        }
      }

      if (imgEl) {
        if (image) {
          imgEl.innerHTML = '<img src="' + image + '" alt="' + title.replace(/"/g, '&quot;') + '" />';
          imgEl.style.display = 'block';
        } else {
          imgEl.innerHTML = '';
          imgEl.style.display = 'none';
        }
      }

      var sizes = sizesRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      qaSelectedSize = presetSize || (sizes.length > 0 ? sizes[0] : null);

      if (sizesEl) {
        if (sizes.length > 0) {
          if (sizesEl.parentElement) sizesEl.parentElement.style.display = 'block';
          sizesEl.innerHTML = sizes.map(function (sz) {
            var isSel = (sz === qaSelectedSize) ? ' is-selected' : '';
            return '<button type="button" class="balad-qa-modal__size' + isSel + '" data-qa-size-btn data-size="' + sz + '">' + sz + '</button>';
          }).join('');

          sizesEl.querySelectorAll('[data-qa-size-btn]').forEach(function (sb) {
            sb.addEventListener('click', function () {
              sizesEl.querySelectorAll('[data-qa-size-btn]').forEach(function (b) { b.classList.remove('is-selected'); });
              sb.classList.add('is-selected');
              qaSelectedSize = sb.dataset.size;
            });
          });
        } else {
          if (sizesEl.parentElement) sizesEl.parentElement.style.display = 'none';
        }
      }

      if (!isAvailable) {
        if (actionsEl) actionsEl.style.display = 'none';
        if (soldOutEl) soldOutEl.style.display = 'flex';
      } else {
        if (actionsEl) actionsEl.style.display = 'grid';
        if (soldOutEl) soldOutEl.style.display = 'none';
      }

      modal.style.display = 'flex';
      modal.removeAttribute('hidden');
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
    }

    window.__openBaladQAModal = openQAModal;

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quick-add]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openQAModal(btn);
    });
  })();
}

/* Spinner for Quick View / card buttons: window.baladBtnLoading(btn, true|false).
   Shows a progress circle in place of the label (CSS: .balad-btn-loading in balad-modals.css).
   Used by every section's Quick View handlers instead of writing "Adding..." into the button,
   which also wiped out the payment icons inside Buy Now. */
if (!window.baladBtnLoading) {
  window.baladBtnLoading = function (btn, on) {
    if (!btn) return;
    clearTimeout(btn.__baladLoadingTimer);
    btn.classList.toggle('balad-btn-loading', !!on);
    btn.disabled = !!on;
    if (on) {
      btn.setAttribute('aria-busy', 'true');
      // Never leave a button spinning if a request hangs or a handler bails out early
      btn.__baladLoadingTimer = setTimeout(function () { window.baladBtnLoading(btn, false); }, 15000);
    } else {
      btn.removeAttribute('aria-busy');
    }
  };
  // Back from checkout restores the page from the back/forward cache with Buy Now still spinning
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('.balad-btn-loading').forEach(function (b) { window.baladBtnLoading(b, false); });
  });
}

/* "1299.00" → "₹1,299" for the popups (same format as the product cards). Falls back to the raw value. */
if (!window.baladMoney) {
  window.baladMoney = function (value) {
    var n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
    if (!isFinite(n) || String(value).trim() === '') return String(value == null ? '' : value);
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };
}

/* Wishlist popup "Add To List": show the progress circle for a moment before saving.
   Every section ships its own wishlist handler and saving is instant (localStorage), so this listener
   (window, capture phase: runs before any of them) holds the tap, spins, then replays the click
   with a pass flag so the section's own handler saves and closes as before. */
if (!window.__baladWishlistSpin) {
  window.__baladWishlistSpin = true;
  window.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.balad-wishlist-modal__add-btn');
    if (!btn || btn.__baladPass || !window.baladBtnLoading) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (btn.classList.contains('balad-btn-loading')) return;
    window.baladBtnLoading(btn, true);
    setTimeout(function () {
      window.baladBtnLoading(btn, false);
      btn.__baladPass = true;
      try { btn.click(); } finally { btn.__baladPass = false; }
    }, 450);
  }, true);
}
