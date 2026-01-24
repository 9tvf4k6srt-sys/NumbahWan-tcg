# NumbahWan Guild Website

> "We are not just a guild, but FAMILY"

## Project Overview
- **Name**: NumbahWan Guild
- **Game**: MapleStory Idle RPG (TW Server)
- **Goal**: Stunning guild website showcasing our journey to #1
- **Tech Stack**: Hono.js + Cloudflare Pages + TailwindCSS + GSAP
- **Last Updated**: January 24, 2026

## Live URLs
- **Development Sandbox**: https://3000-i5ckr5xqw5agx5xlntcoc-dfc00ec5.sandbox.novita.ai
- **Production**: Deploy to Cloudflare Pages using `npm run deploy`

---

## Current Features

### 1. Hero Section
- Animated pixel art "N" emblem (guild logo)
- GSAP-powered text animations with neon glow effects
- Floating particle system
- Aurora gradient background
- Custom N-emblem mouse cursor

### 2. Trilingual Support (EN/中文/ไทย)
- Language toggle in navbar
- All content syncs on language change including:
  - Section headings
  - Member descriptions
  - Photo captions
  - Stats labels
  - Footer text

### 3. Member Roster ("The Family")
- 12 guild members with custom avatars
- Each avatar is meaningful based on member's name
- Stats: Level, CP, Contribution, Upgrades
- Role badges: Master, Vice Master, 領導 (Leader), Member
- Online status indicators
- Glass card hover animations

### 4. CP Race Leaderboard
- Visual bar comparison of all members
- Animated progress bars on scroll
- Medal rankings (Gold, Silver, Bronze)

### 5. Road to #1 Progress
- Guild Level, Total CP, Members
- Boss raids, Server ranking, Milestones

### 6. Guild Shenanigans (Photo Gallery)
- 6 guild photos with localized titles/descriptions
- Glassmorphic photo cards

### 7. Background Music (BGM)
- YouTube embed (Kerning City theme)
- Toggle button with loading/error states
- Visual feedback: Loading (yellow spin), Error (red shake), Playing (green pulse), Muted (gray)

### 8. Mobile Optimized
- Cannot zoom out (min-scale=1.0)
- Can zoom in up to 5x
- No horizontal overflow
- Responsive hamburger menu

---

## Member Roster (Updated 2026-01-24)

| Name | Level | CP | Role | Avatar Theme |
|------|-------|-----|------|--------------|
| RegginA | 77 | 2B 382M | Master | White masked warrior |
| Yuluner晴 | 75 | 1B 247M | Member | 晴=sunny - Cheerful sun |
| Natehouoho | 72 | 959M 627K | Member | Playful adventurer |
| RegginO | 73 | 566M 603K | Vice Master | Pink hair flower crown |
| 紈稻税著 | 71 | 458M 115K | 領導 | Sleepy gamer with phone 📱😴 |
| 騎鳥回家 | 70 | 354M 744K | Member | Riding bird home |
| 阿光Yo | 67 | 144M 110K | Member | 光=light - Light mage |
| TW#VWQG7R9C03 | 65 | 99M 969K | Member | Mystery anonymous |
| 碼農小孫 | 61 | 22M 566K | Member | 碼農=coder - Programmer |
| 小亨寶寶 | 54 | 13M 174K | Member | 寶寶=baby - Cute baby |
| 泰拳寒玉 | 49 | 7,567,864 | Member | Thai boxer cold jade |
| 葉陽 | 46 | 2,572,190 | Member | 葉陽=leaf+sun - Nature |

---

## File Structure

```
webapp/
├── src/
│   └── index.tsx          # Main app (all HTML/CSS/JS inline)
├── public/static/
│   ├── favicon.svg
│   ├── gm-portrait.jpg    # Guild master portrait
│   ├── hero-banner.jpg
│   ├── guild-base.jpg
│   ├── guild-fun-1~6.jpg  # Gallery photos
│   └── avatar-*.png       # Member avatars (12 files)
├── package.json
├── wrangler.jsonc
├── tsconfig.json
├── vite.config.ts
├── ecosystem.config.cjs   # PM2 config for dev server
└── README.md
```

### Avatar File Naming Convention
```
avatar-[username]-[description].png
Examples:
- avatar-reggina-master-masked-warrior.png
- avatar-wandaoshuizhu-sleepy-gamer.png
- avatar-qiniaohuijia-riding-bird.png
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start dev server (in sandbox)
pm2 start ecosystem.config.cjs

# Restart after code changes
npm run build && pm2 restart numbahwan-guild

# View logs
pm2 logs --nostream

# Deploy to Cloudflare Pages
npm run deploy
```

---

## Key Code Locations in src/index.tsx

| Feature | Line Range (approx) |
|---------|---------------------|
| Member data array | Lines 11-35 |
| Translations (EN/ZH/TH) | Lines 40-190 |
| CSS Styles | Lines 207-870 |
| Hero Section HTML | Lines 900-960 |
| About Section | Lines 960-1050 |
| Roster Cards | Lines 1050-1150 |
| CP Leaderboard | Lines 1150-1250 |
| Progress Section | Lines 1250-1350 |
| Gallery Section | Lines 1350-1450 |
| Footer | Lines 1450-1500 |
| JavaScript (GSAP, BGM, etc) | Lines 1550-1800 |

---

## Recent Changes History

1. **Zoom Control** - Prevent zoom out, allow zoom in
2. **Meaningful Avatars** - Each avatar matches member name meaning
3. **BGM System** - YouTube embed with loading/error states
4. **Name Fix** - Corrected to 紈稻税著
5. **Trilingual** - EN/中文/ไทย with full content sync
6. **Custom Cursor** - N emblem follows mouse

---

## TODO / Future Improvements

- [ ] Humorous content section about RegginA's costume (Zakum Arms cape, Seal costume, beard)
- [ ] Photo upload feature for guild members
- [ ] Real-time member stats API integration
- [ ] Deploy to production Cloudflare Pages
- [ ] Push to GitHub repository

---

## Credits
- **Guild**: NumbahWan (小可愛)
- **Server**: Taiwan (TW)
- **Game**: MapleStory Idle RPG
- **Built with**: Hono + Cloudflare + TailwindCSS + GSAP

---

*Made with ❤️ by the NumbahWan family*
