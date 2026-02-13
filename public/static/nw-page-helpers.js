/**
 * NumbahWan Page Helpers v1.0
 * Shared utility functions extracted from 128 pages.
 * Reduces duplication of common patterns.
 * 
 * Usage: <script src="/static/nw-page-helpers.js" defer></script>
 * All functions exposed on window.NW_HELPERS
 */
(function() {
  'use strict';

  const NW_HELPERS = {
    // ════════════════════════════════════════
    // MODAL MANAGEMENT
    // ════════════════════════════════════════
    openModal(modalId) {
      const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (!modal) return;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    closeModal(modalId) {
      const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (!modal) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
    },

    // Close modal on overlay click or Escape
    initModalClose(modalId) {
      const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) NW_HELPERS.closeModal(modal);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          NW_HELPERS.closeModal(modal);
        }
      });
    },

    // ════════════════════════════════════════
    // NUMBER FORMATTING
    // ════════════════════════════════════════
    formatNumber(num) {
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
      return num.toLocaleString();
    },

    formatPrice(amount, currency) {
      if (currency === 'usd' || !currency) return '$' + Number(amount).toLocaleString();
      return Number(amount).toLocaleString() + ' ' + currency;
    },

    // ════════════════════════════════════════
    // LIGHTBOX (shared by merch, gallery, cards)
    // ════════════════════════════════════════
    openLightbox(src, caption) {
      let lb = document.getElementById('nw-lightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.id = 'nw-lightbox';
        lb.className = 'nw-modal-overlay';
        lb.innerHTML = `
          <div style="max-width:90%;max-height:90%;position:relative;text-align:center">
            <button onclick="NW_HELPERS.closeLightbox()" style="position:absolute;top:-40px;right:0;background:var(--orange,#ff6b00);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:1.2rem;cursor:pointer">&times;</button>
            <img id="nw-lightbox-img" style="max-width:100%;max-height:80vh;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.8)">
            <div id="nw-lightbox-caption" style="margin-top:15px;color:rgba(255,255,255,0.8);font-size:0.9rem"></div>
          </div>`;
        lb.addEventListener('click', (e) => { if (e.target === lb) NW_HELPERS.closeLightbox(); });
        document.body.appendChild(lb);
      }
      document.getElementById('nw-lightbox-img').src = src;
      document.getElementById('nw-lightbox-caption').textContent = caption || '';
      NW_HELPERS.openModal(lb);
    },

    closeLightbox() {
      NW_HELPERS.closeModal('nw-lightbox');
    },

    // ════════════════════════════════════════
    // SCROLL REVEAL (was causing merch bug)
    // Safe version that doesn't hide by default
    // ════════════════════════════════════════
    initScrollReveal(selector, options = {}) {
      const els = document.querySelectorAll(selector);
      if (!els.length) return;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('nw-revealed');
            if (!options.repeat) observer.unobserve(entry.target);
          }
        });
      }, { threshold: options.threshold || 0.1 });
      els.forEach(el => observer.observe(el));
    },

    // ════════════════════════════════════════
    // LANGUAGE HELPERS
    // ════════════════════════════════════════
    getLang() {
      return localStorage.getItem('nw_lang') || 'en';
    },

    t(obj, fallback) {
      if (!obj) return fallback || '';
      const lang = NW_HELPERS.getLang();
      return obj[lang] || obj.en || fallback || '';
    }
  };

  window.NW_HELPERS = NW_HELPERS;
})();
