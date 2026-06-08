(() => {
  const REVEAL_SELECTOR = '.sec-head, .ben, .off, .data-stat, .step';
  const STAGGER_GROUPS = [
    { parent: '.ben-grid', child: '.ben' },
    { parent: '.off-grid', child: '.off' },
    { parent: '.data-grid', child: '.data-stat' },
    { parent: '.steps', child: '.step' },
  ];
  const STAGGER_MS = 90;
  const SAFETY_MS = 4000;
  const VIEW_OFFSET = 0.08;

  let revealItems = [];
  let revealed = false;
  let observer = null;
  let scrollListener = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function revealElement(el) {
    if (el.classList.contains('is-revealed')) return;
    el.classList.add('is-revealed');
  }

  function cleanup() {
    if (observer) observer.disconnect();
    if (scrollListener) {
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('resize', scrollListener);
      scrollListener = null;
    }
  }

  function revealAll() {
    if (revealed) return;
    revealed = true;
    revealItems.forEach(revealElement);
    cleanup();
  }

  function isInView(el) {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.top <= vh * (1 - VIEW_OFFSET) && rect.bottom >= 0;
  }

  function checkScrollFallback() {
    if (revealed) return;

    revealItems.forEach((el) => {
      if (!el.classList.contains('is-revealed') && isInView(el)) {
        revealElement(el);
      }
    });

    if (!revealItems.some((el) => !el.classList.contains('is-revealed'))) {
      cleanup();
    }
  }

  function bindScrollChecks() {
    if (scrollListener) return;
    scrollListener = () => requestAnimationFrame(checkScrollFallback);
    window.addEventListener('scroll', scrollListener, { passive: true });
    window.addEventListener('resize', scrollListener, { passive: true });
    checkScrollFallback();
  }

  function applyStaggerDelays() {
    STAGGER_GROUPS.forEach(({ parent, child }) => {
      document.querySelectorAll(parent).forEach((grid) => {
        grid.querySelectorAll(child).forEach((item, index) => {
          item.style.setProperty('--reveal-delay', `${index * STAGGER_MS}ms`);
        });
      });
    });
  }

  function setupRevealItems() {
    const seen = new Set();
    revealItems = [];

    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      revealItems.push(el);
    });
  }

  function initObserver() {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    revealItems.forEach((el) => {
      if (!el.classList.contains('is-revealed')) {
        observer.observe(el);
      }
    });
  }

  function init() {
    setupRevealItems();
    if (!revealItems.length) return;

    applyStaggerDelays();

    if (prefersReducedMotion()) {
      revealAll();
      return;
    }

    revealItems.forEach((el) => el.classList.add('reveal-pending'));

    // Double rAF so the browser paints the hidden state before revealing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        revealItems.forEach((el) => {
          if (isInView(el)) revealElement(el);
        });

        if ('IntersectionObserver' in window) {
          initObserver();
        }

        bindScrollChecks();
      });
    });

    window.setTimeout(revealAll, SAFETY_MS);
    window.addEventListener('beforeprint', revealAll);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
