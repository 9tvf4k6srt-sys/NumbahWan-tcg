/**
 * NumbahWan Economy System v3.0
 * THE WORLD'S MOST COVETED DIGITAL CURRENCY
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FIRST PRINCIPLES: Why Humans Want Currency
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1. SECURITY    → Store value safely (fixed supply + burn = deflation)
 * 2. STATUS      → Signal achievement (tier system + Sacred Log)
 * 3. ACCESS      → Unlock exclusives (tiered benefits)
 * 4. GROWTH      → Appreciation potential (burn + buyback)
 * 5. BELONGING   → Community identity (guild membership)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * WHY NWG BEATS BITCOIN:
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ Bitcoin: You buy it. You hold it. You hope it goes up. That's it.         │
 * │ NWG:     You EARN it. You USE it. You GROW with the community.            │
 * │          + Burn mechanics (deflation)                                      │
 * │          + Staking rewards (passive income)                                │
 * │          + Tier benefits (status + access)                                 │
 * │          + Merch buyback (real value backing)                              │
 * │          + Sacred Log (non-purchasable prestige - true achievement)        │
 * └────────────────────────────────────────────────────────────────────────────┘
 * 
 * 💵 USD → 💎 NWG → 🪙 Gold → ⧫ Sacred Log (prestige only)
 */

const NW_ECONOMY = {
    version: '3.0.0',
    
    // ═══════════════════════════════════════════════════════════════
    // CORE VALUE PROPOSITION
    // ═══════════════════════════════════════════════════════════════
    
    manifesto: {
        tagline: "The currency that rewards loyalty, not speculation.",
        pillars: [
            "EARN through play, not just pay",
            "BURN on every transaction (deflationary)",
            "STAKE to earn passive rewards", 
            "TIER UP for exclusive benefits",
            "BELONG to a community, not just a market"
        ],
        whyBetterThanCrypto: [
            "Bitcoin holders HOPE for gains. NWG holders EARN them.",
            "Bitcoin is speculation. NWG is participation.",
            "Bitcoin communities are anonymous. NWG guild is family.",
            "Bitcoin utility: store of value. NWG utility: play, collect, flex, earn."
        ]
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CORE EXCHANGE RATES
    // ═══════════════════════════════════════════════════════════════
    
    rates: {
        USD_TO_NWG: 100,          // $1 = 100 NWG (anchor rate)
        NWG_TO_GOLD: 10,          // 1 NWG = 10 Gold (one-way)
        
        // BURN RATES (Deflationary Mechanism)
        TRANSACTION_BURN: 0.01,   // 1% burned on every spend
        EXCHANGE_BURN: 0.02,      // 2% burned on currency exchange
        TRANSFER_BURN: 0.005,     // 0.5% burned on transfers
        
        // This means: The more NWG is used, the less exists.
        // Supply shrinks → Each NWG becomes more valuable.
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SUPPLY ECONOMICS (The Investment Thesis)
    // ═══════════════════════════════════════════════════════════════
    
    supply: {
        NWG_TOTAL: 1_000_000_000,      // 1 billion max (EVER)
        NWG_CIRCULATING: 0,            // Tracked in real-time
        NWG_BURNED: 0,                 // Forever destroyed
        NWG_STAKED: 0,                 // Locked for rewards
        
        // Allocation
        NWG_RESERVED: 400_000_000,     // 40% team/future (locked 2 years)
        NWG_REWARDS_POOL: 300_000_000, // 30% daily/achievement rewards
        NWG_STAKING_POOL: 100_000_000, // 10% staking rewards
        NWG_BUYBACK_FUND: 100_000_000, // 10% merch revenue buyback
        NWG_INITIAL_DIST: 100_000_000, // 10% initial distribution
        
        // Value Floor Guarantee
        // 10% of ALL merch revenue goes to buying back NWG from circulation
        // This creates REAL demand, not just speculation
        BUYBACK_PERCENTAGE: 0.10,
    },
    
    // ═══════════════════════════════════════════════════════════════
    // STAKING SYSTEM (Passive Income for Holders)
    // ═══════════════════════════════════════════════════════════════
    
    staking: {
        enabled: true,
        
        tiers: {
            flex: {
                name: 'Flexible',
                lockDays: 0,
                apyPercent: 3,        // 3% APY
                minAmount: 100,
                description: {
                    en: 'Withdraw anytime, earn 3% APY',
                    zh: '隨時提款，賺取 3% 年化',
                    th: 'ถอนได้ตลอด รับ 3% APY'
                }
            },
            bronze: {
                name: 'Bronze Lock',
                lockDays: 7,
                apyPercent: 8,        // 8% APY
                minAmount: 500,
                description: {
                    en: 'Lock 7 days, earn 8% APY',
                    zh: '鎖定 7 天，賺取 8% 年化',
                    th: 'ล็อค 7 วัน รับ 8% APY'
                }
            },
            silver: {
                name: 'Silver Lock',
                lockDays: 30,
                apyPercent: 15,       // 15% APY
                minAmount: 2000,
                bonusLogs: 1,         // Bonus Sacred Log!
                description: {
                    en: 'Lock 30 days, earn 15% APY + 1 Sacred Log',
                    zh: '鎖定 30 天，賺取 15% 年化 + 1 神聖原木',
                    th: 'ล็อค 30 วัน รับ 15% APY + 1 Sacred Log'
                }
            },
            gold: {
                name: 'Gold Lock',
                lockDays: 90,
                apyPercent: 25,       // 25% APY
                minAmount: 10000,
                bonusLogs: 3,         // 3 Sacred Logs!
                description: {
                    en: 'Lock 90 days, earn 25% APY + 3 Sacred Logs',
                    zh: '鎖定 90 天，賺取 25% 年化 + 3 神聖原木',
                    th: 'ล็อค 90 วัน รับ 25% APY + 3 Sacred Logs'
                }
            },
            diamond: {
                name: 'Diamond Lock',
                lockDays: 180,
                apyPercent: 40,       // 40% APY!
                minAmount: 50000,
                bonusLogs: 10,        // 10 Sacred Logs!
                revenueShare: 0.001,  // 0.1% of merch revenue
                description: {
                    en: 'Lock 180 days, earn 40% APY + 10 Sacred Logs + Revenue Share',
                    zh: '鎖定 180 天，賺取 40% 年化 + 10 神聖原木 + 收益分成',
                    th: 'ล็อค 180 วัน รับ 40% APY + 10 Sacred Logs + ส่วนแบ่งรายได้'
                }
            }
        },
        
        // Calculate staking reward
        calculateReward(amount, tier, days) {
            const tierInfo = this.tiers[tier];
            if (!tierInfo) return 0;
            
            const dailyRate = tierInfo.apyPercent / 100 / 365;
            return Math.floor(amount * dailyRate * days);
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MEMBERSHIP TIERS (Status + Access + Benefits)
    // ═══════════════════════════════════════════════════════════════
    
    memberTiers: {
        citizen: {
            name: { en: 'Citizen', zh: '公民', th: 'พลเมือง' },
            minNwg: 0,
            icon: '🌱',
            color: '#888888',
            benefits: {
                en: ['Basic gameplay access', 'Daily login rewards'],
                zh: ['基本遊戲功能', '每日登入獎勵'],
                th: ['เล่นเกมพื้นฐาน', 'รางวัลเข้าสู่ระบบรายวัน']
            }
        },
        bronze: {
            name: { en: 'Bronze', zh: '青銅', th: 'บรอนซ์' },
            minNwg: 100,
            icon: '🥉',
            color: '#cd7f32',
            benefits: {
                en: ['5% bonus on daily rewards', 'Bronze profile badge', 'Access to member-only events'],
                zh: ['每日獎勵 +5%', '青銅徽章', '會員專屬活動'],
                th: ['โบนัสรายวัน +5%', 'เหรียญบรอนซ์', 'กิจกรรมเฉพาะสมาชิก']
            }
        },
        silver: {
            name: { en: 'Silver', zh: '白銀', th: 'ซิลเวอร์' },
            minNwg: 1000,
            icon: '🥈',
            color: '#c0c0c0',
            benefits: {
                en: ['10% bonus on rewards', 'Silver badge', 'Early access to new cards (24h)', 'Priority support'],
                zh: ['獎勵 +10%', '白銀徽章', '新卡提前 24 小時', '優先客服'],
                th: ['โบนัส +10%', 'เหรียญซิลเวอร์', 'การ์ดใหม่ล่วงหน้า 24 ชม.', 'ซัพพอร์ตพิเศษ']
            }
        },
        gold: {
            name: { en: 'Gold', zh: '黃金', th: 'โกลด์' },
            minNwg: 10000,
            icon: '🥇',
            color: '#ffd700',
            benefits: {
                en: ['15% bonus on rewards', 'Gold badge', 'Vote on new card designs', 'Exclusive Discord role', 'Monthly Gold-only giveaway'],
                zh: ['獎勵 +15%', '黃金徽章', '新卡設計投票', '專屬 Discord 身份', '每月黃金抽獎'],
                th: ['โบนัส +15%', 'เหรียญโกลด์', 'โหวตการ์ดใหม่', 'Discord พิเศษ', 'แจกของรายเดือน']
            }
        },
        diamond: {
            name: { en: 'Diamond', zh: '鑽石', th: 'ไดมอนด์' },
            minNwg: 100000,
            icon: '💎',
            color: '#00d4ff',
            benefits: {
                en: ['25% bonus on rewards', 'Diamond badge (animated)', '0.1% revenue share', 'Name on credits', 'Direct line to founders', 'Free physical merch (quarterly)'],
                zh: ['獎勵 +25%', '鑽石徽章 (動態)', '0.1% 收益分成', '製作名單', '創辦人直線', '免費實體周邊 (季度)'],
                th: ['โบนัส +25%', 'เหรียญไดมอนด์ (เคลื่อนไหว)', 'ส่วนแบ่ง 0.1%', 'ชื่อในเครดิต', 'ติดต่อผู้ก่อตั้งโดยตรง', 'ของฟรีรายไตรมาส']
            }
        },
        mythic: {
            name: { en: 'Mythic', zh: '神話', th: 'มิธิค' },
            minNwg: 1000000,
            icon: '👑',
            color: '#ff00ff',
            benefits: {
                en: ['50% bonus on rewards', 'Mythic crown badge', '1% revenue share', 'Co-creator status', 'Design your own card', 'VIP IRL events', 'Lifetime membership'],
                zh: ['獎勵 +50%', '神話皇冠徽章', '1% 收益分成', '共同創作者身份', '設計專屬卡牌', 'VIP 實體活動', '終身會員'],
                th: ['โบนัส +50%', 'มงกุฎมิธิค', 'ส่วนแบ่ง 1%', 'ผู้ร่วมสร้าง', 'ออกแบบการ์ดของคุณ', 'อีเวนต์ VIP', 'สมาชิกตลอดชีพ']
            }
        }
    },
    
    // Get member tier based on NWG balance
    getMemberTier(nwgBalance) {
        const tiers = ['mythic', 'diamond', 'gold', 'silver', 'bronze', 'citizen'];
        for (const tier of tiers) {
            if (nwgBalance >= this.memberTiers[tier].minNwg) {
                return { id: tier, ...this.memberTiers[tier] };
            }
        }
        return { id: 'citizen', ...this.memberTiers.citizen };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 3-TIER CURRENCY SYSTEM
    // ═══════════════════════════════════════════════════════════════
    
    currencies: {
        // 💎 NWG - Premium Currency (The Investment)
        nwg: {
            id: 'nwg',
            name: 'NWG',
            fullName: 'NumbahWan Gold',
            icon: '◆',
            color: '#00d4ff',
            iconPath: '/static/icons/nwg.svg',
            tier: 'premium',
            purchasable: true,
            description: {
                en: 'Premium currency - Deflationary, stakeable, with real value backing',
                zh: '高級貨幣 - 通縮、可質押、有實際價值支撐',
                th: 'สกุลเงินพรีเมียม - เงินฝืด สเตคได้ มีมูลค่าจริงหนุน'
            },
            valueUSD: 0.01, // 1 NWG = $0.01 (anchor)
            investmentThesis: {
                en: [
                    '1% burned on every transaction (deflation)',
                    'Stake for up to 40% APY',
                    '10% of merch revenue backs NWG value',
                    'Tier benefits increase with holdings',
                    'Fixed supply: 1 billion max ever'
                ]
            },
            howToGet: [
                { method: 'Purchase', detail: '$1 = 100 NWG', icon: '💵' },
                { method: 'Stake Rewards', detail: 'Up to 40% APY', icon: '📈' },
                { method: 'Daily Login (Day 7)', detail: '+50 NWG', icon: '📅' },
                { method: 'Achievements', detail: 'Varies', icon: '🏆' },
                { method: 'Referrals', detail: '+100 NWG each', icon: '👥' }
            ],
            uses: [
                { action: 'Card Pull x1', cost: 10 },
                { action: 'Card Pull x10', cost: 90, note: 'Save 10%!' },
                { action: 'Stake for APY', cost: 100, note: 'Min stake' },
                { action: 'Convert to Gold', cost: 1, note: '= 10 Gold' },
                { action: 'Premium Merch', cost: 'varies' }
            ]
        },
        
        // 🪙 GOLD - Earned Currency (The Grind)
        gold: {
            id: 'gold',
            name: 'Gold',
            fullName: 'Gold',
            icon: '●',
            color: '#ffd700',
            iconPath: '/static/icons/gold.svg',
            tier: 'standard',
            purchasable: false,
            description: {
                en: 'Earned through gameplay - Your dedication rewarded',
                zh: '透過遊戲賺取 - 您的努力得到回報',
                th: 'ได้รับจากการเล่น - รางวัลจากความทุ่มเท'
            },
            valueUSD: 0.001, // 1 Gold = $0.001
            howToGet: [
                { method: 'Daily Login', detail: '+25-500 Gold', icon: '📅' },
                { method: 'Arcade Games', detail: '+10-500 Gold', icon: '🎮' },
                { method: 'Card Battles', detail: '+10-50 Gold', icon: '⚔️' },
                { method: 'Quests', detail: '+50-200 Gold', icon: '📋' },
                { method: 'Convert NWG', detail: '1 NWG = 10 Gold', icon: '💎' }
            ],
            uses: [
                { action: 'Card Pull x1', cost: 100 },
                { action: 'Card Pull x10', cost: 900 },
                { action: 'Card Upgrades', cost: 50, note: 'per level' },
                { action: 'Cosmetics', cost: 'varies' },
                { action: 'Basic Merch', cost: 'varies' }
            ]
        },
        
        // ⧫ SACRED LOG - Prestige Currency (The Flex)
        wood: {
            id: 'wood',
            name: 'Sacred Log',
            fullName: 'Sacred Log',
            icon: '⧫',
            color: '#00ff88',
            iconPath: '/static/icons/sacred-log.svg',
            tier: 'prestige',
            purchasable: false,
            tradeable: false,
            description: {
                en: 'Ultra rare prestige - NEVER purchasable. Proof of mastery.',
                zh: '超稀有威望 - 永遠無法購買。精通的證明。',
                th: 'หายากมาก - ซื้อไม่ได้เด็ดขาด หลักฐานแห่งความเชี่ยวชาญ'
            },
            valueUSD: null, // Priceless
            howToGet: [
                { method: 'Pull Mythic Card', detail: '+1 Log', icon: '🌟' },
                { method: '7-Day Login Streak', detail: '+1 Log', icon: '📅' },
                { method: 'Complete Card Set', detail: '+2 Logs', icon: '🃏' },
                { method: 'Top 10 Leaderboard', detail: '+3 Logs', icon: '🏆' },
                { method: 'Stake 30+ Days', detail: '+1-10 Logs', icon: '📈' },
                { method: 'Special Events', detail: 'Limited', icon: '🎉' }
            ],
            uses: [
                { action: 'Guaranteed Mythic', cost: 10, note: '100% Mythic!' },
                { action: 'Choose Any Legendary', cost: 5 },
                { action: 'Exclusive Merch Access', cost: 3 },
                { action: 'Custom Card Border', cost: 2 },
                { action: '"Legend" Title', cost: 1 }
            ]
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BURN MECHANISM (Deflationary)
    // ═══════════════════════════════════════════════════════════════
    
    burn: {
        // Track total burned
        totalBurned: 0,
        
        // Calculate burn amount
        calculateBurn(amount, type = 'transaction') {
            const rates = {
                transaction: NW_ECONOMY.rates.TRANSACTION_BURN,
                exchange: NW_ECONOMY.rates.EXCHANGE_BURN,
                transfer: NW_ECONOMY.rates.TRANSFER_BURN
            };
            const rate = rates[type] || rates.transaction;
            return Math.max(1, Math.floor(amount * rate)); // Minimum 1 burned
        },
        
        // Apply burn to transaction
        applyBurn(amount, type = 'transaction') {
            const burnAmount = this.calculateBurn(amount, type);
            this.totalBurned += burnAmount;
            NW_ECONOMY.supply.NWG_BURNED = this.totalBurned;
            
            console.log(`🔥 BURN: ${burnAmount} NWG destroyed (Total burned: ${this.totalBurned.toLocaleString()})`);
            
            return {
                originalAmount: amount,
                burnAmount: burnAmount,
                netAmount: amount - burnAmount,
                totalBurned: this.totalBurned
            };
        },
        
        // Get effective supply (total - burned - reserved)
        getEffectiveSupply() {
            return NW_ECONOMY.supply.NWG_TOTAL - this.totalBurned - NW_ECONOMY.supply.NWG_RESERVED;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // BUYBACK FUND (Real Value Backing)
    // ═══════════════════════════════════════════════════════════════
    
    buyback: {
        fundBalance: 0,
        totalBoughtBack: 0,
        
        // Add to fund (called when merch is sold)
        addToFund(merchRevenueUSD) {
            const buybackAmount = merchRevenueUSD * NW_ECONOMY.supply.BUYBACK_PERCENTAGE;
            this.fundBalance += buybackAmount;
            
            console.log(`💰 BUYBACK FUND: +$${buybackAmount.toFixed(2)} (Total: $${this.fundBalance.toFixed(2)})`);
            return this.fundBalance;
        },
        
        // Execute buyback (removes NWG from circulation)
        executeBuyback() {
            if (this.fundBalance < 10) return null; // Min $10 to execute
            
            const nwgToBuy = Math.floor(this.fundBalance * NW_ECONOMY.rates.USD_TO_NWG);
            this.totalBoughtBack += nwgToBuy;
            this.fundBalance = 0;
            
            // Bought back NWG goes to rewards pool
            console.log(`📈 BUYBACK EXECUTED: ${nwgToBuy.toLocaleString()} NWG removed from circulation`);
            
            return {
                nwgBoughtBack: nwgToBuy,
                totalBoughtBack: this.totalBoughtBack
            };
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // PRICING STRUCTURE
    // ═══════════════════════════════════════════════════════════════
    
    pullCosts: {
        single: { nwg: 10, gold: 100 },
        tenPull: { nwg: 90, gold: 900 },
        guaranteedRare: { nwg: 50 },
        guaranteedMythic: { wood: 10 }
    },
    
    dailyRewards: {
        day1: { gold: 50 },
        day2: { gold: 75 },
        day3: { gold: 100, nwg: 5 },
        day4: { gold: 150 },
        day5: { gold: 200, nwg: 10 },
        day6: { gold: 300 },
        day7: { gold: 500, nwg: 50, wood: 1 }
    },
    
    // NWG Purchase Packages (Better value at higher tiers)
    packages: [
        { id: 'starter', nwg: 500, usd: 4.99, bonus: 0, label: 'Starter', bonusPercent: 0 },
        { id: 'value', nwg: 1100, usd: 9.99, bonus: 100, label: 'Best Value', popular: true, bonusPercent: 10 },
        { id: 'pro', nwg: 2400, usd: 19.99, bonus: 400, label: 'Pro Pack', bonusPercent: 20 },
        { id: 'whale', nwg: 6500, usd: 49.99, bonus: 1500, label: 'Whale Pack', bonusPercent: 30 },
        { id: 'mega', nwg: 14000, usd: 99.99, bonus: 4000, label: 'Mega Pack', best: true, bonusPercent: 40 }
    ],
    
    merch: {
        digital: {
            wallpaper: { nwg: 50, name: 'Digital Wallpaper' },
            cardBack: { nwg: 100, name: 'Custom Card Back' },
            profileFrame: { gold: 500, name: 'Profile Frame' }
        },
        physical: {
            sticker: { nwg: 200, usd: 5, name: 'Sticker Pack' },
            pin: { nwg: 500, usd: 12, name: 'Enamel Pin' },
            mug: { nwg: 1000, usd: 25, name: 'Ceramic Mug' },
            tshirt: { nwg: 2000, usd: 35, name: 'T-Shirt' },
            hoodie: { wood: 10, usd: 75, name: 'OG Hoodie', exclusive: true }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // WIN-WIN VALUE EXCHANGE
    // ═══════════════════════════════════════════════════════════════
    
    valueExchange: {
        // What CUSTOMERS get:
        customerBenefits: [
            "Earn currency through gameplay (not just pay)",
            "Stake for passive income (up to 40% APY)",
            "Tier benefits increase with loyalty",
            "Sacred Log = true achievement (can't be bought)",
            "Revenue share at high tiers",
            "Deflationary model = holdings appreciate"
        ],
        
        // What NWG CREATORS get:
        creatorBenefits: [
            "Engaged community that plays regularly",
            "Revenue from NWG purchases",
            "Lower churn (staking incentivizes staying)",
            "Word of mouth (tier benefits worth sharing)",
            "Data on player engagement"
        ],
        
        // The WIN-WIN formula:
        formula: {
            en: "Players EARN and GROW wealth. Creators BUILD community and revenue. Both win together.",
            zh: "玩家賺取並增值財富。創作者建立社群和收入。雙贏。",
            th: "ผู้เล่นได้รับและเพิ่มพูนความมั่งคั่ง ผู้สร้างสร้างชุมชนและรายได้ ชนะด้วยกัน"
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    getCurrency(id) {
        if (id === 'diamond') id = 'nwg';
        return this.currencies[id] || null;
    },
    
    formatAmount(currencyId, amount) {
        if (currencyId === 'diamond') currencyId = 'nwg';
        const currency = this.currencies[currencyId];
        if (!currency) return amount.toLocaleString();
        return `${currency.icon} ${amount.toLocaleString()}`;
    },
    
    formatUSD(amount) {
        return `$${amount.toFixed(2)}`;
    },
    
    convertNWGtoGold(nwgAmount, applyBurn = true) {
        if (applyBurn) {
            const burnResult = this.burn.applyBurn(nwgAmount, 'exchange');
            return burnResult.netAmount * this.rates.NWG_TO_GOLD;
        }
        return nwgAmount * this.rates.NWG_TO_GOLD;
    },
    
    getNWGValueUSD(nwgAmount) {
        return nwgAmount / this.rates.USD_TO_NWG;
    },
    
    getPackage(id) {
        return this.packages.find(p => p.id === id);
    },
    
    canAfford(wallet, costs) {
        for (const [currency, amount] of Object.entries(costs)) {
            const currencyId = currency === 'diamond' ? 'nwg' : currency;
            if (amount && (!wallet[currencyId] || wallet[currencyId] < amount)) {
                return false;
            }
        }
        return true;
    },
    
    getAllCurrencies() {
        return Object.values(this.currencies).filter(c => c.id);
    },
    
    // Get investment summary for UI display
    getInvestmentSummary(nwgBalance) {
        const tier = this.getMemberTier(nwgBalance);
        const usdValue = this.getNWGValueUSD(nwgBalance);
        const effectiveSupply = this.burn.getEffectiveSupply();
        const percentOwned = (nwgBalance / effectiveSupply * 100).toFixed(6);
        
        return {
            balance: nwgBalance,
            usdValue: usdValue,
            tier: tier,
            percentOfSupply: percentOwned,
            effectiveSupply: effectiveSupply,
            totalBurned: this.burn.totalBurned,
            stakingOptions: this.staking.tiers
        };
    }
};

// Legacy support: diamond -> nwg alias
NW_ECONOMY.currencies.diamond = NW_ECONOMY.currencies.nwg;

// Export
if (typeof window !== 'undefined') {
    window.NW_ECONOMY = NW_ECONOMY;
}

console.log('%c💰 NW Economy v3.0 - The World\'s Most Coveted Digital Currency', 
    'background: linear-gradient(90deg, #00d4ff, #ffd700, #00ff88); color: #000; font-size: 14px; padding: 6px 12px; border-radius: 4px; font-weight: bold;');
console.log('%c◆ NWG (Premium + Deflationary + Stakeable) → ● Gold (Earned) → ⧫ Sacred Log (Prestige)', 
    'color: #888; font-size: 11px;');
console.log('%c🔥 1% BURN on transactions | 📈 Up to 40% APY staking | 💎 Tier benefits', 
    'color: #00d4ff; font-size: 11px;');
