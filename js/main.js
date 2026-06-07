document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const form = document.getElementById('contactForm');
  const done = document.getElementById('formDone');
  const formError = document.getElementById('formError');
  const submitBtn = form.querySelector('[type="submit"]');

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

      form.classList.add('hide');
      done.classList.remove('hidden');
    } catch {
      formError.classList.remove('hidden');
      submitBtn.disabled = false;
    }
  });
});
