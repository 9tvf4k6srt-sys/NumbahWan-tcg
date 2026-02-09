/**
 * NumbahWan Components v1.0
 * =========================
 * Premium UI components using ONLY custom NW icons.
 * NO emojis, NO FontAwesome - 100% unique NumbahWan style.
 * 
 * Usage:
 *   NW.toast('Message')
 *   NW.toast.success('Saved!')
 *   NW.toast.error('Failed!')
 *   NW.modal.open({ title, content, actions })
 *   NW.confirm('Delete?', onYes, onNo)
 *   NW.loader.show()
 *   NW.loader.hide()
 */

const NW = (function() {
    'use strict';

    // =========================================================================
    // ICON SYSTEM - Uses NWIconsInline for all icons (Premium v2.0)
    // =========================================================================
    
    // Icon mapping: semantic name -> NWIconsInline icon name
    const ICON_MAP = {
        // Navigation
        home: 'home',
        back: 'arrow-left',
        forward: 'arrow-right',
        up: 'arrow-up',
        down: 'arrow-down',
        menu: 'menu',
        close: 'close',
        
        // Actions
        play: 'gaming',
        battle: 'swords',
        attack: 'sword',
        defend: 'shield',
        
        // Status
        success: 'check',
        error: 'close',
        warning: 'warning',
        info: 'info',
        
        // Gaming
        fire: 'fire',
        crown: 'crown',      // GM-EXCLUSIVE: Only for Grandmaster content
        trophy: 'trophy',
        star: 'star',
        skull: 'skull',
        
        // Cards
        cards: 'cards',
        deck: 'deck',
        pack: 'gift',
        collection: 'collection',
        
        // Currency (use NW_CURRENCY for proper icons)
        gold: 'coins',
        gems: 'crystal',
        logs: 'scroll',
        
        // Social
        chat: 'chat',
        users: 'users',
        user: 'user',
        heart: 'heart',
        share: 'share',
        
        // Shop
        shop: 'shop',
        cart: 'cart',
        market: 'chart',
        
        // Guild
        guild: 'shield',
        party: 'party',
        celebration: 'confetti',
        
        // Misc
        settings: 'settings',
        search: 'search',
        filter: 'filter',
        music: 'music',
        'music-off': 'music-off',
        eye: 'eye',
        'eye-off': 'eye-off',
        lock: 'lock',
        unlock: 'unlock',
        plus: 'plus',
        minus: 'minus',
        sparkles: 'sparkles',
        rocket: 'rocket',
        
        // Rarity
        mythic: 'dragon',
        legendary: 'fire',       // Changed from crown - crown is GM-only
        epic: 'star-filled',
        rare: 'star',
        uncommon: 'shield',
        common: 'circle'
    };

    /**
     * Create an SVG icon element using NWIconsInline
     * @param {string} name - Icon name (from ICON_MAP or direct ID)
     * @param {object} options - { size, color, class }
     * @returns {HTMLElement}
     */
    function icon(name, options = {}) {
        const { size = 24, color = 'currentColor', className = '' } = options;
        const iconId = ICON_MAP[name] || name;
        
        // Use NWIconsInline if available
        if (typeof NWIconsInline !== 'undefined') {
            return NWIconsInline.render(iconId, { size, color, className });
        }
        
        // Fallback: create placeholder
        const span = document.createElement('span');
        span.className = `nw-icon ${className}`.trim();
        span.style.cssText = `display:inline-flex;width:${size}px;height:${size}px;`;
        span.setAttribute('data-nw-icon', iconId);
        return span;
    }

    /**
     * Get icon as HTML string using NWIconsInline
     */
    function iconHTML(name, options = {}) {
        const { size = 24, color = 'currentColor', className = '' } = options;
        const iconId = ICON_MAP[name] || name;
        
        // Use NWIconsInline if available
        if (typeof NWIconsInline !== 'undefined' && NWIconsInline.icons && NWIconsInline.icons[iconId]) {
            return `<span class="nw-icon ${className}" style="display:inline-flex;width:${size}px;height:${size}px;color:${color}" data-nw-icon="${iconId}"></span>`;
        }
        
        // Fallback
        return `<span class="nw-icon ${className}" style="display:inline-flex;width:${size}px;height:${size}px;" data-nw-icon="${iconId}"></span>`;
    }

    // =========================================================================
    // TOAST NOTIFICATIONS
    // =========================================================================
    const toast = (function() {
        let container = null;
        
        function ensureContainer() {
            if (!container) {
                container = document.createElement('div');
                container.id = 'nw-toast-container';
                container.style.cssText = `
                    position: fixed;
                    top: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: var(--nw-z-toast, 900);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    pointer-events: none;
                    max-width: 90vw;
                `;
                document.body.appendChild(container);
            }
            return container;
        }

        function show(message, options = {}) {
            const {
                type = 'info',
                duration = 3000,
                icon: iconName = null
            } = options;

            const cont = ensureContainer();
            
            const typeConfig = {
                success: { icon: 'success', bg: 'rgba(34, 197, 94, 0.9)', border: '#22c55e' },
                error: { icon: 'error', bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444' },
                warning: { icon: 'warning', bg: 'rgba(245, 158, 11, 0.9)', border: '#f59e0b' },
                info: { icon: 'info', bg: 'rgba(59, 130, 246, 0.9)', border: '#3b82f6' },
                fire: { icon: 'fire', bg: 'rgba(255, 107, 0, 0.9)', border: '#ff6b00' }
            };

            const config = typeConfig[type] || typeConfig.info;
            const finalIcon = iconName || config.icon;

            const toastEl = document.createElement('div');
            toastEl.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: ${config.bg};
                border: 1px solid ${config.border};
                border-radius: 10px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                pointer-events: auto;
                animation: nw-toast-slide-in 0.3s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            `;

            toastEl.innerHTML = `
                ${iconHTML(finalIcon, { size: 20 })}
                <span>${message}</span>
            `;

            cont.appendChild(toastEl);

            // Auto remove
            setTimeout(() => {
                toastEl.style.animation = 'nw-toast-slide-out 0.3s ease forwards';
                setTimeout(() => toastEl.remove(), 300);
            }, duration);

            return toastEl;
        }

        // Inject toast animations
        if (!document.getElementById('nw-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'nw-toast-styles';
            style.textContent = `
                @keyframes nw-toast-slide-in {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes nw-toast-slide-out {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        // Shorthand methods
        show.success = (msg, opts) => show(msg, { ...opts, type: 'success' });
        show.error = (msg, opts) => show(msg, { ...opts, type: 'error' });
        show.warning = (msg, opts) => show(msg, { ...opts, type: 'warning' });
        show.info = (msg, opts) => show(msg, { ...opts, type: 'info' });
        show.fire = (msg, opts) => show(msg, { ...opts, type: 'fire' });

        return show;
    })();

    // =========================================================================
    // MODAL DIALOG
    // =========================================================================
    const modal = (function() {
        let overlay = null;
        let currentModal = null;

        function ensureOverlay() {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'nw-modal-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: var(--nw-z-overlay, 800);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    padding: 20px;
                `;
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) close();
                });
                document.body.appendChild(overlay);
            }
            return overlay;
        }

        function open(options = {}) {
            const {
                title = '',
                content = '',
                icon: iconName = null,
                actions = [],
                size = 'md',
                closable = true
            } = options;

            const ov = ensureOverlay();
            
            const sizes = {
                sm: '360px',
                md: '480px',
                lg: '640px',
                xl: '800px'
            };

            const modalEl = document.createElement('div');
            modalEl.className = 'nw-modal';
            modalEl.style.cssText = `
                background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);
                border: 1px solid rgba(255, 107, 0, 0.3);
                border-radius: 16px;
                width: 100%;
                max-width: ${sizes[size] || sizes.md};
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            `;

            // Header
            let headerHTML = '';
            if (title || closable) {
                headerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,107,0,0.2); background: rgba(255,107,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${iconName ? iconHTML(iconName, { size: 24, color: '#ff6b00' }) : ''}
                            <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #ff6b00;">${title}</h3>
                        </div>
                        ${closable ? `<button class="nw-modal-close" style="width: 32px; height: 32px; border: none; border-radius: 8px; background: rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            ${iconHTML('close', { size: 18 })}
                        </button>` : ''}
                    </div>
                `;
            }

            // Content
            const contentHTML = `
                <div style="padding: 20px; overflow-y: auto; flex: 1;">
                    ${typeof content === 'string' ? content : ''}
                </div>
            `;

            // Actions
            let actionsHTML = '';
            if (actions.length > 0) {
                actionsHTML = `
                    <div style="display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid rgba(255,107,0,0.2); justify-content: flex-end;">
                        ${actions.map((action, i) => `
                            <button class="nw-modal-action" data-action="${i}" style="
                                padding: 10px 20px;
                                border-radius: 8px;
                                font-size: 14px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                ${action.primary ? 
                                    'background: linear-gradient(135deg, #ff6b00, #ff9500); border: none; color: white;' : 
                                    'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;'
                                }
                            ">
                                ${action.icon ? iconHTML(action.icon, { size: 16 }) : ''}
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            modalEl.innerHTML = headerHTML + contentHTML + actionsHTML;

            // If content is an element, append it
            if (typeof content !== 'string' && content instanceof Element) {
                modalEl.querySelector('div[style*="overflow-y"]').appendChild(content);
            }

            // Bind events
            const closeBtn = modalEl.querySelector('.nw-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', close);
            }

            modalEl.querySelectorAll('.nw-modal-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.action);
                    if (actions[idx]?.onClick) {
                        actions[idx].onClick();
                    }
                    if (actions[idx]?.closeOnClick !== false) {
                        close();
                    }
                });
            });

            // Clear and show
            ov.innerHTML = '';
            ov.appendChild(modalEl);
            currentModal = modalEl;

            // Animate in
            requestAnimationFrame(() => {
                ov.style.opacity = '1';
                ov.style.visibility = 'visible';
                modalEl.style.transform = 'scale(1)';
            });

            return modalEl;
        }

        function close() {
            if (!overlay) return;
            
            overlay.style.opacity = '0';
            if (currentModal) {
                currentModal.style.transform = 'scale(0.9)';
            }
            
            setTimeout(() => {
                overlay.style.visibility = 'hidden';
                overlay.innerHTML = '';
                currentModal = null;
            }, 300);
        }

        return { open, close };
    })();

    // =========================================================================
    // CONFIRM DIALOG
    // =========================================================================
    function confirm(message, onYes, onNo = null) {
        return modal.open({
            title: 'Confirm',
            icon: 'warning',
            content: `<p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 15px;">${message}</p>`,
            size: 'sm',
            actions: [
                {
                    label: 'Cancel',
                    icon: 'close',
                    onClick: onNo
                },
                {
                    label: 'Confirm',
                    icon: 'check',
                    primary: true,
                    onClick: onYes
                }
            ]
        });
    }

    // =========================================================================
    // LOADER
    // =========================================================================
    const loader = (function() {
        let loaderEl = null;

        function show(message = 'Loading...') {
            if (loaderEl) return;

            loaderEl = document.createElement('div');
            loaderEl.id = 'nw-loader';
            loaderEl.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 15, 0.95);
                z-index: var(--nw-z-loader, 1000);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 20px;
            `;

            loaderEl.innerHTML = `
                <div style="position: relative; width: 60px; height: 60px;">
                    <div style="
                        position: absolute;
                        inset: 0;
                        border: 3px solid rgba(255, 107, 0, 0.2);
                        border-top-color: #ff6b00;
                        border-radius: 50%;
                        animation: nw-spin 0.8s linear infinite;
                    "></div>
                    <div style="
                        position: absolute;
                        inset: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        ${iconHTML('fire', { size: 28, color: '#ff6b00' })}
                    </div>
                </div>
                <span style="color: rgba(255,255,255,0.7); font-size: 14px;">${message}</span>
            `;

            document.body.appendChild(loaderEl);
        }

        function hide() {
            if (loaderEl) {
                loaderEl.style.opacity = '0';
                setTimeout(() => {
                    loaderEl?.remove();
                    loaderEl = null;
                }, 300);
            }
        }

        // Inject spin animation
        if (!document.getElementById('nw-loader-styles')) {
            const style = document.createElement('style');
            style.id = 'nw-loader-styles';
            style.textContent = `
                @keyframes nw-spin {
                    to { transform: rotate(360deg); }
                }
                #nw-loader {
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        return { show, hide };
    })();

    // =========================================================================
    // CURRENCY DISPLAY
    // =========================================================================
    function currency(type, amount, options = {}) {
        const { size = 'md', showLabel = false, animated = false } = options;
        
        const types = {
            logs: { icon: 'scroll', color: '#8B4513', label: 'Sacred Logs' },
            wood: { icon: 'scroll', color: '#8B4513', label: 'Sacred Logs' },
            gold: { icon: 'diamond', color: '#ffd700', label: 'Gold' },
            gems: { icon: 'crystal-ball', color: '#a855f7', label: 'Gems' },
            diamond: { icon: 'diamond', color: '#60a5fa', label: 'Diamonds' }
        };
        
        const config = types[type] || types.gold;
        const sizes = { sm: 16, md: 20, lg: 28 };
        const iconSize = sizes[size] || sizes.md;
        
        const el = document.createElement('div');
        el.className = 'nw-currency';
        el.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: bold;
            color: ${config.color};
        `;
        
        el.innerHTML = `
            ${iconHTML(config.icon, { size: iconSize, color: config.color })}
            <span class="nw-currency-amount" ${animated ? 'data-animate="true"' : ''}>${Number(amount).toLocaleString()}</span>
            ${showLabel ? `<span style="color: rgba(255,255,255,0.5); font-weight: normal; font-size: 12px;">${config.label}</span>` : ''}
        `;
        
        return el;
    }

    function currencyHTML(type, amount, options = {}) {
        const temp = currency(type, amount, options);
        return temp.outerHTML;
    }

    // =========================================================================
    // RARITY BADGE
    // =========================================================================
    function rarityBadge(rarity, options = {}) {
        const { size = 'md', showIcon = true } = options;
        
        const rarities = {
            mythic: { color: '#ff00ff', bg: 'rgba(255,0,255,0.2)', icon: 'dragon', label: 'Mythic' },
            legendary: { color: '#ffd700', bg: 'rgba(255,215,0,0.2)', icon: 'crown', label: 'Legendary' },
            epic: { color: '#a855f7', bg: 'rgba(168,85,247,0.2)', icon: 'fire', label: 'Epic' },
            rare: { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)', icon: 'star', label: 'Rare' },
            uncommon: { color: '#22c55e', bg: 'rgba(34,197,94,0.2)', icon: 'shield', label: 'Uncommon' },
            common: { color: '#9ca3af', bg: 'rgba(156,163,175,0.2)', icon: 'check', label: 'Common' }
        };
        
        const config = rarities[rarity?.toLowerCase()] || rarities.common;
        const sizes = { sm: { font: 10, icon: 12, pad: '2px 6px' }, md: { font: 12, icon: 14, pad: '4px 10px' }, lg: { font: 14, icon: 18, pad: '6px 14px' } };
        const s = sizes[size] || sizes.md;
        
        const el = document.createElement('span');
        el.className = `nw-rarity-badge nw-rarity-${rarity?.toLowerCase()}`;
        el.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: ${s.pad};
            background: ${config.bg};
            border: 1px solid ${config.color};
            border-radius: 6px;
            color: ${config.color};
            font-size: ${s.font}px;
            font-weight: bold;
            text-transform: uppercase;
        `;
        
        el.innerHTML = `
            ${showIcon ? iconHTML(config.icon, { size: s.icon, color: config.color }) : ''}
            ${config.label}
        `;
        
        return el;
    }

    // =========================================================================
    // PROGRESS BAR
    // =========================================================================
    function progressBar(value, max, options = {}) {
        const { 
            color = '#ff6b00', 
            height = 8, 
            showLabel = false,
            label = '',
            animated = true,
            glow = false 
        } = options;
        
        const percent = Math.min(100, Math.max(0, (value / max) * 100));
        
        const el = document.createElement('div');
        el.className = 'nw-progress';
        el.style.cssText = `
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;
        
        el.innerHTML = `
            ${showLabel ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: rgba(255,255,255,0.7);">${label}</span>
                    <span style="color: ${color}; font-weight: bold;">${value}/${max}</span>
                </div>
            ` : ''}
            <div style="
                width: 100%;
                height: ${height}px;
                background: rgba(255,255,255,0.1);
                border-radius: ${height / 2}px;
                overflow: hidden;
                ${glow ? `box-shadow: 0 0 10px ${color}40;` : ''}
            ">
                <div style="
                    width: ${percent}%;
                    height: 100%;
                    background: ${color};
                    border-radius: ${height / 2}px;
                    ${animated ? 'transition: width 0.5s ease;' : ''}
                    ${glow ? `box-shadow: 0 0 8px ${color};` : ''}
                "></div>
            </div>
        `;
        
        return el;
    }

    // =========================================================================
    // EMOJI REPLACEMENT SYSTEM
    // Auto-converts emojis to custom SVG icons
    // =========================================================================
    const EMOJI_TO_ICON = {
        // Gaming/Combat
        '': 'swords',
        '': 'sword',
        '': 'shield',
        '': 'fire',
        '': 'skull',
        '': 'skull',
        '': 'energy',
        '': 'fire',
        
        // Cards
        '': 'cards-stack',
        '🃏': 'card',
        '': 'pack',
        '': 'gift',
        
        // Currency/Items
        '': 'coins',
        '': 'coins',
        '': 'diamond',
        '⧫': 'scroll',
        '': 'scroll',
        '': 'potion',
        
        // Status
        '': 'hp',
        '': 'mp',
        '': 'star',
        '': 'star',
        '': 'sparkles',
        '': 'sparkles',
        
        // Achievements
        '': 'crown',
        '': 'trophy',
        '': 'achievement',
        '': 'achievement',
        
        // Navigation
        '': 'home',
        '←': 'arrow-left',
        '→': 'arrow-right',
        '↑': 'arrow-up',
        '↓': 'arrow-down',
        '': 'menu',
        '': 'close',
        '': 'close',
        '': 'x-circle',
        '': 'check-circle',
        '': 'check',
        
        // Status indicators
        '': 'warning',
        '': 'warning',
        '': 'question',
        'ℹ': 'info',
        '': 'notification',
        
        // Actions
        '': 'dice',
        '': 'target',
        '': 'crystal-ball',
        '': 'search',
        '': 'settings',
        '': 'settings',
        
        // Social
        '': 'user',
        '': 'users',
        '': 'chat',
        '': 'heart',
        '': 'trade',
        
        // Places
        '': 'shield',
        '': 'trophy',
        '': 'shopping-bag',
        '': 'shopping-bag',
        '': 'shopping-bag',
        
        // Entertainment
        '': 'gaming',
        '': 'gaming',
        '': 'celebration',
        '': 'confetti',
        '': 'party',
        
        // Content
        '': 'scroll',
        '': 'form',
        '': 'clipboard',
        '': 'chart',
        '': 'dress',
        '': 'meme',
        '': 'skull',
        
        // Misc
        '': 'lock',
        '': 'unlock',
        '': 'eye',
        '': 'rocket',
        '': 'sword',
        '': 'dragon'
    };

    /**
     * Replace emojis with SVG icons in text
     * @param {string} text - Text containing emojis
     * @param {object} options - { size, color }
     * @returns {string} - Text with emojis replaced by SVG icons
     */
    function replaceEmojis(text, options = {}) {
        const { size = 16, color = 'currentColor' } = options;
        let result = text;
        
        for (const [emoji, iconId] of Object.entries(EMOJI_TO_ICON)) {
            if (result.includes(emoji)) {
                const iconHtml = iconHTML(iconId, { size, color, className: 'nw-emoji-icon' });
                result = result.split(emoji).join(iconHtml);
            }
        }
        
        return result;
    }

    /**
     * Replace emojis in all elements with [data-nw-icons] attribute
     */
    function replaceAllEmojis() {
        document.querySelectorAll('[data-nw-icons]').forEach(el => {
            el.innerHTML = replaceEmojis(el.innerHTML);
        });
    }

    // Auto-run on DOM ready if data-nw-auto-icons is set on body
    if (document.body?.hasAttribute('data-nw-auto-icons')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', replaceAllEmojis);
        } else {
            replaceAllEmojis();
        }
    }

    // =========================================================================
    // EXPORT
    // =========================================================================
    return {
        // Icons
        icon,
        iconHTML,
        ICONS: ICON_MAP,
        EMOJI_MAP: EMOJI_TO_ICON,
        
        // Emoji replacement
        replaceEmojis,
        replaceAllEmojis,
        
        // Components
        toast,
        modal,
        confirm,
        loader,
        currency,
        currencyHTML,
        rarityBadge,
        progressBar,
        
        // Version
        version: '1.1.0'
    };
})();

// Also expose as window.NW for global access
window.NW = NW;

console.log('[NW] Components v1.1 loaded -', Object.keys(NW.ICONS).length, 'icon mappings,', Object.keys(NW.EMOJI_MAP).length, 'emoji replacements');
