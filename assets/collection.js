const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealOnScroll() {
  const items = document.querySelectorAll('[data-pop-reveal], .pop-reveal');
  if (!items.length) return;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
  );

  items.forEach((item) => observer.observe(item));
}

function setupFilters() {
  const toggle = document.querySelector('[data-pop-filter-toggle]');
  const panel = document.querySelector('[data-pop-filter-panel]');
  const closeBtn = document.querySelector('[data-pop-filter-close]');

  if (!toggle || !panel) return;

  const closePanel = () => {
    panel.hidden = true;
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    panel.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
  }

  panel.addEventListener('click', (e) => {
    if (e.target === panel) closePanel();
  });
}

function getVariants(card) {
  try {
    return JSON.parse(card.dataset.productVariants || '[]');
  } catch {
    return [];
  }
}

function renderMoney(cents) {
  const amount = Number(cents || 0) / 100;
  return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setupVariantControls() {
  document.querySelectorAll('[data-pop-card]').forEach((card) => {
    const variants = getVariants(card);
    if (!variants.length) return;

    const groups = [...card.querySelectorAll('[data-option-group]')];
    const variantIdInput = card.querySelector('input[name="id"]');
    const priceNode = card.querySelector('[data-pop-price]');
    const compareNode = card.querySelector('[data-pop-compare]');
    const addButton = card.querySelector('[ref="addToCartButton"]');
    const hoverCard = card.querySelector('[data-pop-variant-controls]');

    const selected = {};

    const findVariant = () =>
      variants.find((variant) => {
        return groups.every((group) => {
          const position = Number(group.dataset.optionPosition) - 1;
          return String(variant.options?.[position] || '') === String(selected[position] || '');
        });
      });

    const updateCard = () => {
      const variant = findVariant() || variants.find((item) => item.available) || variants[0];
      if (!variant) return;
      if (variantIdInput) variantIdInput.value = variant.id;
      if (priceNode) priceNode.textContent = renderMoney(variant.price);
      if (compareNode) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          compareNode.textContent = renderMoney(variant.compare_at_price);
          compareNode.hidden = false;
        } else {
          compareNode.hidden = true;
        }
      }
      if (addButton) {
        addButton.disabled = !variant.available;
        addButton.setAttribute('aria-disabled', variant.available ? 'false' : 'true');
      }
    };

    groups.forEach((group) => {
      const position = Number(group.dataset.optionPosition) - 1;
      const buttons = [...group.querySelectorAll('[data-option-value]')];
      if (!buttons.length) return;

      selected[position] = buttons[0].dataset.optionValue;
      buttons[0].setAttribute('aria-pressed', 'true');

      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          selected[position] = button.dataset.optionValue;
          buttons.forEach((item) => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
          updateCard();
        });
      });
    });

    if (hoverCard) hoverCard.addEventListener('pointerleave', updateCard);
    updateCard();
  });
}

function setupGridToggle() {
  const gridButtons = document.querySelectorAll('.pop-collection__toolbar-icons button');
  const collectionWrapper = document.querySelector('.pop-collection');

  if (!gridButtons.length || !collectionWrapper) return;

  gridButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      gridButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (index === 0) {
        collectionWrapper.classList.add('pop-collection--grid-compact');
      } else {
        collectionWrapper.classList.remove('pop-collection--grid-compact');
      }
    });
  });
}

function initCollectionJS() {
  revealOnScroll();
  setupFilters();
  setupVariantControls();
  setupGridToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionJS);
} else {
  initCollectionJS();
}
