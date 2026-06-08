const NEWSLETTER_ENDPOINT = 'https://formspree.io/f/mvznaayk';
const NEWSLETTER_SUB_KEY = 'spiro_newsletter_subscribed';
const EXIT_POPUP_DISMISS_KEY = 'spiro_exit_popup_dismissed_v2';
const EXIT_POPUP_MIN_MS = 8000;
const EXIT_POPUP_DISMISS_DAYS = 7;

function trackEvent(name, params = {}) {
  if (typeof gtag === 'function') {
    gtag('event', name, params);
  }
}

function markNewsletterSubscribed() {
  localStorage.setItem(NEWSLETTER_SUB_KEY, '1');
}

function hasNewsletterSubscribed() {
  return localStorage.getItem(NEWSLETTER_SUB_KEY) === '1';
}

function isExitPopupDismissed() {
  const dismissedAt = Number(localStorage.getItem(EXIT_POPUP_DISMISS_KEY));
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < EXIT_POPUP_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function markExitPopupDismissed() {
  localStorage.setItem(EXIT_POPUP_DISMISS_KEY, String(Date.now()));
}

async function submitNewsletter(email, source) {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('_replyto', email);
  formData.append('_subject', 'Newsletter signup from bespiro.com');
  formData.append('source', source);

  const response = await fetch(NEWSLETTER_ENDPOINT, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('Newsletter submission failed');
}

function getButtonLocation(el) {
  if (el.closest('.hero-cta')) return 'hero';
  if (el.closest('.nav-cta')) return 'nav';
  if (el.closest('#contactForm')) return 'contact_form';
  if (el.closest('#newsletterForm')) return 'newsletter';
  if (el.closest('#exitPopup')) return 'exit_popup';
  if (el.closest('footer')) return 'footer';
  return 'other';
}

function getButtonLabel(el) {
  const i18nEl = el.matches('[data-i18n]') ? el : el.querySelector('[data-i18n]');
  if (i18nEl) return i18nEl.getAttribute('data-i18n');
  if (el.type === 'submit') return 'form.submit';
  return el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
}

function initExitPopup() {
  const popup = document.getElementById('exitPopup');
  const backdrop = document.getElementById('exitPopupBackdrop');
  const closeBtn = document.getElementById('exitPopupClose');
  const dismissBtn = document.getElementById('exitPopupDismiss');
  const popupForm = document.getElementById('exitPopupForm');
  const popupError = document.getElementById('exitPopupError');
  const popupDone = document.getElementById('exitPopupDone');
  const popupSubmitBtn = popupForm.querySelector('[type="submit"]');
  const popupEmail = document.getElementById('exitPopupEmail');

  let popupShown = false;
  let popupEligible = false;
  let hasScrolledDeep = false;
  const pageLoadedAt = Date.now();

  const canShowPopup = () => (
    !popupShown &&
    popupEligible &&
    !hasNewsletterSubscribed() &&
    !isExitPopupDismissed() &&
    Date.now() - pageLoadedAt >= EXIT_POPUP_MIN_MS
  );

  const openPopup = () => {
    if (!canShowPopup()) return;

    popupShown = true;
    popup.hidden = false;
    popup.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => popup.classList.add('is-open'));
    document.body.classList.add('exit-popup-open');
    popupEmail.focus();

    trackEvent('newsletter_popup_view', {
      page_language: document.documentElement.lang,
    });
  };

  const closePopup = (dismissed = false) => {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('exit-popup-open');

    if (dismissed) markExitPopupDismissed();

    window.setTimeout(() => {
      if (!popup.classList.contains('is-open')) popup.hidden = true;
    }, 280);
  };

  const isExitIntent = (e) => {
    if (e.clientY > 12) return false;
    const target = e.relatedTarget || e.toElement;
    return !target || target === document.documentElement || target.nodeName === 'HTML';
  };

  document.documentElement.addEventListener('mouseleave', (e) => {
    if (isExitIntent(e)) openPopup();
  });

  document.addEventListener('mouseout', (e) => {
    if (isExitIntent(e)) openPopup();
  });

  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const scrollDepth = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollDepth / pageHeight > 0.25) hasScrolledDeep = true;

    const scrollingUp = currentScrollY < lastScrollY - 40;
    const nearTop = currentScrollY < 160;
    const isMobile = window.matchMedia('(max-width: 860px)').matches;

    if (isMobile && hasScrolledDeep && scrollingUp && nearTop) openPopup();

    if (!isMobile && hasScrolledDeep && scrollingUp && nearTop) openPopup();

    lastScrollY = currentScrollY;
  }, { passive: true });

  window.setTimeout(() => {
    popupEligible = true;
  }, EXIT_POPUP_MIN_MS);

  closeBtn.addEventListener('click', () => closePopup(false));
  dismissBtn.addEventListener('click', () => closePopup(true));
  backdrop.addEventListener('click', () => closePopup(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) closePopup(false);
  });

  popupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!popupForm.checkValidity()) {
      popupForm.reportValidity();
      return;
    }

    popupError.classList.add('hidden');
    popupDone.classList.add('hidden');
    popupSubmitBtn.disabled = true;

    const email = popupEmail.value;

    try {
      await submitNewsletter(email, 'exit_popup');
      markNewsletterSubscribed();

      trackEvent('generate_lead', {
        form_name: 'newsletter',
        source: 'exit_popup',
        page_language: document.documentElement.lang,
      });

      popupForm.classList.add('is-done');
      popupDone.classList.remove('hidden');
      dismissBtn.classList.add('hidden');

      window.setTimeout(() => closePopup(false), 2200);
    } catch {
      trackEvent('form_submit_error', {
        form_name: 'newsletter',
        source: 'exit_popup',
        page_language: document.documentElement.lang,
      });
      popupError.classList.remove('hidden');
      popupSubmitBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const form = document.getElementById('contactForm');
  const done = document.getElementById('formDone');
  const formError = document.getElementById('formError');
  const submitBtn = form.querySelector('[type="submit"]');
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterError = document.getElementById('newsletterError');
  const newsletterDone = document.getElementById('newsletterDone');
  const newsletterSubmitBtn = newsletterForm.querySelector('[type="submit"]');

  initExitPopup();

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
    const wantsNewsletter = formData.get('newsletter') === 'yes';
    const email = formData.get('email');
    formData.delete('newsletter');
    formData.append('_replyto', email);
    formData.append('_subject', 'New enquiry from bespiro.com');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) throw new Error('Form submission failed');

      if (wantsNewsletter) {
        try {
          await submitNewsletter(email, 'contact_form');
          markNewsletterSubscribed();
          trackEvent('generate_lead', {
            form_name: 'newsletter',
            source: 'contact_form',
            page_language: document.documentElement.lang,
          });
        } catch {
          trackEvent('form_submit_error', {
            form_name: 'newsletter',
            source: 'contact_form',
            page_language: document.documentElement.lang,
          });
        }
      }

      trackEvent('generate_lead', {
        form_name: 'contact',
        team_size: formData.get('teamSize'),
        newsletter_opt_in: wantsNewsletter,
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

  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!newsletterForm.checkValidity()) {
      newsletterForm.reportValidity();
      return;
    }

    newsletterError.classList.add('hidden');
    newsletterDone.classList.add('hidden');
    newsletterSubmitBtn.disabled = true;

    const email = newsletterForm.querySelector('[name="email"]').value;

    try {
      await submitNewsletter(email, 'newsletter_section');
      markNewsletterSubscribed();

      trackEvent('generate_lead', {
        form_name: 'newsletter',
        source: 'newsletter_section',
        page_language: document.documentElement.lang,
      });

      newsletterForm.classList.add('is-done');
      newsletterDone.classList.remove('hidden');
    } catch {
      trackEvent('form_submit_error', {
        form_name: 'newsletter',
        page_language: document.documentElement.lang,
      });
      newsletterError.classList.remove('hidden');
      newsletterSubmitBtn.disabled = false;
    }
  });
});
