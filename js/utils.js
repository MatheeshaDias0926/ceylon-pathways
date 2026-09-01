/* ============================================================
   UTILITIES — Shared helpers
   ============================================================ */

/**
 * Normalizes image paths to support Cloudinary URLs, data URIs, and local paths
 */
export function getImageUrl(src) {
  if (!src) return './images/hero/beach.jpg';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const clean = src.replace(/^\.?\/?images\//, '');
  return `./images/${clean}`;
}
if (typeof window !== 'undefined') {
  window.getImageUrl = getImageUrl;
}

// Currency conversion rates (hardcoded — update periodically)
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  LKR: 322.50,
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  LKR: 'Rs.',
};

let currentCurrency = 'USD';

// Multi-language strings for source markets: English, German, French, Russian, Chinese
export const TRANSLATIONS = {
  en: {
    nav_home: 'Home',
    nav_destinations: 'Destinations',
    nav_packages: 'Tour Packages',
    nav_customize: 'Build Your Trip',
    nav_about: 'About Us',
    nav_blog: 'Travel Guides',
    nav_contact: 'Contact',
    btn_plan_custom: 'Plan Custom Tour',
    btn_book_now: 'Book Now',
    btn_enquire: 'Enquire Now',
  },
  de: {
    nav_home: 'Startseite',
    nav_destinations: 'Reiseziele',
    nav_packages: 'Rundreisen',
    nav_customize: 'Reise Planen',
    nav_about: 'Über Uns',
    nav_blog: 'Reiseführer',
    nav_contact: 'Kontakt',
    btn_plan_custom: 'Tour Anpassen',
    btn_book_now: 'Jetzt Buchen',
    btn_enquire: 'Anfragen',
  },
  fr: {
    nav_home: 'Accueil',
    nav_destinations: 'Destinations',
    nav_packages: 'Circuits',
    nav_customize: 'Créer Votre Voyage',
    nav_about: 'À Propos',
    nav_blog: 'Guides de Voyage',
    nav_contact: 'Contact',
    btn_plan_custom: 'Voyage Sur Mesure',
    btn_book_now: 'Réserver',
    btn_enquire: 'Nous Contacter',
  },
  ru: {
    nav_home: 'Главная',
    nav_destinations: 'Направления',
    nav_packages: 'Туры',
    nav_customize: 'Свой Тур',
    nav_about: 'О Нас',
    nav_blog: 'Путеводитель',
    nav_contact: 'Контакты',
    btn_plan_custom: 'Создать Тур',
    btn_book_now: 'Забронировать',
    btn_enquire: 'Запрос',
  },
  zh: {
    nav_home: '首页',
    nav_destinations: '目的地',
    nav_packages: '经典旅游线路',
    nav_customize: '定制行程',
    nav_about: '关于我们',
    nav_blog: '旅行指南',
    nav_contact: '联系我们',
    btn_plan_custom: '开始定制',
    btn_book_now: '立即预订',
    btn_enquire: '咨询行程',
  }
};

let currentLang = 'en';

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('sl-lang', lang);
    applyTranslations();
    document.dispatchEvent(new CustomEvent('language-change', { detail: { lang } }));
  }
}

export function initLanguage() {
  const saved = localStorage.getItem('sl-lang') || 'en';
  if (TRANSLATIONS[saved]) {
    currentLang = saved;
  }
  applyTranslations();
}

export function applyTranslations() {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}


/**
 * Convert a USD price to the currently selected currency
 */
export function convertPrice(usdPrice) {
  const rate = EXCHANGE_RATES[currentCurrency] || 1;
  const converted = usdPrice * rate;
  const symbol = CURRENCY_SYMBOLS[currentCurrency] || '$';

  if (currentCurrency === 'LKR') {
    return `${symbol} ${Math.round(converted).toLocaleString()}`;
  }
  return `${symbol}${converted.toFixed(0)}`;
}

export const formatCurrency = convertPrice;

/**
 * Get current currency
 */
export function getCurrency() {
  return currentCurrency;
}

/**
 * Set active currency and dispatch change event
 */
export function setCurrency(code) {
  if (EXCHANGE_RATES[code]) {
    currentCurrency = code;
    localStorage.setItem('sl-currency', code);
    document.dispatchEvent(new CustomEvent('currency-change', { detail: { currency: code } }));
  }
}

/**
 * Initialize currency from localStorage
 */
export function initCurrency() {
  const saved = localStorage.getItem('sl-currency');
  if (saved && EXCHANGE_RATES[saved]) {
    currentCurrency = saved;
  }
}

/**
 * Generate a WhatsApp URL with context-aware pre-filled message
 */
export function getWhatsAppURL(contextMessage = '') {
  const phone = '94XXXXXXXXX'; // Replace with actual business number
  const defaultMsg = 'Hi! I\'m interested in your Sri Lanka tour packages.';
  const message = contextMessage || defaultMsg;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Track WhatsApp click for admin analytics
 */
export function trackWhatsAppClick(context = 'general') {
  const clicks = JSON.parse(localStorage.getItem('sl-wa-clicks') || '[]');
  clicks.push({
    context,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
  });
  localStorage.setItem('sl-wa-clicks', JSON.stringify(clicks));
}

/**
 * Save an enquiry lead
 */
export function saveEnquiry(data) {
  const enquiries = JSON.parse(localStorage.getItem('sl-enquiries') || '[]');
  enquiries.push({
    ...data,
    id: Date.now(),
    status: 'new',
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem('sl-enquiries', JSON.stringify(enquiries));
}

/**
 * Create star rating HTML
 */
export function createStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < full; i++) {
    html += `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  if (half) {
    html += `<svg viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }

  return html;
}

/**
 * Truncate text to specified length
 */
export function truncate(text, length = 120) {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Scroll-reveal fallback for browsers
 */
export function initScrollReveal() {
  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 }
  );

  document.querySelectorAll('.animate-on-scroll').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}

/**
 * Accordion Component initializer
 */
export function initAccordions() {
  document.querySelectorAll('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const content = trigger.nextElementSibling;
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close all siblings in same accordion
      trigger.closest('.accordion').querySelectorAll('.accordion__trigger').forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        t.nextElementSibling.style.maxHeight = null;
      });

      // Open clicked
      if (!isOpen) {
        trigger.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}
