/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_UI - UI Components & Modals
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - Toast notifications (success, error, warning, info)
 * - Modal dialogs (alert, confirm, custom)
 * - Loading states & spinners
 * - Progress bars
 * - Tooltips
 * - Dropdowns
 * - Tabs
 * - Accordion
 * - Skeleton loaders
 */

const NW_UI = (function() {
    'use strict';

    const VERSION = '2.0.0';
    let toastContainer = null;
    let modalContainer = null;

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES INJECTION
    // ═══════════════════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('nw-ui-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'nw-ui-styles';
        styles.textContent = `
            /* Toast Container */
            .nw-toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .nw-toast {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 20px;
                border-radius: 12px;
                background: linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.98) 100%);
                color: #fff;
                font-size: 14px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
                transform: translateX(120%);
                transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                pointer-events: auto;
                max-width: 350px;
                backdrop-filter: blur(10px);
            }

            .nw-toast.show { transform: translateX(0); }
            .nw-toast.hide { transform: translateX(120%); }

            .nw-toast-icon {
                width: 24px;
                height: 24px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 14px;
            }

            .nw-toast.success .nw-toast-icon { background: #22c55e; }
            .nw-toast.error .nw-toast-icon { background: #ef4444; }
            .nw-toast.warning .nw-toast-icon { background: #f59e0b; }
            .nw-toast.info .nw-toast-icon { background: #3b82f6; }

            .nw-toast-close {
                margin-left: auto;
                cursor: pointer;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            .nw-toast-close:hover { opacity: 1; }

            /* Modal */
            .nw-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99998;
                opacity: 0;
                transition: opacity 0.3s;
                padding: 20px;
            }
            .nw-modal-overlay.show { opacity: 1; }

            .nw-modal {
                background: linear-gradient(135deg, rgba(30,30,40,0.98) 0%, rgba(20,20,30,1) 100%);
                border-radius: 16px;
                max-width: 480px;
                width: 100%;
                max-height: 90vh;
                overflow: auto;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            .nw-modal-overlay.show .nw-modal {
                transform: scale(1) translateY(0);
            }

            .nw-modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .nw-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                flex: 1;
            }

            .nw-modal-close {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: none;
                background: rgba(255,255,255,0.1);
                color: #fff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .nw-modal-close:hover { background: rgba(255,107,0,0.3); }

            .nw-modal-body {
                padding: 24px;
                color: rgba(255,255,255,0.8);
                font-size: 15px;
                line-height: 1.6;
            }

            .nw-modal-footer {
                padding: 16px 24px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .nw-btn {
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .nw-btn-primary {
                background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
                color: #fff;
            }
            .nw-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(255,107,0,0.4);
            }

            .nw-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }
            .nw-btn-secondary:hover { background: rgba(255,255,255,0.2); }

            .nw-btn-danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: #fff;
            }

            /* Loading */
            .nw-loading-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                gap: 20px;
            }

            .nw-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: #ff6b00;
                border-radius: 50%;
                animation: nw-spin 0.8s linear infinite;
            }

            @keyframes nw-spin {
                to { transform: rotate(360deg); }
            }

            .nw-loading-text {
                color: #fff;
                font-size: 14px;
            }

            /* Progress Bar */
            .nw-progress {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
            }

            .nw-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #ff6b00, #ffd700);
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            /* Tooltip */
            .nw-tooltip {
                position: absolute;
                background: rgba(0,0,0,0.9);
                color: #fff;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 13px;
                white-space: nowrap;
                z-index: 99997;
                pointer-events: none;
                opacity: 0;
                transform: translateY(5px);
                transition: all 0.2s;
            }
            .nw-tooltip.show {
                opacity: 1;
                transform: translateY(0);
            }
            .nw-tooltip::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: rgba(0,0,0,0.9);
            }

            /* Skeleton */
            .nw-skeleton {
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: nw-shimmer 1.5s infinite;
                border-radius: 4px;
            }

            @keyframes nw-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .nw-skeleton-text { height: 16px; margin-bottom: 8px; }
            .nw-skeleton-title { height: 24px; width: 60%; margin-bottom: 16px; }
            .nw-skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; }
            .nw-skeleton-card { height: 200px; border-radius: 12px; }

            /* Tabs */
            .nw-tabs {
                display: flex;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                gap: 4px;
            }

            .nw-tab {
                padding: 12px 20px;
                border: none;
                background: transparent;
                color: rgba(255,255,255,0.6);
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                position: relative;
            }

            .nw-tab:hover { color: #fff; }
            
            .nw-tab.active {
                color: #ff6b00;
            }
            
            .nw-tab.active::after {
                content: '';
                position: absolute;
                bottom: -1px;
                left: 0;
                right: 0;
                height: 2px;
                background: #ff6b00;
            }

            .nw-tab-content {
                display: none;
                padding: 20px 0;
            }
            .nw-tab-content.active { display: block; }

            /* Accordion */
            .nw-accordion-item {
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                margin-bottom: 8px;
                overflow: hidden;
            }

            .nw-accordion-header {
                width: 100%;
                padding: 16px 20px;
                border: none;
                background: rgba(255,255,255,0.05);
                color: #fff;
                font-size: 15px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s;
            }
            .nw-accordion-header:hover { background: rgba(255,255,255,0.1); }

            .nw-accordion-icon {
                transition: transform 0.3s;
            }
            .nw-accordion-item.open .nw-accordion-icon {
                transform: rotate(180deg);
            }

            .nw-accordion-content {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }
            .nw-accordion-item.open .nw-accordion-content {
                max-height: 500px;
            }

            .nw-accordion-body {
                padding: 16px 20px;
                color: rgba(255,255,255,0.7);
            }

            /* Dropdown */
            .nw-dropdown {
                position: relative;
                display: inline-block;
            }

            .nw-dropdown-menu {
                position: absolute;
                top: 100%;
                left: 0;
                min-width: 180px;
                background: rgba(30,30,40,0.98);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: all 0.2s;
                z-index: 1000;
            }

            .nw-dropdown.open .nw-dropdown-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(4px);
            }

            .nw-dropdown-item {
                display: block;
                width: 100%;
                padding: 10px 16px;
                border: none;
                background: transparent;
                color: rgba(255,255,255,0.8);
                font-size: 14px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
            }
            .nw-dropdown-item:hover {
                background: rgba(255,107,0,0.2);
                color: #ff6b00;
            }
            .nw-dropdown-item:first-child { border-radius: 8px 8px 0 0; }
            .nw-dropdown-item:last-child { border-radius: 0 0 8px 8px; }

            .nw-dropdown-divider {
                height: 1px;
                background: rgba(255,255,255,0.1);
                margin: 4px 0;
            }
        `;
        document.head.appendChild(styles);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function getToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'nw-toast-container';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function toast(message, type = 'info', duration = 4000) {
        const container = getToastContainer();
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        const toast = document.createElement('div');
        toast.className = `nw-toast ${type}`;
        toast.innerHTML = `
            <span class="nw-toast-icon">${icons[type]}</span>
            <span class="nw-toast-message">${message}</span>
            <span class="nw-toast-close">✕</span>
        `;

        container.appendChild(toast);

        // Show animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Close button
        toast.querySelector('.nw-toast-close').addEventListener('click', () => closeToast(toast));

        // Auto close
        if (duration > 0) {
            setTimeout(() => closeToast(toast), duration);
        }

        return toast;
    }

    function closeToast(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }

    // Convenience methods
    const success = (msg, duration) => toast(msg, 'success', duration);
    const error = (msg, duration) => toast(msg, 'error', duration);
    const warning = (msg, duration) => toast(msg, 'warning', duration);
    const info = (msg, duration) => toast(msg, 'info', duration);

    // ═══════════════════════════════════════════════════════════════════════════
    // MODAL DIALOGS
    // ═══════════════════════════════════════════════════════════════════════════

    function modal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            buttons = [],
            closable = true,
            width = '480px',
            onClose = null
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'nw-modal-overlay';
            
            overlay.innerHTML = `
                <div class="nw-modal" style="max-width: ${width}">
                    <div class="nw-modal-header">
                        <div class="nw-modal-title">${title}</div>
                        ${closable ? '<button class="nw-modal-close">✕</button>' : ''}
                    </div>
                    <div class="nw-modal-body">${content}</div>
                    ${buttons.length ? `<div class="nw-modal-footer"></div>` : ''}
                </div>
            `;

            // Add buttons
            const footer = overlay.querySelector('.nw-modal-footer');
            if (footer && buttons.length) {
                buttons.forEach(btn => {
                    const button = document.createElement('button');
                    button.className = `nw-btn nw-btn-${btn.type || 'secondary'}`;
                    button.textContent = btn.text;
                    button.addEventListener('click', () => {
                        closeModal(overlay);
                        resolve(btn.value);
                        btn.onClick?.();
                    });
                    footer.appendChild(button);
                });
            }

            // Close handlers
            const close = () => {
                closeModal(overlay);
                resolve(null);
                onClose?.();
            };

            if (closable) {
                overlay.querySelector('.nw-modal-close')?.addEventListener('click', close);
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close();
                });
            }

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

            // Escape key
            const escHandler = (e) => {
                if (e.key === 'Escape' && closable) {
                    close();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    function closeModal(overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }

    // Convenience modals
    function alert(message, title = 'Alert') {
        return modal({
            title,
            content: message,
            buttons: [{ text: 'OK', type: 'primary', value: true }]
        });
    }

    function confirm(message, title = 'Confirm') {
        return modal({
            title,
            content: message,
            buttons: [
                { text: 'Cancel', type: 'secondary', value: false },
                { text: 'Confirm', type: 'primary', value: true }
            ]
        });
    }

    function prompt(message, defaultValue = '', title = 'Input') {
        const inputId = 'nw-prompt-' + Date.now();
        return modal({
            title,
            content: `
                <p style="margin-bottom: 16px">${message}</p>
                <input type="text" id="${inputId}" value="${defaultValue}" 
                    style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); 
                    background: rgba(255,255,255,0.1); color: #fff; font-size: 14px;">
            `,
            buttons: [
                { text: 'Cancel', type: 'secondary', value: null },
                { text: 'OK', type: 'primary', value: 'SUBMIT' }
            ]
        }).then(result => {
            if (result === 'SUBMIT') {
                return document.getElementById(inputId)?.value || '';
            }
            return null;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    let loadingOverlay = null;

    function showLoading(text = 'Loading...') {
        if (loadingOverlay) return;
        
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'nw-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="nw-spinner"></div>
            <div class="nw-loading-text">${text}</div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.remove();
            loadingOverlay = null;
        }
    }

    function updateLoading(text) {
        if (loadingOverlay) {
            loadingOverlay.querySelector('.nw-loading-text').textContent = text;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRESS BAR
    // ═══════════════════════════════════════════════════════════════════════════

    function progress(container, value = 0) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return null;

        let progressEl = el.querySelector('.nw-progress');
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.className = 'nw-progress';
            progressEl.innerHTML = '<div class="nw-progress-bar"></div>';
            el.appendChild(progressEl);
        }

        const bar = progressEl.querySelector('.nw-progress-bar');
        bar.style.width = `${Math.min(100, Math.max(0, value))}%`;

        return {
            set: (v) => { bar.style.width = `${Math.min(100, Math.max(0, v))}%`; },
            get: () => parseFloat(bar.style.width),
            remove: () => progressEl.remove()
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TOOLTIP
    // ═══════════════════════════════════════════════════════════════════════════

    function initTooltips() {
        document.addEventListener('mouseenter', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (!target) return;

            const text = target.dataset.tooltip;
            const tooltip = document.createElement('div');
            tooltip.className = 'nw-tooltip';
            tooltip.textContent = text;
            document.body.appendChild(tooltip);

            const rect = target.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;

            requestAnimationFrame(() => tooltip.classList.add('show'));

            const cleanup = () => {
                tooltip.classList.remove('show');
                setTimeout(() => tooltip.remove(), 200);
                target.removeEventListener('mouseleave', cleanup);
            };
            target.addEventListener('mouseleave', cleanup);
        }, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TABS
    // ═══════════════════════════════════════════════════════════════════════════

    function tabs(container, options = {}) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return null;

        const tabButtons = el.querySelectorAll('.nw-tab');
        const tabContents = el.querySelectorAll('.nw-tab-content');

        tabButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                tabContents[index]?.classList.add('active');
                options.onChange?.(index);
            });
        });

        // Activate first tab
        if (tabButtons[0]) {
            tabButtons[0].classList.add('active');
            tabContents[0]?.classList.add('active');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCORDION
    // ═══════════════════════════════════════════════════════════════════════════

    function accordion(container, options = { multiple: false }) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return null;

        const items = el.querySelectorAll('.nw-accordion-item');

        items.forEach(item => {
            const header = item.querySelector('.nw-accordion-header');
            header?.addEventListener('click', () => {
                if (!options.multiple) {
                    items.forEach(i => {
                        if (i !== item) i.classList.remove('open');
                    });
                }
                item.classList.toggle('open');
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DROPDOWN
    // ═══════════════════════════════════════════════════════════════════════════

    function dropdown(trigger, options = {}) {
        const el = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
        if (!el) return null;

        const parent = el.closest('.nw-dropdown');
        if (!parent) return null;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            parent.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', () => {
            parent.classList.remove('open');
        });

        // Handle item clicks
        parent.querySelectorAll('.nw-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                parent.classList.remove('open');
                options.onSelect?.(item.dataset.value || item.textContent);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SKELETON LOADERS
    // ═══════════════════════════════════════════════════════════════════════════

    function skeleton(type = 'text', count = 1) {
        const types = {
            text: '<div class="nw-skeleton nw-skeleton-text"></div>',
            title: '<div class="nw-skeleton nw-skeleton-title"></div>',
            avatar: '<div class="nw-skeleton nw-skeleton-avatar"></div>',
            card: '<div class="nw-skeleton nw-skeleton-card"></div>'
        };

        return Array(count).fill(types[type] || types.text).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        initTooltips();
        console.log(`[NW_UI] v${VERSION} initialized`);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // Toast
        toast, success, error, warning, info,
        
        // Modal
        modal, alert, confirm, prompt,
        
        // Loading
        showLoading, hideLoading, updateLoading,
        
        // Progress
        progress,
        
        // Components
        tabs, accordion, dropdown,
        
        // Skeleton
        skeleton
    };
})();

window.NW_UI = NW_UI;
