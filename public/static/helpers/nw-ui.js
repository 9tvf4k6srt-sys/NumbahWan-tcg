/**
 * NW UI Helper Library v1.0
 * UI components and interactions for NumbahWan Guild
 */

const NW_UI = {
    version: '1.0.0',
    initialized: false,

    // Initialize UI system
    init() {
        if (this.initialized) return this;
        this.initialized = true;
        console.log('[NW_UI] v1.0.0 initialized');
        return this;
    },

    // Show toast notification
    toast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `nw-toast nw-toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
            color: white;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Modal helper
    modal: {
        show(id) {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        },
        hide(id) {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }
    },

    // Loading spinner
    showLoading(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            el.dataset.originalContent = el.innerHTML;
            el.innerHTML = '<span class="nw-spinner"></span>';
            el.disabled = true;
        }
    },

    hideLoading(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el && el.dataset.originalContent) {
            el.innerHTML = el.dataset.originalContent;
            el.disabled = false;
            delete el.dataset.originalContent;
        }
    },

    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Debounce helper
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};

// Auto-initialize
if (typeof window !== 'undefined') {
    window.NW_UI = NW_UI;
    document.addEventListener('DOMContentLoaded', () => NW_UI.init());
}
