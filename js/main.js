/* ============================================================
   MAIN.JS — Shared across all pages
   Navigation, WhatsApp FAB, Currency Toggle, Lead Popup
   ============================================================ */

import {
  initCurrency,
  setCurrency,
  getCurrency,
  initLanguage,
  setLanguage,
  getLanguage,
  getWhatsAppURL,
  trackWhatsAppClick,
  initScrollReveal,
} from './utils.js';

/* ── Initialize ── */
function initApp() {
  initCurrency();
  initLanguage();
  initNavbar();
  initWhatsAppFAB();
  initCurrencyToggle();
  initLanguageToggle();
  initLeadPopup();
  initScrollReveal();
  setActiveNavLink();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initLanguageToggle() {
  const select = document.getElementById('lang-select');
  if (!select) return;
  select.value = getLanguage();
  select.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });
}


/* ── Navbar ── */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.navbar__toggle');
  const links = document.querySelector('.navbar__links');
  const actions = document.querySelector('.navbar__actions');

  // Scroll effect
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
      if (actions) actions.classList.toggle('open');
      document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    links.querySelectorAll('.navbar__link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
        if (actions) actions.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.navbar__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (href !== '/' && path.includes(href.replace('.html', '')))) {
      link.classList.add('active');
    }
  });
}

/* ── WhatsApp Floating Button ── */
function initWhatsAppFAB() {
  const fab = document.getElementById('whatsapp-fab');
  if (!fab) return;

  // Set context-aware message based on current page
  const pageName = document.title || 'Sri Lanka Tours';
  let message = `Hi! I'm browsing your website and I'm interested in learning more about your tours.`;

  if (window.location.pathname.includes('package-detail')) {
    const params = new URLSearchParams(window.location.search);
    const pkg = params.get('id');
    if (pkg) {
      message = `Hi! I'm interested in the ${pkg.replace(/-/g, ' ')} package. Can you share more details?`;
    }
  } else if (window.location.pathname.includes('customize')) {
    message = `Hi! I'm building a custom tour on your website and would like some help.`;
  }

  fab.href = getWhatsAppURL(message);

  fab.addEventListener('click', () => {
    trackWhatsAppClick(window.location.pathname);
  });
}

/* ── Currency Toggle ── */
function initCurrencyToggle() {
  const select = document.getElementById('currency-select');
  if (!select) return;

  // Set initial value
  select.value = getCurrency();

  select.addEventListener('change', (e) => {
    setCurrency(e.target.value);
    // Update all price elements on page
    updateAllPrices();
  });

  // Listen for currency change events
  document.addEventListener('currency-change', () => {
    if (select.value !== getCurrency()) {
      select.value = getCurrency();
    }
    updateAllPrices();
  });
}

function updateAllPrices() {
  // Delegate to page-specific handlers via custom event
  document.dispatchEvent(new CustomEvent('update-prices'));
}

/* ── Lead Capture Popup ── */
function initLeadPopup() {
  const dialog = document.getElementById('lead-dialog');
  if (!dialog) return;

  // Don't show if already dismissed this session
  if (sessionStorage.getItem('sl-lead-dismissed')) return;

  let triggered = false;

  // Trigger on 60% scroll
  window.addEventListener('scroll', () => {
    if (triggered) return;
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    if (scrollPercent > 60) {
      triggered = true;
      setTimeout(() => {
        dialog.showModal();
      }, 500);
    }
  }, { passive: true });

  // Close handlers
  const closeBtn = dialog.querySelector('.lead-dialog__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dialog.close();
      sessionStorage.setItem('sl-lead-dismissed', 'true');
    });
  }

  // Close on backdrop click
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
      sessionStorage.setItem('sl-lead-dismissed', 'true');
    }
  });

  // Handle form submit
  const form = dialog.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      const leads = JSON.parse(localStorage.getItem('sl-newsletter') || '[]');
      leads.push({ email, timestamp: new Date().toISOString() });
      localStorage.setItem('sl-newsletter', JSON.stringify(leads));

      // Show success
      form.innerHTML = `
        <div style="text-align: center; padding: 1rem 0;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h3 style="margin-top: 1rem; color: #0F6E56;">Thank you!</h3>
          <p style="color: #5A5A56; margin-top: 0.5rem;">We'll send you the best Sri Lanka travel tips and exclusive deals.</p>
        </div>
      `;
      setTimeout(() => {
        dialog.close();
        sessionStorage.setItem('sl-lead-dismissed', 'true');
      }, 3000);
    });
  }
}

/* ── Accordion Component ── */
export function initAccordions() {
  document.querySelectorAll('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const content = trigger.nextElementSibling;
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close all
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
