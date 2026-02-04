/**
 * NWG Embassy Widget v1.0
 * Embeddable widget for partner sites to verify NWG citizens and allow claims
 * 
 * Usage on partner sites:
 * <script src="https://nwg.pages.dev/static/nw-embassy-widget.js" data-partner="matchalatte"></script>
 */

(function() {
    'use strict';
    
    // Detect base URL (sandbox vs production)
const NWG_BASE_URL = window.location.hostname.includes('sandbox') 
    ? 'https://3000-i8pqrv0s1id0a05f7rae2-583b4d74.sandbox.novita.ai'
    : 'https://nwg.pages.dev';
    const WIDGET_VERSION = '1.0.0';
    
    // Get partner ID from script tag
    const currentScript = document.currentScript;
    const partnerId = currentScript?.getAttribute('data-partner') || 'unknown';
    const position = currentScript?.getAttribute('data-position') || 'bottom-right';
    const theme = currentScript?.getAttribute('data-theme') || 'dark';
    const autoShow = currentScript?.getAttribute('data-auto-show') !== 'false';
    
    // Partner configs
    const PARTNERS = {
        matchalatte: { name: 'MatchaLatte', rewards: { nwg: 200, wood: 50 }, color: '#7cb342' },
        default: { name: 'Alliance Partner', rewards: { nwg: 50, wood: 10 }, color: '#ffd700' }
    };
    
    const partner = PARTNERS[partnerId] || PARTNERS.default;
    
    // Styles
    const styles = `
        .nwg-embassy-widget {
            position: fixed;
            ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .nwg-embassy-badge {
            background: linear-gradient(135deg, #ff6b00, #ffd700);
            color: #000;
            padding: 12px 20px;
            border-radius: 50px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
            transition: all 0.3s ease;
            border: none;
        }
        
        .nwg-embassy-badge:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 30px rgba(255, 107, 0, 0.5);
        }
        
        .nwg-embassy-badge.verified {
            background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        
        .nwg-embassy-panel {
            position: absolute;
            ${position.includes('bottom') ? 'bottom: 60px;' : 'top: 60px;'}
            ${position.includes('right') ? 'right: 0;' : 'left: 0;'}
            width: 320px;
            background: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'};
            border: 2px solid ${partner.color};
            border-radius: 16px;
            padding: 24px;
            display: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            color: ${theme === 'dark' ? '#fff' : '#000'};
        }
        
        .nwg-embassy-panel.active {
            display: block;
            animation: nwgSlideIn 0.3s ease;
        }
        
        @keyframes nwgSlideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .nwg-embassy-panel h3 {
            margin: 0 0 16px;
            font-size: 18px;
            color: ${partner.color};
        }
        
        .nwg-embassy-panel p {
            margin: 0 0 16px;
            font-size: 14px;
            opacity: 0.8;
            line-height: 1.5;
        }
        
        .nwg-embassy-rewards {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
        }
        
        .nwg-embassy-reward {
            text-align: center;
            flex: 1;
            padding: 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
        }
        
        .nwg-embassy-reward-value {
            font-size: 24px;
            font-weight: 900;
        }
        
        .nwg-embassy-reward-value.nwg { color: #00d4ff; }
        .nwg-embassy-reward-value.wood { color: #c97f3d; }
        
        .nwg-embassy-reward-label {
            font-size: 11px;
            opacity: 0.6;
            text-transform: uppercase;
        }
        
        .nwg-embassy-btn {
            width: 100%;
            padding: 14px 20px;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .nwg-embassy-btn-primary {
            background: linear-gradient(135deg, #ff6b00, #ff4444);
            color: #fff;
        }
        
        .nwg-embassy-btn-primary:hover {
            transform: scale(1.02);
        }
        
        .nwg-embassy-btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .nwg-embassy-btn-secondary {
            background: transparent;
            border: 1px solid ${partner.color};
            color: ${partner.color};
            margin-top: 10px;
        }
        
        .nwg-embassy-status {
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 13px;
        }
        
        .nwg-embassy-status.verified {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
        
        .nwg-embassy-status.not-verified {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }
        
        .nwg-embassy-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            color: inherit;
            opacity: 0.5;
            cursor: pointer;
            font-size: 18px;
        }
        
        .nwg-embassy-close:hover {
            opacity: 1;
        }
    `;
    
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Widget state
    const state = {
        isOpen: false,
        citizenId: null,
        canClaim: false,
        lastClaim: null
    };
    
    // Check if user has NWG citizen ID
    // Priority: 1) URL param (from NWG referral) 2) localStorage (same-domain) 3) embassy storage
    function checkCitizenship() {
        // 1. Check URL for citizen ID (cross-domain referral from NWG)
        const urlParams = new URLSearchParams(window.location.search);
        const urlCitizenId = urlParams.get('nwg_citizen');
        if (urlCitizenId && urlCitizenId.startsWith('NW-')) {
            state.citizenId = urlCitizenId;
            // Store for future visits on this domain
            localStorage.setItem('nw_embassy_citizen', urlCitizenId);
            // Clean URL without reloading (optional UX improvement)
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
            return true;
        }
        
        // 2. Check same-domain localStorage (works in sandbox/same-domain setups)
        const walletData = localStorage.getItem('nw_wallet');
        if (walletData) {
            try {
                const wallet = JSON.parse(walletData);
                if (wallet.guestId && wallet.guestId.startsWith('NW-')) {
                    state.citizenId = wallet.guestId;
                    return true;
                }
            } catch (e) {}
        }
        
        // 3. Check embassy-specific storage (from previous URL referral)
        const embassyId = localStorage.getItem('nw_embassy_citizen');
        if (embassyId && embassyId.startsWith('NW-')) {
            state.citizenId = embassyId;
            return true;
        }
        
        return false;
    }
    
    // Check claim cooldown
    function checkClaimStatus() {
        const key = `nw_embassy_claim_${partnerId}`;
        const lastClaim = localStorage.getItem(key);
        
        if (!lastClaim) {
            state.canClaim = true;
            return { canClaim: true, nextClaim: null };
        }
        
        const lastTime = parseInt(lastClaim);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        
        if (now - lastTime >= cooldown) {
            state.canClaim = true;
            return { canClaim: true, nextClaim: null };
        }
        
        const remaining = cooldown - (now - lastTime);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        
        state.canClaim = false;
        return { canClaim: false, nextClaim: `${hours}h ${mins}m` };
    }
    
    // Render widget
    function render() {
        const isCitizen = checkCitizenship();
        const claimStatus = checkClaimStatus();
        
        const container = document.createElement('div');
        container.className = 'nwg-embassy-widget';
        container.innerHTML = `
            <button class="nwg-embassy-badge ${isCitizen ? 'verified' : ''}" onclick="NWGEmbassy.toggle()">
                🏛️ NWG Embassy ${isCitizen ? '✓' : ''}
            </button>
            <div class="nwg-embassy-panel" id="nwg-embassy-panel">
                <button class="nwg-embassy-close" onclick="NWGEmbassy.close()">✕</button>
                <h3>🏛️ NumbahWan Embassy</h3>
                
                <div class="nwg-embassy-status ${isCitizen ? 'verified' : 'not-verified'}">
                    ${isCitizen 
                        ? `✓ Citizen Verified<br><small>${state.citizenId}</small>` 
                        : '⚠️ Not a NWG Citizen'}
                </div>
                
                ${isCitizen ? `
                    <p>Welcome, citizen! Claim your daily Embassy reward:</p>
                    <div class="nwg-embassy-rewards">
                        <div class="nwg-embassy-reward">
                            <div class="nwg-embassy-reward-value nwg">+${partner.rewards.nwg}</div>
                            <div class="nwg-embassy-reward-label">NWG</div>
                        </div>
                        <div class="nwg-embassy-reward">
                            <div class="nwg-embassy-reward-value wood">+${partner.rewards.wood}</div>
                            <div class="nwg-embassy-reward-label">Wood</div>
                        </div>
                    </div>
                    <button class="nwg-embassy-btn nwg-embassy-btn-primary" 
                            onclick="NWGEmbassy.claim()" 
                            ${!claimStatus.canClaim ? 'disabled' : ''}>
                        ${claimStatus.canClaim ? '🎁 Claim Reward' : `⏳ Come back in ${claimStatus.nextClaim}`}
                    </button>
                ` : `
                    <p>You need to be a NumbahWan citizen to claim Embassy rewards. Visit NWG to get your citizen ID!</p>
                    <a href="${NWG_BASE_URL}/wallet" target="_blank" class="nwg-embassy-btn nwg-embassy-btn-primary" style="display: block; text-align: center; text-decoration: none;">
                        🎫 Get Citizenship
                    </a>
                `}
                
                <a href="${NWG_BASE_URL}/embassy" target="_blank" class="nwg-embassy-btn nwg-embassy-btn-secondary" style="display: block; text-align: center; text-decoration: none;">
                    Visit NWG Embassy
                </a>
            </div>
        `;
        
        document.body.appendChild(container);
    }
    
    // Widget API
    window.NWGEmbassy = {
        toggle() {
            const panel = document.getElementById('nwg-embassy-panel');
            if (panel) {
                state.isOpen = !state.isOpen;
                panel.classList.toggle('active', state.isOpen);
            }
        },
        
        open() {
            const panel = document.getElementById('nwg-embassy-panel');
            if (panel) {
                state.isOpen = true;
                panel.classList.add('active');
            }
        },
        
        close() {
            const panel = document.getElementById('nwg-embassy-panel');
            if (panel) {
                state.isOpen = false;
                panel.classList.remove('active');
            }
        },
        
        claim() {
            if (!state.citizenId) {
                alert('You need to be a NWG citizen first! Visit the NWG wallet page to register.');
                window.open(`${NWG_BASE_URL}/wallet`, '_blank');
                return;
            }
            
            if (!state.canClaim) {
                alert('Already claimed today! Come back tomorrow.');
                return;
            }
            
            // Record claim
            localStorage.setItem(`nw_embassy_claim_${partnerId}`, Date.now().toString());
            localStorage.setItem(`nw_embassy_claim_${partnerId}_by`, state.citizenId);
            
            // Add to local wallet storage (will sync when user visits NWG)
            const pendingRewards = JSON.parse(localStorage.getItem('nw_embassy_pending') || '[]');
            pendingRewards.push({
                partnerId,
                partnerName: partner.name,
                rewards: partner.rewards,
                claimedAt: Date.now(),
                citizenId: state.citizenId
            });
            localStorage.setItem('nw_embassy_pending', JSON.stringify(pendingRewards));
            
            // Show success with visual feedback
            const panel = document.getElementById('nwg-embassy-panel');
            if (panel) {
                const statusDiv = panel.querySelector('.nwg-embassy-status');
                if (statusDiv) {
                    statusDiv.className = 'nwg-embassy-status verified';
                    statusDiv.innerHTML = `🎉 Claimed!<br><small>+${partner.rewards.nwg} NWG, +${partner.rewards.wood} Wood</small>`;
                }
            }
            
            // Also show alert for clarity
            setTimeout(() => {
                alert(`🎉 Claimed ${partner.rewards.nwg} NWG + ${partner.rewards.wood} Wood!\n\nRewards will be added to your wallet when you visit NWG.`);
            }, 300);
            
            // Refresh widget
            document.querySelector('.nwg-embassy-widget')?.remove();
            render();
        },
        
        getCitizenId() {
            return state.citizenId;
        },
        
        isCitizen() {
            return state.citizenId !== null;
        },
        
        version: WIDGET_VERSION
    };
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
    
    console.log(`🏛️ NWG Embassy Widget v${WIDGET_VERSION} loaded for partner: ${partnerId}`);
})();
