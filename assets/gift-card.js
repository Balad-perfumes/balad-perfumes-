const rootSelector = '[data-gift-card-page]';

const showToast = (root, message) => {
  const toast = root.querySelector('[data-toast]');
  const text = root.querySelector('[data-toast-message]');
  if (!toast || !text) return;

  text.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');

  window.clearTimeout(toast.__timeoutId);
  toast.__timeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, 2800);
};

document.querySelectorAll(rootSelector).forEach((root) => {
  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  const mainImage = root.querySelector('.pf-gift-card__main-image');
  const thumbs = Array.from(root.querySelectorAll('.pf-gift-card__thumb'));
  const amountLabels = Array.from(root.querySelectorAll('.pf-gift-card__amount'));
  const formComponent = root.querySelector('.pf-gift-card__form-component');
  const submitButton = root.querySelector('.pf-gift-card__button');
  const productId = root.dataset.productId;

  const setLoading = (isLoading) => {
    root.dataset.loading = isLoading ? 'true' : 'false';
    if (submitButton instanceof HTMLElement) {
      submitButton.classList.toggle('is-loading', isLoading);
      submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
  };

  const syncActiveAmount = (radio) => {
    amountLabels.forEach((label) => {
      const input = label.querySelector('input[type="radio"]');
      label.classList.toggle('is-active', input === radio);
    });
  };

  amountLabels.forEach((label) => {
    const radio = label.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.addEventListener('change', () => syncActiveAmount(radio));
    label.addEventListener('click', () => {
      radio.checked = true;
      syncActiveAmount(radio);
    });
  });

  submitButton?.addEventListener('click', () => setLoading(true));

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const fullImage = thumb.dataset.fullImage;
      const fullAlt = thumb.dataset.fullAlt || '';
      if (mainImage && fullImage) {
        mainImage.src = fullImage;
        mainImage.alt = fullAlt;
      }

      thumbs.forEach((item) => item.classList.toggle('is-active', item === thumb));
    });
  });

  formComponent?.addEventListener('submit', () => setLoading(true));

  document.addEventListener('cart:update', (event) => {
    const detail = event.detail || {};
    if (productId && detail?.data?.productId && String(detail.data.productId) !== String(productId)) return;
    if (detail?.data?.source !== 'product-form-component' && detail?.data?.didError !== true) return;

    setLoading(false);

    if (detail?.data?.didError) {
      showToast(root, 'Something went wrong. Please try again.');
      return;
    }

    showToast(root, 'Gift card added to cart.');
  });

  document.addEventListener('cart:error', (event) => {
    const detail = event.detail || {};
    if (detail?.sourceId && formComponent?.querySelector('form')?.id && String(detail.sourceId) !== String(formComponent.querySelector('form').id)) return;

    setLoading(false);
    showToast(root, 'Please check the recipient details and try again.');
  });
});
