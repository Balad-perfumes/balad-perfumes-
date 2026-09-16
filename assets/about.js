const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealOnScroll() {
  const items = document.querySelectorAll('[data-about-reveal], .about-reveal-item');

  if (!items.length) return;

  if (reducedMotion || !('IntersectionObserver' in window) || (window.Shopify && window.Shopify.designMode)) {
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
    {
      threshold: 0.05,
      rootMargin: '50px 0px 0px 0px',
    }
  );

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      item.classList.add('is-visible');
    } else {
      observer.observe(item);
    }
  });
}

function parallaxOnScroll() {
  if (reducedMotion) return;

  const scenes = [...document.querySelectorAll('[data-about-parallax]')];
  if (!scenes.length) return;

  let ticking = false;

  const update = () => {
    const viewportHeight = window.innerHeight;

    scenes.forEach((scene) => {
      const strength = Number(scene.style.getPropertyValue('--about-parallax-strength')) || 0.12;
      const media = scene.querySelector('.about-hero__image, .about-image-banner__image');
      if (!media) return;

      const rect = scene.getBoundingClientRect();
      const progress = (viewportHeight - rect.top) / viewportHeight;
      const translateY = Math.max(-24, Math.min(120, progress * strength * 260));
      media.style.setProperty('--about-parallax-offset', `${translateY}px`);
    });

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function quoteWordHighlight() {
  const sections = [...document.querySelectorAll('.about-quote-banner [data-quote-words]')];
  if (!sections.length) return;

  const setActiveCount = (container, count) => {
    const words = [...container.querySelectorAll('[data-quote-word]')];
    const safeCount = Math.max(0, Math.min(count, words.length));

    words.forEach((word, index) => {
      word.classList.toggle('is-highlight', index < safeCount);
      word.classList.toggle('is-active', index === safeCount - 1 || (safeCount === words.length && index === words.length - 1));
    });
  };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    sections.forEach((section) => setActiveCount(section, section.querySelectorAll('[data-quote-word]').length));
    return;
  }

  const update = (container) => {
    const section = container.closest('.about-quote-banner');
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const progress = 1 - Math.min(1, Math.max(0, rect.bottom / (viewport + rect.height)));
    const words = container.querySelectorAll('[data-quote-word]');
    const count = Math.ceil(progress * words.length);
    setActiveCount(container, count);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      sections.forEach(update);
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

function statsCounterAnimation() {
  const counters = document.querySelectorAll('.about-stats__counter[data-stat-value]');
  if (!counters.length) return;

  if (reducedMotion || !('IntersectionObserver' in window)) {
    return;
  }

  const parseStat = (str) => {
    const raw = String(str || '').trim();
    const match = raw.match(/^([^0-9.]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
    if (!match) return null;
    return {
      prefix: match[1] || '',
      target: parseFloat(match[2]),
      isDecimal: match[2].includes('.'),
      suffix: match[3] || '',
    };
  };

  const animateCounter = (el) => {
    const parsed = parseStat(el.getAttribute('data-stat-value'));
    if (!parsed || isNaN(parsed.target)) return;

    const duration = 1400;
    const startTime = performance.now();

    const updateCount = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = parsed.target * ease;
      const formatted = parsed.isDecimal
        ? currentVal.toFixed(1)
        : Math.floor(currentVal).toString();

      el.textContent = `${parsed.prefix}${formatted}${parsed.suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(updateCount);
      } else {
        el.textContent = el.getAttribute('data-stat-value');
      }
    };

    window.requestAnimationFrame(updateCount);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.25, rootMargin: '0px 0px -5% 0px' }
  );

  counters.forEach((el) => observer.observe(el));
}

function initAboutScripts() {
  revealOnScroll();
  parallaxOnScroll();
  quoteWordHighlight();
  statsCounterAnimation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAboutScripts);
} else {
  initAboutScripts();
}

// Support Shopify Theme Editor / Admin live updates
document.addEventListener('shopify:section:load', (event) => {
  initAboutScripts();
  if (event.target) {
    event.target.querySelectorAll('[data-about-reveal], .about-reveal-item').forEach((el) => {
      el.classList.add('is-visible');
    });
  }
});

document.addEventListener('shopify:section:select', (event) => {
  if (event.target) {
    event.target.querySelectorAll('[data-about-reveal], .about-reveal-item').forEach((el) => {
      el.classList.add('is-visible');
    });
  }
});

