(() => {
  const GA_ID = 'G-YC8G8TRVKV';
  const STORAGE_KEY = 'spiro-cookie-consent';

  const STRINGS = {
    en: {
      text: 'We use cookies to analyse traffic and improve your experience.',
      accept: 'Accept',
      reject: 'Reject',
      policy: 'Cookie Policy',
    },
    es: {
      text: 'Usamos cookies para analizar el tráfico y mejorar tu experiencia.',
      accept: 'Aceptar',
      reject: 'Rechazar',
      policy: 'Política de cookies',
    },
    ca: {
      text: 'Utilitzem galetes per analitzar el trànsit i millorar la teva experiència.',
      accept: 'Acceptar',
      reject: 'Rebutjar',
      policy: 'Política de galetes',
    },
  };

  function getLang() {
    const stored = localStorage.getItem('spiro-lang');
    const docLang = (document.documentElement.lang || '').slice(0, 2);
    const navLang = (navigator.language || 'en').slice(0, 2);
    const lang = stored || docLang || navLang;
    return STRINGS[lang] ? lang : 'en';
  }

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* storage unavailable */
    }
  }

  function loadAnalytics() {
    if (window.__spiroGALoaded) return;
    window.__spiroGALoaded = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  let bannerEl = null;

  function removeBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-visible');
    const el = bannerEl;
    bannerEl = null;
    setTimeout(() => el.remove(), 300);
  }

  function buildBanner() {
    const t = STRINGS[getLang()];

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', t.policy);

    const inner = document.createElement('div');
    inner.className = 'cookie-banner-inner';

    const icon = document.createElement('span');
    icon.className = 'cookie-banner-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🍪';

    const text = document.createElement('p');
    text.className = 'cookie-banner-text';
    text.textContent = t.text + ' ';

    const link = document.createElement('a');
    link.href = '/cookie-policy.html';
    link.textContent = t.policy;
    text.appendChild(link);

    const actions = document.createElement('div');
    actions.className = 'cookie-banner-actions';

    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'cookie-btn cookie-btn-reject';
    reject.textContent = t.reject;
    reject.addEventListener('click', () => {
      setConsent('denied');
      removeBanner();
    });

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'cookie-btn cookie-btn-accept';
    accept.textContent = t.accept;
    accept.addEventListener('click', () => {
      setConsent('granted');
      loadAnalytics();
      removeBanner();
    });

    actions.appendChild(reject);
    actions.appendChild(accept);
    inner.appendChild(icon);
    inner.appendChild(text);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    bannerEl = banner;

    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }

  function openSettings() {
    if (!bannerEl) buildBanner();
  }

  window.spiroCookieSettings = openSettings;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-cookie-settings]');
    if (trigger) {
      e.preventDefault();
      openSettings();
    }
  });

  function init() {
    const consent = getConsent();
    if (consent === 'granted') {
      loadAnalytics();
      return;
    }
    if (consent === 'denied') {
      return;
    }
    buildBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
