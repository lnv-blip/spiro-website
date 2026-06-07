function trackEvent(name, params = {}) {
  if (typeof gtag === 'function') {
    gtag('event', name, params);
  }
}

function getButtonLocation(el) {
  if (el.closest('.hero-cta')) return 'hero';
  if (el.closest('.nav-cta')) return 'nav';
  if (el.closest('#contactForm')) return 'contact_form';
  if (el.closest('footer')) return 'footer';
  return 'other';
}

function getButtonLabel(el) {
  const i18nEl = el.matches('[data-i18n]') ? el : el.querySelector('[data-i18n]');
  if (i18nEl) return i18nEl.getAttribute('data-i18n');
  if (el.type === 'submit') return 'form.submit';
  return el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const form = document.getElementById('contactForm');
  const done = document.getElementById('formDone');
  const formError = document.getElementById('formError');
  const submitBtn = form.querySelector('[type="submit"]');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('a.btn, button.btn, a[data-i18n="nav.cta"]');
    if (!btn || btn.classList.contains('lang-btn')) return;

    trackEvent('cta_click', {
      button_location: getButtonLocation(btn),
      button_label: getButtonLabel(btn),
      link_url: btn.getAttribute('href') || undefined,
      page_language: document.documentElement.lang,
    });
  });

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setNavOpen = (isOpen) => {
    navMenu.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
  };

  navToggle.addEventListener('click', () => {
    setNavOpen(!navMenu.classList.contains('open'));
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      setNavOpen(false);
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setNavOpen(false);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    formError.classList.add('hidden');
    submitBtn.disabled = true;

    const formData = new FormData(form);
    formData.append('_replyto', formData.get('email'));
    formData.append('_subject', 'New enquiry from bespiro.com');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error('Form submission failed');

      trackEvent('generate_lead', {
        form_name: 'contact',
        team_size: formData.get('teamSize'),
        page_language: document.documentElement.lang,
      });

      form.classList.add('hide');
      done.classList.remove('hidden');
    } catch {
      trackEvent('form_submit_error', {
        form_name: 'contact',
        page_language: document.documentElement.lang,
      });
      formError.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  });
});
