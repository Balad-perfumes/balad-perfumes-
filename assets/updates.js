/**
 * Stag Men Fashion - Updates Interactive Category Filtering
 */
(function () {
  'use strict';

  function initUpdatesFilters() {
    const filterButtons = document.querySelectorAll('.updates-filter-btn');
    const cards = document.querySelectorAll('.updates-card');
    const spotlightCard = document.querySelector('.updates-spotlight__card');
    const counterEl = document.querySelector('.updates-feed__counter');

    if (!filterButtons.length) return;

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category');

        // Update active class on buttons
        filterButtons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        let visibleCount = 0;

        // Filter spotlight card if it exists
        if (spotlightCard) {
          const spotlightTag = (spotlightCard.getAttribute('data-category') || '').toLowerCase();
          if (category === 'all' || spotlightTag.includes(category.toLowerCase())) {
            spotlightCard.closest('.updates-spotlight').style.display = '';
          } else {
            spotlightCard.closest('.updates-spotlight').style.display = 'none';
          }
        }

        // Filter standard cards
        cards.forEach((card) => {
          const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
          const cardTags = (card.getAttribute('data-tags') || '').toLowerCase();

          if (
            category === 'all' ||
            cardCategory.includes(category.toLowerCase()) ||
            cardTags.includes(category.toLowerCase())
          ) {
            card.style.display = '';
            card.style.animation = 'updates-fade-in 0.35s ease forwards';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        // Update counter
        if (counterEl) {
          counterEl.textContent = `Showing ${visibleCount} update${visibleCount === 1 ? '' : 's'}`;
        }
      });
    });
  }

  // Inject fade-in keyframes dynamically if not present
  if (!document.getElementById('updates-keyframes')) {
    const style = document.createElement('style');
    style.id = 'updates-keyframes';
    style.textContent = `
      @keyframes updates-fade-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUpdatesFilters);
  } else {
    initUpdatesFilters();
  }

  // Support Shopify theme editor reloads
  document.addEventListener('shopify:section:load', initUpdatesFilters);
})();
