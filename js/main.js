/* ═══════════════════════════════════════════════
   PORTFOLIO — Toufik Ait Amrane
   main.js
═══════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initActiveNavLink();
  initSkillBars();
  initProjectFilter();
  initContactForm();
  initScrollAnimations();
  initCounters();
  initRecaptcha();
});

/* 1. NAVBAR — classe scrolled */
function initNavbar() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* 2. LIEN ACTIF selon la section visible */
function initActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
}

/* 3. BARRES DE COMPÉTENCES ET DE PROGRESSION */
function initSkillBars() {
  const bars = document.querySelectorAll('.skill-bar[data-width], .journey-progress-bar[data-width]');
  if (!bars.length) return;

  function animateBar(bar) {
    if (bar.dataset.animated) return;
    bar.dataset.animated = 'true';
    bar.style.width = `${bar.dataset.width}%`;
  }

  const scrollObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateBar(entry.target);
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );

  bars.forEach((bar) => scrollObserver.observe(bar));

  /* Onglet affiché : animer les barres du panneau */
  document.querySelectorAll('.comp-tab').forEach((btn) => {
    btn.addEventListener('shown.bs.tab', () => {
      const panel = document.querySelector(btn.getAttribute('data-bs-target'));
      if (!panel) return;
      panel.querySelectorAll('.skill-bar[data-width]').forEach((bar) => {
        setTimeout(() => animateBar(bar), 80);
      });
    });
  });
}

/* 4. FILTRE PROJETS (professionnel | academique | personnel) */
function initProjectFilter() {
  const filterBtns   = document.querySelectorAll('.filter-btn');
  const projectItems = document.querySelectorAll('.project-item');
  if (!filterBtns.length || !projectItems.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      projectItems.forEach((item) => {
        const match = filter === 'all' || (item.dataset.category || '').includes(filter);
        if (match) showItem(item); else hideItem(item);
      });
    });
  });
}

function showItem(item) {
  clearTimeout(item._hideTimer);        // annule un masquage encore en attente
  item.classList.remove('hidden');
  void item.offsetWidth;                // force le reflow pour déclencher la transition
  item.style.opacity   = '1';
  item.style.transform = 'scale(1)';
}

function hideItem(item) {
  item.style.opacity   = '0';
  item.style.transform = 'scale(0.95)';
  item._hideTimer = setTimeout(() => item.classList.add('hidden'), 300);
}

/* 5. FORMULAIRE CONTACT — envoi via le Worker Cloudflare */
function initContactForm() {
  const form = document.getElementById('contactForm');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* Validation des champs */
    if (!validateForm(form)) return;

    document.getElementById('formError')?.classList.add('d-none');

    /* Honeypot */
    const websiteField =
      document.getElementById('website');

    if (
      websiteField &&
      websiteField.value.trim() !== ''
    ) {
      return;
    }

    const captchaError =
      document.getElementById('captchaError');

    const captchaToken = getRecaptchaToken();
    if (!captchaToken) {
      captchaError?.classList.remove('d-none');
      document.getElementById('recaptchaContainer')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }

    const config = window.CONTACT_CONFIG;
    if (!config?.contactEndpoint || config.contactEndpoint.includes('REMPLACER')) {
      showContactError(
        'Le formulaire n’est pas encore configuré. ' +
        'Veuillez nous écrire directement par email.'
      );
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const buttonText = submitButton?.querySelector('.btn-text');
    const originalButtonText = buttonText?.innerHTML;
    if (submitButton) submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    if (buttonText) buttonText.textContent = 'Envoi en cours…';

    try {
      const response = await fetch(config.contactEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: captchaToken,
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          subject: document.getElementById('contactSubject').value.trim(),
          message: document.getElementById('contactMessage').value.trim(),
          website: websiteField?.value.trim() || '',
        }),
      });

      const result = await response.json();
      if (!response.ok || result.success !== true) {
        if (result.error === 'captcha_invalid') {
          captchaError?.classList.remove('d-none');
          return;
        }
        throw new Error(
          `Contact Worker returned ${response.status}: ${result.error || 'unknown error'}`
        );
      }

      showFeedback('formSuccess');
      form.reset();
      clearValidation(form);
    } catch (error) {
      console.error('Impossible d’envoyer le message de contact.', error);
      showContactError(
        'Le message n’a pas pu être envoyé. Réessayez dans quelques instants ' +
        'ou contactez-nous directement par email.'
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
      form.removeAttribute('aria-busy');
      if (buttonText && originalButtonText) {
        buttonText.innerHTML = originalButtonText;
      }
      resetRecaptcha();
    }
  });

  form.querySelectorAll('[required]').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));

    field.addEventListener('input', () => {
      if (field.classList.contains('is-invalid')) {
        validateField(field);
      }
    });
  });
}

function showContactError(message) {
  const error = document.getElementById('formError');
  if (!error) return;

  const icon = document.createElement('i');
  icon.className = 'bi bi-exclamation-triangle-fill me-2';
  icon.setAttribute('aria-hidden', 'true');
  error.replaceChildren(icon, document.createTextNode(message));
  error.classList.remove('d-none');
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll('[required]').forEach((field) => {
    if (!validateField(field)) valid = false;
  });
  return valid;
}

function validateField(field) {
  const feedback = field.nextElementSibling;
  let valid = true;

  if (!field.value.trim()) valid = false;
  else if (field.type === 'email' && !isValidEmail(field.value)) valid = false;

  field.classList.toggle('is-invalid', !valid);

  if (feedback?.classList.contains('invalid-feedback-custom')) {
    feedback.classList.toggle('show', !valid);
  }
  return valid;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFeedback(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('d-none');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('d-none'), 7000);
}

function clearValidation(form) {
  form.querySelectorAll('.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback-custom.show').forEach((el) => el.classList.remove('show'));
}

/* 6. ANIMATIONS AU SCROLL
   Animation CSS (keyframes) : aucun transform ne reste après coup,
   donc les effets :hover des cartes continuent de fonctionner. */
function initScrollAnimations() {
  const targets = document.querySelectorAll(
    '.skill-card, .project-card, .veille-card, ' +
    '.exp-card, .about-info-card, .stat-card, .section-header'
  );
  if (!targets.length) return;

  if (!document.getElementById('scroll-anim-style')) {
    const style = document.createElement('style');
    style.id = 'scroll-anim-style';
    style.textContent = `
      .fade-in-up { opacity: 0; }
      .fade-in-up.visible { opacity: 1; animation: fadeInUp .55s ease backwards; }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .fade-in-up { opacity: 1; }
        .fade-in-up.visible { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  targets.forEach((el) => el.classList.add('fade-in-up'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ═══════════════════════════════════════════════
   7. COMPTEURS ANIMÉS (Hero)
═══════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;

  const duration = 2000; /* durée de l'animation en ms */

  /* easeOutCubic : démarre vite, ralentit à la fin */
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.round(easeOut(progress) * target);
      el.textContent = value + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /* Respect de la préférence "réduire les animations" */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    counters.forEach((el) => {
      el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });
    return;
  }

  /* Lancement au chargement (le Hero est visible immédiatement) */
  counters.forEach((el) => {
    el.textContent = '0' + (el.dataset.suffix || '');
    animateCounter(el);
  });
}

/* ═══════════════════════════════════════════════
   GOOGLE reCAPTCHA v2
═══════════════════════════════════════════════ */

let recaptchaWidgetId = null;

function initRecaptcha() {
  const container = document.getElementById('recaptchaContainer');
  const status = document.getElementById('captchaStatus');
  const config = window.CONTACT_CONFIG;

  if (!container || !status) return;

  if (
    !config?.recaptchaSiteKey ||
    config.recaptchaSiteKey.includes('REMPLACER')
  ) {
    status.textContent =
      'Configuration requise : ajoutez la clé publique reCAPTCHA.';
    status.classList.add('captcha-status--error');
    return;
  }

  status.textContent = 'Chargement de la vérification…';
  status.classList.remove('captcha-status--error');

  window.renderContactRecaptcha = () => {
    if (!window.grecaptcha) {
      status.textContent =
        'Le service reCAPTCHA n’a pas pu être chargé. Vérifiez votre connexion et réessayez.';
      status.classList.add('captcha-status--error');
      return;
    }

    recaptchaWidgetId = window.grecaptcha.render(container, {
      sitekey: config.recaptchaSiteKey,
      callback: () => {
        status.textContent = 'Vérification terminée.';
        status.classList.remove('captcha-status--error');
        document.getElementById('captchaError')?.classList.add('d-none');
      },
      'expired-callback': () => {
        status.textContent =
          'La vérification a expiré. Cochez à nouveau la case.';
      },
      'error-callback': () => {
        status.textContent =
          'Le service reCAPTCHA est indisponible. Vérifiez votre connexion.';
        status.classList.add('captcha-status--error');
      },
      theme: 'light',
    });
  };

  const script = document.createElement('script');
  script.src =
    'https://www.google.com/recaptcha/api.js' +
    '?onload=renderContactRecaptcha&render=explicit&hl=fr';
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    status.textContent =
      'Le service reCAPTCHA n’a pas pu être chargé. Vérifiez votre connexion.';
    status.classList.add('captcha-status--error');
  };
  document.head.appendChild(script);
}

function getRecaptchaToken() {
  if (!window.grecaptcha || recaptchaWidgetId === null) return '';
  return window.grecaptcha.getResponse(recaptchaWidgetId);
}

function resetRecaptcha() {
  if (!window.grecaptcha || recaptchaWidgetId === null) return;

  window.grecaptcha.reset(recaptchaWidgetId);
  document.getElementById('captchaStatus').textContent =
    'Confirmez que vous n’êtes pas un robot.';
}