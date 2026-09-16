// @ts-check
class WishlistIcon extends HTMLElement {
  constructor() {
    super();
    /** @type {EventListener} */
    this._onUpdate = this.updateBubble.bind(this);
  }

  connectedCallback() {
    document.addEventListener('wishlist:update', this._onUpdate);
    this.updateBubble();
  }

  disconnectedCallback() {
    document.removeEventListener('wishlist:update', this._onUpdate);
  }

  updateBubble() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const count = wishlist.length;
    const bubble = /** @type {HTMLElement | null} */ (this.querySelector('[data-wishlist-bubble]'));
    const countEl = this.querySelector('[data-wishlist-count]');
    if (countEl) countEl.textContent = String(count);
    if (bubble) {
      bubble.style.display = count === 0 ? 'none' : '';
    }
  }
}

if (!customElements.get('wishlist-icon')) {
  customElements.define('wishlist-icon', WishlistIcon);
}

class WishlistPage extends HTMLElement {
  constructor() {
    super();
    /** @type {EventListener} */
    this._onUpdate = this.render.bind(this);
  }

  connectedCallback() {
    this.render();
    document.addEventListener('wishlist:update', this._onUpdate);
  }

  disconnectedCallback() {
    document.removeEventListener('wishlist:update', this._onUpdate);
  }

  render() {
    const grid = this.querySelector('[data-wishlist-grid]');
    const emptyHide = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-wishlist-empty-hide]'));
    const emptyShow = /** @type {HTMLElement | null} */ (this.querySelector('[data-wishlist-empty-show]'));

    if (!grid) return;

    /** @type {Array<{handle: string, id?: string, title: string, image?: string, price?: string, size?: string}>} */
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    if (wishlist.length === 0) {
      grid.innerHTML = '';
      if (emptyShow) emptyShow.style.display = '';
      emptyHide.forEach(el => { el.style.display = 'none'; });
      return;
    }

    if (emptyShow) emptyShow.style.display = 'none';
    emptyHide.forEach(el => { el.style.display = ''; });

    grid.innerHTML = wishlist.map(item => {
      const safeTitle = (item.title || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const imgSrc = item.image || '';
      const sizeParam = item.size && item.size !== 'Default' ? `?size=${encodeURIComponent(item.size)}` : '';
      const productUrl = `/products/${item.handle}${sizeParam}`;
      return `
        <article class="wl-card">
          <div class="wl-card__media-wrap">
            <a class="wl-card__media-link" href="${productUrl}">
              ${imgSrc ? `<img class="wl-card__img" src="${imgSrc}" alt="${safeTitle}" loading="lazy">` : ''}
            </a>
            <button
              class="wl-card__remove"
              type="button"
              aria-label="Remove from wishlist"
              aria-pressed="true"
              data-wishlist-button
              data-product-handle="${item.handle}"
              data-product-id="${item.id || ''}"
              data-product-title="${safeTitle}"
              data-product-image="${imgSrc}"
              data-product-price="${item.price || ''}"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div class="wl-card__body">
            <a class="wl-card__title" href="${productUrl}">${safeTitle}</a>
            <div class="wl-card__price">${item.price || ''}</div>
            ${item.size ? `<div class="wl-card__size">Size: ${item.size}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }
}

if (!customElements.get('wishlist-page')) {
  customElements.define('wishlist-page', WishlistPage);
}

/* ── Sync aria-pressed on all wishlist buttons ── */
function syncWishlistButtons() {
  /** @type {Array<{handle: string}>} */
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const handles = new Set(wishlist.map(i => i.handle));

  const buttons = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('[data-wishlist-button], [data-pf-wishlist]'));
  buttons.forEach(btn => {
    const handle = btn.dataset.productHandle;
    if (!handle) return;
    const inList = handles.has(handle);
    btn.setAttribute('aria-pressed', inList ? 'true' : 'false');
    btn.setAttribute('aria-label', inList ? 'Remove from wishlist' : 'Add to wishlist');
    if (btn.hasAttribute('title')) {
      btn.setAttribute('title', inList ? 'Remove from wishlist' : 'Add to wishlist');
    }
  });
}

/* ── Global click handler ── */
document.addEventListener('click', e => {
  const target = /** @type {Element | null} */ (e.target);
  if (!target) return;

  // Handle direct remove button
  const removeBtn = /** @type {HTMLElement | null} */ (target.closest('[data-wishlist-remove]'));
  if (removeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const handle = removeBtn.dataset.wishlistRemove;
    if (handle) {
      /** @type {Array<{handle: string}>} */
      let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      wishlist = wishlist.filter(item => item.handle !== handle);
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      document.dispatchEvent(new CustomEvent('wishlist:update'));
    }
    return;
  }

  const btn = /** @type {HTMLElement | null} */ (target.closest('[data-wishlist-button], [data-pf-wishlist]'));
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const handle = btn.dataset.productHandle;
  if (!handle) return;

  /** @type {Array<{handle: string, id?: string, variantId?: string, title?: string, image?: string, price?: string, size?: string}>} */
  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const idx = wishlist.findIndex(i => i.handle === handle);

  if (idx > -1) {
    wishlist.splice(idx, 1);
    /* Immediate visual feedback — remove */
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Add to wishlist');
  } else {
    let selectedSize = btn.dataset.productSize || '';
    if (!selectedSize) {
      const activePill = /** @type {HTMLElement | null} */ (document.querySelector('[data-pf-size-pill].is-active, [data-pf-size-pill].is-selected, .pf-buybox__size-pill.is-active, .pf-buybox__size-pill.is-selected'));
      if (activePill) {
        selectedSize = (activePill.dataset.pfSizePill || activePill.textContent || '').trim();
      }
    }

    wishlist.push({
      handle,
      id: btn.dataset.productId || '',
      variantId: btn.dataset.productVariantId || '',
      title: btn.dataset.productTitle || '',
      image: btn.dataset.productImage || '',
      price: btn.dataset.productPrice || '',
      size: selectedSize
    });
    /* Immediate visual feedback — add */
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Remove from wishlist');
  }

  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  document.dispatchEvent(new CustomEvent('wishlist:update'));
}, true /* capture — ensures it fires before any other handler */);

/* Helper to clear all wishlist items */
window.clearWishlist = function() {
  localStorage.setItem('wishlist', '[]');
  document.dispatchEvent(new CustomEvent('wishlist:update'));
};

/* Helper to remove single item */
window.removeFromWishlist = function(handle) {
  if (!handle) return;
  /** @type {Array<{handle: string}>} */
  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  wishlist = wishlist.filter(item => item.handle !== handle);
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  document.dispatchEvent(new CustomEvent('wishlist:update'));
};

/* ── Boot ── */
function boot() {
  syncWishlistButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
window.addEventListener('pageshow', boot);
document.addEventListener('shopify:section:load', syncWishlistButtons);
document.addEventListener('wishlist:update', syncWishlistButtons);

/* ── Watch for newly injected buttons (quick-add, infinite scroll) ── */
function initObserver() {
  /** @type {any} */
  let debounceTimer;
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i];
        if (!node || node.nodeType !== 1) continue;
        const el = /** @type {Element} */ (node);
        if (el.matches?.('[data-wishlist-button],[data-pf-wishlist]') ||
            el.querySelector?.('[data-wishlist-button],[data-pf-wishlist]')) {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(syncWishlistButtons, 80);
          return;
        }
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(initObserver);
} else {
  window.addEventListener('load', initObserver);
}
