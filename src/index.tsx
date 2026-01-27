import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'

// Import data from JSON files (Single Source of Truth pattern)
import rosterData from './data/roster.json'
import photosData from './data/photos.json'
import translationsData from './data/translations.json'
import performanceData from './data/performance.json'

const app = new Hono()

// Serve static files with caching headers
app.use('/static/*', serveStatic())

// ============================================================================
// API ROUTES - Data Layer (Scalability Pattern: Separate Data from Presentation)
// ============================================================================

// API: Get translations (for all pages to share)
app.get('/api/i18n', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(translationsData)
})

// API: Get roster data
app.get('/api/roster', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  return c.json(rosterData)
})

// API: Get photos data
app.get('/api/photos', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return c.json(photosData)
})

// API: Get performance tracking data (snapshots, gains, commentary)
app.get('/api/performance', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
  return c.json(performanceData)
})

// ============================================================================
// MEMBER ROSTER DATA - Last Updated: 2026-01-26
// ============================================================================
// Avatar naming convention: avatar-[username]-[description].jpg
// All avatars stored in /public/static/ with meaningful names for easy debugging
// ============================================================================

// Use data from JSON files (Single Source of Truth)
const previousCP: Record<string, number> = rosterData.previousCP
const members = rosterData.members

// Sort by CP for leaderboard
const sortedMembers = [...members].sort((a, b) => b.cpValue - a.cpValue)
const maxCP = sortedMembers[0].cpValue

// Guild Fun photos data with actual images
const guildFunPhotos = [
  { id: 1, title: { en: "Henesys Market Day", zh: "乾坤西斯市集日", th: "วันตลาดเฮเนซิส" }, description: { en: "Shopping with the squad!", zh: "和夥伴們一起逛街！", th: "ช้อปปิ้งกับทีม!" }, image: "/static/guild-fun-1.jpg" },
  { id: 2, title: { en: "Selfie Time!", zh: "自拍時間！", th: "เวลาเซลฟี่!" }, description: { en: "Best friends forever", zh: "永遠的好朋友", th: "เพื่อนที่ดีที่สุดตลอดไป" }, image: "/static/guild-fun-2.jpg" },
  { id: 3, title: { en: "Sunset Chill", zh: "夕陽時光", th: "พักผ่อนยามเย็น" }, description: { en: "RegginA & friend on cloud nine", zh: "RegginA和朋友在雲端", th: "RegginA และเพื่อนบนเมฆ" }, image: "/static/guild-fun-3.jpg" },
  { id: 4, title: { en: "Wings of Destiny", zh: "命運之翼", th: "ปีกแห่งโชคชะตา" }, description: { en: "Power couple goals", zh: "戰力夫妻目標", th: "เป้าหมายคู่รักสุดแกร่ง" }, image: "/static/guild-fun-4.jpg" },
  { id: 5, title: { en: "First Time Together", zh: "第一次一起", th: "ครั้งแรกด้วยกัน" }, description: { en: "Where it all began", zh: "一切的開始", th: "จุดเริ่มต้นของทุกอย่าง" }, image: "/static/guild-fun-5.jpg" },
  { id: 6, title: { en: "Boss Raid!", zh: "打王啦！", th: "บุกบอส!" }, description: { en: "Kerning City throwdown", zh: "乾坤城大戰", th: "ศึกเคอร์นิ่งซิตี้" }, image: "/static/guild-fun-6.jpg" },
]

// Translations now imported from src/data/translations.json via translationsData

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <!-- FIRST PAINT LOADER - renders before anything else, even before charset -->
    <style>*{margin:0;padding:0}html,body{background:#0a0a0f}#fp{position:fixed;inset:0;background:#0a0a0f;z-index:999999;display:flex;align-items:center;justify-content:center}#fp svg{width:80px;height:80px;animation:fpp 1.5s ease-in-out infinite}@keyframes fpp{0%,100%{transform:scale(1);filter:drop-shadow(0 0 15px #ff6b00)}50%{transform:scale(1.15);filter:drop-shadow(0 0 30px #ffd700)}}.fp-hide{display:none!important}</style>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>NumbahWan Guild | MapleStory Idle RPG</title>
    
    <!-- App Icons - iOS, Android, PWA -->
    <link rel="icon" type="image/png" sizes="32x32" href="/static/icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/static/icons/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/static/icons/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#ff6b00">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="NumbahWan">
    <!-- FULL LOADING SCREEN - replaces first-paint loader -->
    <style id="instant-loader-styles">
      #instant-loader{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0a0a0f 0%,#1a1a2e 50%,#0a0a0f 100%);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .5s,visibility .5s}
      #instant-loader.hidden{opacity:0;visibility:hidden;pointer-events:none}
      .il-aurora{position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at 20% 20%,rgba(255,107,0,.2) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,157,77,.15) 0%,transparent 50%);animation:ilAurora 8s ease-in-out infinite}
      @keyframes ilAurora{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
      .il-emblem{width:120px;height:120px;animation:ilPulse 2s ease-in-out infinite;filter:drop-shadow(0 0 20px rgba(255,107,0,.8))}
      @keyframes ilPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
      .il-ring{position:absolute;border:2px solid transparent;border-radius:50%;border-top-color:#ff6b00;border-right-color:#ffd700}
      .il-ring-1{width:150px;height:150px;animation:ilSpin 3s linear infinite}
      .il-ring-2{width:170px;height:170px;animation:ilSpin 4s linear infinite reverse;border-top-color:#ffd700;border-right-color:#ff6b00}
      @keyframes ilSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
      .il-title{font-family:Arial,sans-serif;font-size:clamp(1.2rem,4vw,2rem);font-weight:700;background:linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-top:30px;animation:ilGlow 2s ease-in-out infinite}
      @keyframes ilGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(255,107,0,.8))}50%{filter:drop-shadow(0 0 20px rgba(255,215,0,1))}}
      .il-dots{display:flex;gap:8px;margin-top:20px}
      .il-dot{width:10px;height:10px;background:#ff6b00;border-radius:50%;animation:ilBounce 1.4s ease-in-out infinite;box-shadow:0 0 10px #ff6b00}
      .il-dot:nth-child(2){animation-delay:.2s;background:#ffd700;box-shadow:0 0 10px #ffd700}
      .il-dot:nth-child(3){animation-delay:.4s}
      @keyframes ilBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
      #fp{display:none}
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/nw-core.css">
    <script src="/static/nw-effects.js" defer></script>
    <script src="/static/bgm.js" defer></script>
    <script src="/static/click-juice.js" defer></script>
    <script src="/static/icons/icons.js" defer></script>
    <style>
        :root {
            --primary: #ff6b00;
            --primary-light: #ff9d4d;
            --primary-dark: #cc5500;
            --bg-dark: #0a0a0f;
            --bg-card: rgba(255, 107, 0, 0.05);
            --glass: rgba(255, 255, 255, 0.05);
            --neon-glow: #ff6b00;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* Prevent zoom out - fill entire viewport */
        html {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            background: var(--bg-dark);
        }
        
        body {
            font-family: 'Orbitron', sans-serif;
            background: var(--bg-dark);
            color: #fff;
            overflow-x: hidden;
            min-height: 100vh;
            min-width: 100vw;
            position: relative;
            cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='nG' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ffb347'/%3E%3Cstop offset='100%25' stop-color='%238B4513'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='10' y='8' width='24' height='84' rx='3' fill='url(%23nG)'/%3E%3Crect x='66' y='8' width='24' height='84' rx='3' fill='url(%23nG)'/%3E%3Cpolygon points='10,8 34,8 90,92 66,92' fill='url(%23nG)'/%3E%3C/svg%3E") 12 12, auto;
        }
        
        .pixel-font {
            font-family: 'Press Start 2P', cursive;
        }
        
        /* ============================================
           LIVING BACKGROUND SYSTEM
           - Multi-layer aurora waves
           - Floating maple leaves (MapleStory themed)
           - Glowing magic orbs
           ============================================ */
        
        /* Aurora gradient background - Enhanced with multiple layers */
        .aurora-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        
        /* Aurora Layer 1 - Main orange glow */
        .aurora-bg::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: 
                radial-gradient(ellipse at 30% 20%, rgba(255, 107, 0, 0.25) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 60%, rgba(255, 157, 77, 0.2) 0%, transparent 45%),
                radial-gradient(ellipse at 20% 80%, rgba(255, 140, 0, 0.15) 0%, transparent 40%);
            animation: auroraWave1 15s ease-in-out infinite;
        }
        
        /* Aurora Layer 2 - Deeper accent */
        .aurora-bg::after {
            content: '';
            position: absolute;
            inset: -50%;
            background: 
                radial-gradient(ellipse at 60% 30%, rgba(139, 69, 19, 0.2) 0%, transparent 50%),
                radial-gradient(ellipse at 40% 70%, rgba(255, 200, 100, 0.1) 0%, transparent 40%);
            animation: auroraWave2 20s ease-in-out infinite;
        }
        
        @keyframes auroraWave1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(5%, -3%) scale(1.05); }
            50% { transform: translate(-3%, 5%) scale(1.1); }
            75% { transform: translate(-5%, -2%) scale(1.05); }
        }
        
        @keyframes auroraWave2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(-4%, 4%) rotate(3deg); }
            66% { transform: translate(4%, -3%) rotate(-3deg); }
        }
        
        /* ============================================
           MAPLE LEAVES - Floating Animation
           ============================================ */
        #maple-leaves {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }
        
        .maple-leaf {
            position: absolute;
            opacity: 0;
            filter: drop-shadow(0 0 3px rgba(255, 140, 0, 0.5));
            animation: leafFall linear infinite;
        }
        
        @keyframes leafFall {
            0% {
                opacity: 0;
                transform: translateY(-10vh) rotate(0deg) translateX(0);
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                opacity: 0;
                transform: translateY(110vh) rotate(720deg) translateX(100px);
            }
        }
        
        /* Different leaf variations */
        .maple-leaf.type-1 { animation-duration: 18s; }
        .maple-leaf.type-2 { animation-duration: 22s; animation-direction: reverse; }
        .maple-leaf.type-3 { animation-duration: 15s; }
        .maple-leaf.type-4 { animation-duration: 25s; }
        
        /* ============================================
           MAGIC ORBS - Floating glow particles
           ============================================ */
        #magic-orbs {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }
        
        .magic-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(1px);
            animation: orbFloat ease-in-out infinite;
        }
        
        .magic-orb.orange {
            background: radial-gradient(circle, rgba(255, 140, 0, 0.9) 0%, rgba(255, 107, 0, 0.4) 50%, transparent 70%);
            box-shadow: 0 0 20px rgba(255, 140, 0, 0.6), 0 0 40px rgba(255, 107, 0, 0.3);
        }
        
        .magic-orb.gold {
            background: radial-gradient(circle, rgba(255, 215, 0, 0.8) 0%, rgba(255, 180, 0, 0.3) 50%, transparent 70%);
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.5), 0 0 30px rgba(255, 200, 0, 0.2);
        }
        
        .magic-orb.amber {
            background: radial-gradient(circle, rgba(255, 191, 0, 0.7) 0%, rgba(255, 150, 0, 0.3) 50%, transparent 70%);
            box-shadow: 0 0 12px rgba(255, 191, 0, 0.4);
        }
        
        @keyframes orbFloat {
            0%, 100% {
                transform: translate(0, 0) scale(1);
                opacity: 0.6;
            }
            25% {
                transform: translate(30px, -50px) scale(1.2);
                opacity: 0.9;
            }
            50% {
                transform: translate(-20px, -80px) scale(0.8);
                opacity: 0.5;
            }
            75% {
                transform: translate(40px, -30px) scale(1.1);
                opacity: 0.8;
            }
        }
        
        /* Glassmorphism */
        .glass-card {
            background: rgba(255, 107, 0, 0.08);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 107, 0, 0.2);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        /* Neon text effect */
        .neon-text {
            color: #fff;
            text-shadow: 
                0 0 5px #fff,
                0 0 10px #fff,
                0 0 20px var(--primary),
                0 0 40px var(--primary),
                0 0 80px var(--primary);
        }
        
        .neon-orange {
            text-shadow: 
                0 0 5px var(--primary),
                0 0 10px var(--primary),
                0 0 20px var(--primary),
                0 0 40px var(--primary-dark);
        }
        
        /* Pixel art N emblem - SVG based, smooth connected pixels with gradient */
        .emblem-n {
            width: 60px;
            height: 60px;
            filter: drop-shadow(0 0 8px rgba(255, 140, 0, 0.6));
            transition: all 0.3s ease;
        }
        
        .emblem-n:hover {
            filter: drop-shadow(0 0 15px rgba(255, 140, 0, 0.9));
            transform: scale(1.05);
        }
        
        /* Large emblem for hero */
        .emblem-n-large {
            width: 120px;
            height: 120px;
            filter: drop-shadow(0 0 15px rgba(255, 140, 0, 0.7));
        }
        
        .emblem-n-large:hover {
            filter: drop-shadow(0 0 25px rgba(255, 140, 0, 0.95));
        }
        
        /* Pixel-style title - single line, responsive, CENTERED */
        .pixel-title {
            font-family: 'Press Start 2P', cursive;
            font-size: clamp(2rem, 8vw, 6rem);
            display: block !important;
            width: 100% !important;
            max-width: 100vw;
            margin: 0 auto !important;
            text-align: center !important;
            padding: 0 1rem;
            box-sizing: border-box;
            background: linear-gradient(180deg, #ffcc70 0%, #ff9500 30%, #ff6b00 60%, #cc4400 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 0 30px rgba(255, 107, 0, 0.95)) drop-shadow(0 0 60px rgba(255, 107, 0, 0.7));
            letter-spacing: 0.02em;
            white-space: nowrap;
        }
        
        /* Hero banner with image - RegginA centered */
        .hero-banner {
            position: relative;
            width: 100%;
            min-height: 100vh;
            background: url('/static/hero-banner.jpg') center 30% / contain no-repeat;
            background-color: #1a1a2e;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            padding-bottom: 5vh;
        }
        
        @media (min-width: 768px) {
            .hero-banner {
                background-size: cover;
                background-position: center center;
                justify-content: center;
                padding-bottom: 0;
            }
        }
        
        .hero-banner::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(10,10,15,0.1) 0%, rgba(10,10,15,0.3) 40%, rgba(10,10,15,0.85) 85%, rgba(10,10,15,0.98) 100%);
            z-index: 1;
        }
        
        .hero-content {
            position: relative;
            z-index: 2;
            text-align: center;
            padding: 2rem;
        }
        
        /* Guild master portrait */
        .gm-portrait {
            border-radius: 16px;
            border: 4px solid var(--primary);
            box-shadow: 0 0 30px rgba(255, 107, 0, 0.5);
            transition: all 0.4s ease;
        }
        
        .gm-portrait:hover {
            transform: scale(1.02);
            box-shadow: 0 0 50px rgba(255, 107, 0, 0.8);
        }
        
        .pixel-title-outline::before {
            content: attr(data-text);
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            -webkit-text-stroke: 3px rgba(139, 69, 19, 0.6);
            z-index: -1;
        }
        
        /* Navigation */
        .nav-link {
            position: relative;
            padding: 0.5rem 1rem;
            transition: all 0.3s ease;
        }
        
        .nav-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 0;
            height: 2px;
            background: var(--primary);
            transition: all 0.3s ease;
            transform: translateX(-50%);
            box-shadow: 0 0 10px var(--primary);
        }
        
        .nav-link:hover::after {
            width: 100%;
        }
        
        .nav-link:hover {
            color: var(--primary);
            text-shadow: 0 0 10px var(--primary);
        }
        
        /* Magnetic button effect */
        .magnetic-btn {
            position: relative;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            cursor: pointer;
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .magnetic-btn:hover {
            box-shadow: 0 0 30px var(--primary), 0 0 60px rgba(255, 107, 0, 0.5);
        }
        
        .magnetic-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s ease;
        }
        
        .magnetic-btn:hover::before {
            left: 100%;
        }
        
        /* Progress bar */
        .progress-container {
            background: rgba(255, 107, 0, 0.1);
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(255, 107, 0, 0.3);
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-dark), var(--primary), var(--primary-light));
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        }
        
        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        
        /* CP Race bar */
        .cp-bar {
            height: 24px;
            background: linear-gradient(90deg, 
                var(--primary-dark) 0%, 
                var(--primary) 50%, 
                var(--primary-light) 100%);
            border-radius: 4px;
            position: relative;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
        }
        
        .cp-bar::after {
            content: '';
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: #fff;
            border-radius: 0 4px 4px 0;
            box-shadow: 0 0 10px #fff;
        }
        
        /* Member card */
        .member-card {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .member-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(255, 107, 0, 0.3);
        }
        
        /* Role badges */
        .role-master { background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%); color: #000; }
        .role-vice { background: linear-gradient(135deg, #c0c0c0 0%, #808080 100%); color: #000; }
        .role-leader { background: linear-gradient(135deg, #cd7f32 0%, #8b4513 100%); }
        .role-inactive { background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%); color: #fff; }
        .role-member { background: rgba(255, 107, 0, 0.3); }
        
        /* Online indicator */
        .online-dot {
            width: 12px;
            height: 12px;
            background: #00ff00;
            border-radius: 50%;
            animation: pulse 2s infinite;
            box-shadow: 0 0 10px #00ff00;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        /* ============================================
           PREMIUM 3D CARD CAROUSEL - Aniimo Style
           Fan-out cards with glassmorphism
           ============================================ */
        
        /* Gallery Section Background */
        .gallery-section {
            position: relative;
            overflow: hidden;
            background: linear-gradient(180deg, 
                rgba(10, 10, 15, 0.95) 0%,
                rgba(20, 10, 30, 0.9) 50%,
                rgba(10, 10, 15, 0.95) 100%);
        }
        
        /* Floating Background Text (parallax layer) */
        .gallery-bg-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: clamp(4rem, 15vw, 12rem);
            font-weight: 900;
            text-transform: uppercase;
            color: transparent;
            -webkit-text-stroke: 1px rgba(255, 107, 0, 0.15);
            letter-spacing: 0.1em;
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            opacity: 0.5;
        }
        
        /* ============================================
           STACKED DECK CAROUSEL - Zero Jitter
           Cards stacked like a deck, swipe to fan out
           ============================================ */
        
        /* Deck Container - No scroll, pure transforms */
        .card-deck {
            position: relative;
            width: 100%;
            height: 480px;
            display: flex;
            align-items: center;
            justify-content: center;
            perspective: 1500px;
            overflow: visible;
            touch-action: pan-y;
            user-select: none;
        }
        
        /* Individual Card in Deck */
        .deck-card {
            position: absolute;
            width: 300px;
            height: 420px;
            border-radius: 20px;
            overflow: hidden;
            cursor: grab;
            
            /* CRITICAL: GPU-only transforms, no layout changes */
            transform-style: preserve-3d;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            will-change: transform, opacity;
            
            /* NO CSS transition - JS controls smooth animation */
            /* This prevents jitter and allows momentum physics */
            
            /* Glassmorphism */
            background: linear-gradient(145deg, 
                rgba(30, 30, 40, 0.9) 0%, 
                rgba(20, 20, 30, 0.95) 100%);
            border: 1px solid rgba(255, 140, 0, 0.2);
            box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(255, 107, 0, 0.1);
        }
        
        .deck-card:active {
            cursor: grabbing;
        }
        
        /* Card positions in deck - Fanned out sideways */
        .deck-card[data-position="-3"] {
            transform: translateX(-420px) translateZ(-150px) rotateY(25deg) scale(0.75);
            opacity: 0.3;
            filter: brightness(0.5) blur(2px);
            z-index: 1;
        }
        
        .deck-card[data-position="-2"] {
            transform: translateX(-280px) translateZ(-100px) rotateY(18deg) scale(0.82);
            opacity: 0.5;
            filter: brightness(0.6) blur(1px);
            z-index: 2;
        }
        
        .deck-card[data-position="-1"] {
            transform: translateX(-150px) translateZ(-50px) rotateY(10deg) scale(0.9);
            opacity: 0.75;
            filter: brightness(0.8);
            z-index: 3;
        }
        
        /* ACTIVE CENTER CARD - Full glow */
        .deck-card[data-position="0"] {
            transform: translateX(0) translateZ(50px) rotateY(0deg) scale(1);
            opacity: 1;
            filter: brightness(1);
            z-index: 10;
            border-color: rgba(255, 140, 0, 0.5);
            box-shadow: 
                0 30px 60px -10px rgba(0, 0, 0, 0.5),
                0 0 60px rgba(255, 107, 0, 0.5),
                0 0 100px rgba(255, 140, 0, 0.3),
                0 0 140px rgba(255, 180, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        
        .deck-card[data-position="1"] {
            transform: translateX(150px) translateZ(-50px) rotateY(-10deg) scale(0.9);
            opacity: 0.75;
            filter: brightness(0.8);
            z-index: 3;
        }
        
        .deck-card[data-position="2"] {
            transform: translateX(280px) translateZ(-100px) rotateY(-18deg) scale(0.82);
            opacity: 0.5;
            filter: brightness(0.6) blur(1px);
            z-index: 2;
        }
        
        .deck-card[data-position="3"] {
            transform: translateX(420px) translateZ(-150px) rotateY(-25deg) scale(0.75);
            opacity: 0.3;
            filter: brightness(0.5) blur(2px);
            z-index: 1;
        }
        
        /* Hidden cards beyond visible range */
        .deck-card[data-position^="-"][data-position*="4"],
        .deck-card[data-position^="-"][data-position*="5"],
        .deck-card[data-position="4"],
        .deck-card[data-position="5"],
        .deck-card.hidden-card {
            transform: translateX(0) translateZ(-200px) scale(0.5);
            opacity: 0;
            pointer-events: none;
            z-index: 0;
        }
        
        /* Hover effect on visible cards */
        .deck-card:not([data-position="0"]):hover {
            filter: brightness(0.95);
        }
        
        /* Active card hover - extra pop */
        .deck-card[data-position="0"]:hover {
            transform: translateX(0) translateZ(70px) rotateY(0deg) scale(1.02);
            box-shadow: 
                0 35px 70px -10px rgba(0, 0, 0, 0.5),
                0 0 80px rgba(255, 107, 0, 0.6),
                0 0 120px rgba(255, 140, 0, 0.4),
                0 0 160px rgba(255, 180, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        /* Card image - FULL PICTURE visible */
        .deck-card img.card-image {
            width: 100%;
            height: calc(100% - 70px); /* Leave space for text */
            object-fit: contain; /* Show full image, no crop */
            object-position: center top;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.3);
        }
        
        /* Card overlay gradient - subtle */
        .deck-card .card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg,
                transparent 0%,
                transparent 60%,
                rgba(0, 0, 0, 0.8) 100%);
            pointer-events: none;
        }
        
        /* ============================================
           LIGHTBOX - Full screen image viewer
           ============================================ */
        .lightbox {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            backdrop-filter: blur(10px);
        }
        
        .lightbox.active {
            opacity: 1;
            visibility: visible;
        }
        
        .lightbox img {
            max-width: 95vw;
            max-height: 90vh;
            object-fit: contain;
            border-radius: 12px;
            box-shadow: 0 0 60px rgba(255, 107, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        }
        
        .lightbox.active img {
            transform: scale(1);
        }
        
        .lightbox-close {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.3);
            border: 2px solid rgba(255, 107, 0, 0.5);
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .lightbox-close:hover {
            background: rgba(255, 107, 0, 0.6);
            transform: scale(1.1);
        }
        
        .lightbox-info {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            color: #fff;
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        
        .lightbox-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: #ff9500;
            margin-bottom: 4px;
        }
        
        .lightbox-desc {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.8);
        }
        
        .lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.2);
            border: 2px solid rgba(255, 107, 0, 0.4);
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .lightbox-nav:hover {
            background: rgba(255, 107, 0, 0.5);
        }
        
        .lightbox-nav.prev { left: 20px; }
        .lightbox-nav.next { right: 20px; }
        
        /* Card content */
        .deck-card .card-content {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            pointer-events: none;
        }
        
        .deck-card .card-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
            margin-bottom: 4px;
        }
        
        .deck-card .card-desc {
            font-size: 0.85rem;
            color: rgba(255, 200, 150, 0.9);
        }
        
        /* Card index badge */
        .deck-card .card-index {
            position: absolute;
            top: 12px;
            left: 12px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff6b00, #ff9500);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.8rem;
            color: #fff;
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.4);
            pointer-events: none;
        }
        
        /* Navigation dots */
        .deck-nav {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
        }
        
        .deck-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.25);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .deck-dot.active {
            background: linear-gradient(135deg, #ff6b00, #ffd700);
            box-shadow: 0 0 12px rgba(255, 107, 0, 0.6);
            transform: scale(1.2);
        }
        
        .deck-dot:hover:not(.active) {
            background: rgba(255, 107, 0, 0.5);
        }
        
        /* Swipe hint */
        .swipe-hint {
            text-align: center;
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.75rem;
            margin-top: 12px;
        }
        
        /* Mobile adjustments */
        @media (max-width: 768px) {
            .deck-card {
                width: 260px;
                height: 360px;
            }
            
            .deck-card[data-position="-2"],
            .deck-card[data-position="2"],
            .deck-card[data-position="-3"],
            .deck-card[data-position="3"] {
                opacity: 0;
                pointer-events: none;
            }
            
            .deck-card[data-position="-1"] {
                transform: translateX(-100px) translateZ(-30px) rotateY(8deg) scale(0.88);
            }
            
            .deck-card[data-position="1"] {
                transform: translateX(100px) translateZ(-30px) rotateY(-8deg) scale(0.88);
            }
            
            .card-deck {
                height: 420px;
            }
        }
        
        /* Gradient overlay for text readability */
        .photo-card .card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
                180deg,
                transparent 0%,
                transparent 40%,
                rgba(0, 0, 0, 0.3) 60%,
                rgba(0, 0, 0, 0.85) 100%
            );
            transition: opacity 0.4s ease;
        }
        
        /* Card content area */
        .photo-card .card-content {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 24px;
            transform: translateY(10px);
            opacity: 0.8;
            transition: all 0.4s ease;
        }
        
        .photo-card:hover .card-content,
        .photo-card.active .card-content {
            transform: translateY(0);
            opacity: 1;
        }
        
        /* Card title with glow */
        .photo-card .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            margin-bottom: 4px;
        }
        
        /* Card description */
        .photo-card .card-desc {
            font-size: 0.875rem;
            color: rgba(255, 200, 150, 0.9);
            text-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
        }
        
        /* Card index indicator */
        .photo-card .card-index {
            position: absolute;
            top: 16px;
            left: 16px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.875rem;
            color: #fff;
            box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4);
        }
        
        /* Scroll indicators */
        .carousel-nav {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 24px;
        }
        
        .carousel-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.3);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .carousel-dot.active {
            width: 24px;
            border-radius: 4px;
            background: linear-gradient(90deg, #ff6b00, #ffd700);
            box-shadow: 0 0 15px rgba(255, 107, 0, 0.5);
        }
        
        /* Scroll hint arrows */
        .carousel-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255, 107, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 107, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 20;
            color: #fff;
            font-size: 1.5rem;
        }
        
        .carousel-arrow:hover {
            background: rgba(255, 107, 0, 0.4);
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
        }
        
        .carousel-arrow.prev { left: 16px; }
        .carousel-arrow.next { right: 16px; }
        
        @media (max-width: 768px) {
            .photo-card {
                flex: 0 0 280px;
                height: 380px;
            }
            .photo-carousel {
                padding-left: calc(50% - 140px);
                padding-right: calc(50% - 140px);
            }
            .carousel-arrow {
                display: none;
            }
        }
        
        /* Scroll animations */
        .reveal {
            opacity: 0;
            transform: translateY(50px);
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: var(--bg-dark);
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 4px;
        }
        
        /* Particle container */
        #particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        }
        
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--primary);
            border-radius: 50%;
            opacity: 0.6;
            box-shadow: 0 0 6px var(--primary);
        }
        
        /* Section styles */
        section {
            position: relative;
            z-index: 1;
        }
        
        /* Stats counter */
        .stat-number {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(135deg, var(--primary-light), var(--primary), var(--primary-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        /* Leaderboard crown */
        .crown {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 1.5rem;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-5px); }
        }
        
        /* Icon styles */
        .custom-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }
        
        .custom-icon svg {
            width: 100%;
            height: 100%;
        }
        
        /* Liquid Glass Menu */
        .liquid-glass-menu {
            background: linear-gradient(135deg, 
                rgba(255, 107, 0, 0.15) 0%, 
                rgba(139, 69, 19, 0.1) 50%,
                rgba(255, 107, 0, 0.15) 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 107, 0, 0.3);
            border-radius: 24px;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 0 40px rgba(255, 107, 0, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        .liquid-glass-menu::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent, 
                rgba(255, 255, 255, 0.1), 
                transparent);
            animation: liquidShine 4s ease-in-out infinite;
        }
        
        @keyframes liquidShine {
            0%, 100% { left: -100%; }
            50% { left: 100%; }
        }
        
        .menu-item {
            background: rgba(255, 107, 0, 0.1);
            border: 1px solid rgba(255, 107, 0, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        
        .menu-item:hover {
            background: rgba(255, 107, 0, 0.25);
            border-color: rgba(255, 107, 0, 0.5);
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 24px rgba(255, 107, 0, 0.3);
        }
        
        .menu-item::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--primary-light));
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }
        
        .menu-item:hover::after {
            transform: scaleX(1);
        }
        
        .menu-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-bottom: 0.75rem;
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.4);
        }
        
        .menu-emblem {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
        }
        
        /* Hamburger Menu Button */
        .hamburger-icon {
            width: 20px;
            height: 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .hamburger-icon span {
            display: block;
            height: 2px;
            width: 100%;
            background: var(--primary);
            border-radius: 2px;
            transition: all 0.3s ease;
        }
        
        .hamburger-btn.active .hamburger-icon span:nth-child(1) {
            transform: rotate(45deg) translate(4px, 4px);
        }
        
        .hamburger-btn.active .hamburger-icon span:nth-child(2) {
            opacity: 0;
        }
        
        .hamburger-btn.active .hamburger-icon span:nth-child(3) {
            transform: rotate(-45deg) translate(4px, -4px);
        }
        
        /* Dropdown Menu */
        .nav-dropdown {
            animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .dropdown-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem 0.5rem;
            border-radius: 12px;
            background: rgba(255, 107, 0, 0.1);
            border: 1px solid rgba(255, 107, 0, 0.2);
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
        }
        
        .dropdown-item:hover {
            background: rgba(255, 107, 0, 0.25);
            border-color: rgba(255, 107, 0, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
        }
        
        .dropdown-item.highlight {
            background: rgba(255, 107, 0, 0.2);
            border-color: rgba(255, 107, 0, 0.4);
        }
        

    </style>
</head>
<body data-nw-progress data-nw-backtop>
    <!-- FIRST PAINT LOADER - ultra minimal, shows in first bytes -->
    <div id="fp"><svg viewBox="0 0 100 100"><defs><linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffcc70"/><stop offset="50%" stop-color="#ff6b00"/><stop offset="100%" stop-color="#8B4513"/></linearGradient></defs><rect x="10" y="8" width="24" height="84" rx="3" fill="url(#ng)"/><rect x="66" y="8" width="24" height="84" rx="3" fill="url(#ng)"/><polygon points="10,8 34,8 90,92 66,92" fill="url(#ng)"/></svg></div>
    <!-- FULL LOADING SCREEN - replaces first paint once styles load -->
    <div id="instant-loader">
        <div class="il-aurora"></div>
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;z-index:10">
            <div style="position:relative;width:120px;height:120px">
                <div class="il-ring il-ring-1" style="position:absolute;top:-15px;left:-15px"></div>
                <div class="il-ring il-ring-2" style="position:absolute;top:-25px;left:-25px"></div>
                <svg class="il-emblem" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <defs><linearGradient id="ilGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffcc70"/><stop offset="30%" stop-color="#ff9500"/><stop offset="60%" stop-color="#ff6b00"/><stop offset="100%" stop-color="#8B4513"/></linearGradient></defs>
                    <rect x="10" y="8" width="24" height="84" rx="3" fill="url(#ilGrad)"/>
                    <rect x="66" y="8" width="24" height="84" rx="3" fill="url(#ilGrad)"/>
                    <polygon points="10,8 34,8 90,92 66,92" fill="url(#ilGrad)"/>
                </svg>
            </div>
            <div class="il-title">NumbahWan</div>
            <div class="il-dots"><div class="il-dot"></div><div class="il-dot"></div><div class="il-dot"></div></div>
        </div>
    </div>
    <script>
        // Hide first-paint loader immediately (full loader takes over)
        var fp=document.getElementById('fp');if(fp)fp.style.display='none';
        // Hide full loader when page is ready (min 500ms display time)
        (function(){
            var startTime = Date.now();
            var minDisplay = 500;
            function hideLoader() {
                var elapsed = Date.now() - startTime;
                var remaining = Math.max(0, minDisplay - elapsed);
                setTimeout(function() {
                    var loader = document.getElementById('instant-loader');
                    if (loader) {
                        loader.classList.add('hidden');
                        setTimeout(function() { loader.remove(); }, 500);
                    }
                    var fp = document.getElementById('fp');
                    if (fp) fp.remove();
                }, remaining);
            }
            if (document.readyState === 'complete') { hideLoader(); }
            else { window.addEventListener('load', hideLoader); }
        })();
    </script>
    
    <!-- Aurora Background - Enhanced multi-layer -->
    <div class="aurora-bg" data-nw-parallax="0.3"></div>
    
    <!-- Floating Maple Leaves (MapleStory themed) -->
    <div id="maple-leaves"></div>
    
    <!-- Magic Orbs (subtle glowing particles) -->
    <div id="magic-orbs"></div>
    
    <!-- Particles (original system) -->
    <div id="particles"></div>
    
    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 rounded-full">
        <div class="container mx-auto px-4 py-3 flex items-center justify-between">
            <!-- Logo -->
            <a href="#hero" class="flex items-center gap-2">
                <div id="nav-emblem">${generateEmblemSVG('emblem-n', 40)}</div>
                <span class="pixel-font text-xs text-orange-400 hidden sm:inline">NumbahWan</span>
            </a>
            
            <!-- Hamburger Menu Button -->
            <button onclick="toggleNavMenu()" class="hamburger-btn p-2 rounded-lg hover:bg-orange-500/20 transition-all" aria-label="Menu">
                <div class="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>
            
            <div class="flex items-center gap-2">
                <!-- Language Switcher -->
                <div class="relative" id="lang-switcher">
                    <button onclick="toggleLangMenu()" class="px-2 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-orange-500/20 transition-all border border-orange-500/30">
                        <span id="current-lang-flag">🇬🇧</span>
                        <span id="current-lang-code" class="hidden sm:inline">EN</span>
                    </button>
                    <div id="lang-menu" class="hidden absolute right-0 top-full mt-2 glass-card rounded-lg overflow-hidden min-w-[120px] z-50">
                        <button onclick="setLanguage('en')" class="w-full px-4 py-2 text-left hover:bg-orange-500/20 flex items-center gap-2 text-sm">
                            <span>🇬🇧</span> English
                        </button>
                        <button onclick="setLanguage('zh')" class="w-full px-4 py-2 text-left hover:bg-orange-500/20 flex items-center gap-2 text-sm">
                            <span>🇹🇼</span> 繁體中文
                        </button>
                        <button onclick="setLanguage('th')" class="w-full px-4 py-2 text-left hover:bg-orange-500/20 flex items-center gap-2 text-sm">
                            <span>🇹🇭</span> ไทย
                        </button>
                    </div>
                </div>
                <button class="magnetic-btn text-xs sm:text-sm px-3 py-2" onclick="window.location.href='/apply'" data-i18n="joinUs">
                    Join Us
                </button>
            </div>
        </div>
    </nav>
    
    <!-- Dropdown Menu Panel - Simple & Clean -->
    <div id="nav-dropdown" class="fixed top-20 left-4 right-4 z-40 glass-card rounded-2xl p-4 hidden nav-dropdown">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <!-- CP Ranking -->
            <a href="#race" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ffd700" d="M19 5H17V3H7V5H5C3.9 5 3 5.9 3 7V8C3 10.2 4.6 12 6.7 12.5C7.4 14 8.9 15.1 10.6 15.4L10 17H8V19H16V17H14L13.4 15.4C15.1 15.1 16.6 14 17.3 12.5C19.4 12 21 10.2 21 8V7C21 5.9 20.1 5 19 5ZM5 8V7H7V10.5C5.8 10 5 9.1 5 8ZM19 8C19 9.1 18.2 10 17 10.5V7H19V8Z"/><rect fill="#ffd700" x="9" y="19" width="6" height="2"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="cpLeaderboard">CP Ranking</span>
                <span class="text-xs text-gray-400">#47 Server</span>
            </a>
            
            <!-- Members -->
            <a href="#roster" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><circle fill="#ff6b00" cx="9" cy="7" r="4"/><path fill="#ff6b00" d="M2 20C2 16 5 13 9 13C13 13 16 16 16 20H2Z"/><circle fill="#ffd700" cx="17" cy="8" r="3"/><path fill="#ffd700" d="M13 20C13 16.5 15 14 17 14C19 14 22 16.5 22 20H13Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="theFamily">Members</span>
                <span class="text-xs text-gray-400">12 Family</span>
            </a>
            
            <!-- Gallery -->
            <a href="#gallery" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ec4899" d="M20 5H17L15 3H9L7 5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5Z"/><circle fill="#0a0a0f" cx="12" cy="13" r="5"/><circle fill="#ffd700" cx="12" cy="13" r="3"/><circle fill="#fff" cx="10" cy="11" r="1"/></svg>
                <span class="font-bold text-pink-400 text-sm" data-i18n="shenanigans">Photos</span>
                <span class="text-xs text-gray-400">6 Pics</span>
            </a>
            
            <!-- Memes -->
            <a href="/memes" class="dropdown-item" data-nw-transition>
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><rect fill="#ffd700" x="3" y="3" width="18" height="18" rx="3"/><circle fill="#0a0a0f" cx="8" cy="9" r="2"/><circle fill="#0a0a0f" cx="16" cy="9" r="2"/><path fill="#0a0a0f" d="M7 15Q12 20 17 15" stroke="#0a0a0f" stroke-width="2" fill="none"/></svg>
                <span class="font-bold text-yellow-400 text-sm" data-i18n="memes">Memes</span>
                <span class="text-xs text-gray-400">15 LOLs</span>
            </a>
            
            <!-- Arcade -->
            <a href="/arcade" class="dropdown-item highlight" data-nw-transition>
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><rect fill="#9333ea" x="2" y="8" width="20" height="12" rx="2"/><circle fill="#22c55e" cx="7" cy="14" r="2"/><circle fill="#ef4444" cx="17" cy="12" r="1.5"/><circle fill="#3b82f6" cx="17" cy="16" r="1.5"/><rect fill="#ffd700" x="10" y="11" width="4" height="6" rx="1"/></svg>
                <span class="font-bold text-purple-400 text-sm" data-i18n="arcade">Arcade</span>
                <span class="text-xs text-green-400">🎮 Play!</span>
            </a>
            
            <!-- Fortune -->
            <a href="/fortune" class="dropdown-item" data-nw-transition>
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><circle fill="#a855f7" cx="12" cy="10" r="8"/><ellipse fill="#0a0a0f" cx="12" cy="20" rx="5" ry="2" opacity="0.7"/><circle fill="#fff" cx="8" cy="7" r="2" opacity="0.5"/><path fill="#ffd700" d="M10 11L12 9L15 12L12 14L10 11Z" opacity="0.6"/></svg>
                <span class="font-bold text-purple-400 text-sm" data-i18n="dailyFortune">Fortune</span>
                <span class="text-xs text-purple-300">🔮 Daily</span>
            </a>
            
            <!-- Merch -->
            <a href="/merch" class="dropdown-item" data-nw-transition>
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#a855f7" d="M5 7H19L21 21H3L5 7Z"/><path fill="none" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round" d="M8 7V5C8 3 9.8 1.5 12 1.5C14.2 1.5 16 3 16 5V7"/><rect fill="#ffd700" x="9" y="11" width="6" height="2" rx="1"/></svg>
                <span class="font-bold text-purple-400 text-sm" data-i18n="exclusiveMerch">Merch</span>
                <span class="text-xs text-yellow-400">👕 Shop</span>
            </a>
            
            <!-- Join Us -->
            <a href="/apply" class="dropdown-item highlight" data-nw-transition>
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ff6b00" d="M12 2C12 2 6 8 6 14C6 16 7 18 8 19L10 17V14L12 12L14 14V17L16 19C17 18 18 16 18 14C18 8 12 2 12 2Z"/><circle fill="#0a0a0f" cx="12" cy="10" r="2.5"/><circle fill="#3b82f6" cx="12" cy="10" r="1.5"/><path fill="#ff4500" d="M10 19L8 23L10 21L12 24L14 21L16 23L14 19H10Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="joinUs">Join Us</span>
                <span class="text-xs text-green-400">🔥 Apply</span>
            </a>
        </div>
        
        <!-- Secondary Row - Less Important -->
        <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-orange-500/20">
            <a href="#progress" onclick="closeNavMenu()" class="text-center p-2 rounded-lg hover:bg-orange-500/10 transition-all">
                <span class="text-lg">📈</span>
                <span class="block text-[10px] text-gray-400" data-i18n="roadToOne">Progress</span>
            </a>
            <a href="/pvp" class="text-center p-2 rounded-lg hover:bg-orange-500/10 transition-all" data-nw-transition>
                <span class="text-lg">⚔️</span>
                <span class="block text-[10px] text-gray-400" data-i18n="gmPvp">PvP</span>
            </a>
            <a href="/fashion" class="text-center p-2 rounded-lg hover:bg-orange-500/10 transition-all" data-nw-transition>
                <span class="text-lg">👗</span>
                <span class="block text-[10px] text-gray-400" data-i18n="gmFashion">Fashion</span>
            </a>
            <a href="#about" onclick="closeNavMenu()" class="text-center p-2 rounded-lg hover:bg-orange-500/10 transition-all">
                <span class="text-lg">👑</span>
                <span class="block text-[10px] text-gray-400" data-i18n="guildMaster">RegginA</span>
            </a>
        </div>
    </div>
    
    <!-- Hero Section with Banner Image -->
    <section id="hero" class="hero-banner" data-nw-particles="25">
        <div class="hero-content w-full max-w-4xl mx-auto">
            <div class="flex justify-center mb-6" id="hero-emblem">
                ${generateEmblemSVG('emblem-n emblem-n-large', 100)}
            </div>
            <h1 class="pixel-title mb-4 nw-text-glow" id="guild-name" data-nw-reveal="scale" style="display: block; width: 100%; text-align: center; margin-left: auto; margin-right: auto;">
                NumbahWan
            </h1>
            <p class="text-xl md:text-2xl text-orange-300 mb-6 nw-text-gradient" id="tagline" data-nw-reveal="up" data-nw-delay="0.2s" data-i18n="tagline">
                MapleStory Idle RPG Guild
            </p>
            <div class="glass-card p-4 md:p-6 max-w-xl mx-auto mb-8 nw-glow-pulse" id="motto-card" data-nw-reveal="up" data-nw-delay="0.3s">
                <p class="text-base md:text-xl italic text-orange-200">
                    "<span data-i18n="motto">We are not just a guild, but</span> <span class="text-orange-400 font-bold" data-i18n="family">FAMILY</span>"
                </p>
            </div>
            
            <div class="flex flex-wrap justify-center gap-4 opacity-0" id="hero-buttons">
                <button class="magnetic-btn nw-btn-shine" data-nw-magnetic data-nw-ripple onclick="document.getElementById('roster').scrollIntoView({behavior: 'smooth'})">
                    ${iconSword()} <span data-i18n="meetFamily">Meet The Family</span>
                </button>
                <button class="magnetic-btn nw-btn-shine" data-nw-magnetic data-nw-ripple style="background: transparent; border: 2px solid var(--primary);" onclick="document.getElementById('progress').scrollIntoView({behavior: 'smooth'})">
                    ${iconTrophy()} <span data-i18n="ourJourney">Our Journey</span>
                </button>
            </div>
        </div>
        
        <!-- Scroll indicator - positioned lower to avoid overlap -->
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 z-10" id="scroll-indicator">
            <div class="w-5 h-8 border-2 border-orange-400/60 rounded-full flex justify-center">
                <div class="w-1 h-2 bg-orange-400 rounded-full mt-1.5 animate-bounce"></div>
            </div>
        </div>
    </section>
    
    <!-- About Section -->
    <section id="about" class="py-20 px-4">
        <div class="container mx-auto max-w-6xl">
            <h2 class="text-4xl font-bold text-center mb-12 neon-orange reveal">
                <span data-i18n="aboutTitle">About NumbahWan</span>
            </h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="glass-card p-8 text-center nw-hover-lift nw-glow" data-nw-reveal="up" data-nw-tilt>
                    <div class="stat-number nw-text-gradient" data-nw-counter="12">0</div>
                    <p class="text-orange-300 mt-2" data-i18n="familyMembers">Family Members</p>
                </div>
                <div class="glass-card p-8 text-center nw-hover-lift nw-glow" data-nw-reveal="up" data-nw-delay="0.1s" data-nw-tilt>
                    <div class="stat-number nw-text-gradient" data-nw-counter="76">0</div>
                    <p class="text-orange-300 mt-2" data-i18n="highestLevel">Highest Level</p>
                </div>
                <div class="glass-card p-8 text-center nw-hover-lift nw-glow" data-nw-reveal="up" data-nw-delay="0.2s" data-nw-tilt>
                    <div class="stat-number nw-text-gradient" data-nw-counter="2">0</div>
                    <p class="text-orange-300 mt-2" data-i18n="billionCP">Billion+ CP</p>
                </div>
            </div>
            <!-- Guild Master Section -->
            <div class="glass-card p-8 mt-12 reveal">
                <div class="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 class="text-2xl font-bold text-orange-400 mb-4">${iconStar()} <span data-i18n="guildMaster">Our Guild Master</span></h3>
                        <div class="flex items-center gap-4 mb-4">
                            <svg class="nw-icon" width="48" height="48" style="color:#ffd700"><use href="/static/icons/nw-icons.svg#crown"></use></svg>
                            <div>
                                <p class="text-2xl font-bold text-white">RegginA</p>
                                <p class="text-orange-300">Level 78 • CP: 3B 521M</p>
                            </div>
                        </div>
                        
                        <!-- Live HP/MP Bars -->
                        <div class="mb-4 relative" id="live-hp-container">
                            <div class="bg-gradient-to-b from-gray-800/80 to-gray-900/80 rounded-lg p-3 border border-gray-600/50">
                                <!-- Mode & Potion Indicator -->
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-2 text-xs">
                                        <span id="combat-mode-icon">🌾</span>
                                        <span id="combat-mode-text" class="text-yellow-300 font-bold" data-i18n="hpFarming">Farming</span>
                                    </div>
                                    <div id="potion-indicator" class="hidden items-center gap-1 text-xs animate-bounce">
                                        <span>🧪</span>
                                        <span class="text-green-400 font-bold" data-i18n="potionHeal">+20% HP</span>
                                    </div>
                                </div>
                                
                                <!-- HP Bar -->
                                <div class="mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-pink-400 font-bold text-xs w-7">HP</span>
                                        <div class="flex-1 h-4 bg-gray-900 rounded-sm border border-gray-600 overflow-hidden relative">
                                            <div id="hp-bar-fill" class="h-full bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 transition-all duration-300" style="width: 98%;"></div>
                                            <div class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                                        </div>
                                        <span id="hp-current" class="text-yellow-300 font-bold text-xs w-24 text-right">2,012,280</span>
                                    </div>
                                </div>
                                
                                <!-- MP Bar -->
                                <div class="mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-cyan-400 font-bold text-xs w-7">MP</span>
                                        <div class="flex-1 h-3 bg-gray-900 rounded-sm border border-gray-600 overflow-hidden relative">
                                            <div id="mp-bar-fill" class="h-full bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 transition-all duration-300" style="width: 73%;"></div>
                                            <div class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                                        </div>
                                        <span id="mp-current" class="text-cyan-300 font-bold text-xs w-24 text-right">1,203</span>
                                    </div>
                                </div>
                                
                                <!-- Combat Log -->
                                <div id="combat-log" class="text-[10px] text-gray-400 h-3 overflow-hidden text-center italic transition-opacity"></div>
                            </div>
                        </div>
                        
                        <p class="text-gray-300 leading-relaxed" data-i18n="gmDesc">
                            The legendary leader of NumbahWan, RegginA leads by example - always at the frontline protecting the family.
                        </p>
                        <p class="text-gray-300 leading-relaxed mt-4 italic">
                            "<span data-i18n="gmQuote">We rise together, we fall together. That's the NumbahWan way.</span>"
                        </p>
                    </div>
                    <div class="flex justify-center">
                        <img src="/static/gm-portrait.jpg" alt="Guild Master RegginA" class="gm-portrait w-full max-w-sm rounded-lg" />
                    </div>
                </div>
            </div>
            
            <!-- Our Story Section -->
            <div class="glass-card p-8 mt-8 reveal">
                <div class="grid md:grid-cols-2 gap-8 items-center">
                    <div class="flex justify-center order-2 md:order-1">
                        <img src="/static/guild-base.jpg" alt="NumbahWan Guild Base" class="gm-portrait w-full max-w-md rounded-lg" />
                    </div>
                    <div class="order-1 md:order-2">
                        <h3 class="text-2xl font-bold text-orange-400 mb-4">${iconStar()} <span data-i18n="ourStory">Our Story</span></h3>
                        <p class="text-gray-300 leading-relaxed" data-i18n="storyText1">
                            NumbahWan started with a simple dream - to become the #1 guild in MapleStory Idle RPG.
                        </p>
                        <p class="text-gray-300 leading-relaxed mt-4" data-i18n="storyText2">
                            What makes us special isn't just our CP or rankings - it's our bond. Whether it's boss raids or just hanging out, we're always there for each other.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Member Roster Section - Stacked Deck -->
    <section id="roster" class="gallery-section py-20 px-4 relative">
        <!-- Parallax Background Text -->
        <div class="gallery-bg-text" id="roster-bg-text">FAMILY</div>
        
        <div class="container mx-auto max-w-7xl relative z-10">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconUsers()} <span data-i18n="theFamily">The Family</span>
            </h2>
            <p class="text-center text-orange-300 mb-8 reveal" data-i18n="rosterDesc">Meet our amazing guild members</p>
            
            <!-- Stacked Deck - Member Cards -->
            <div class="card-deck" id="member-deck">
                ${members.map((member, index) => `
                    <div class="deck-card" data-index="${index}" data-position="${index}">
                        <div class="card-overlay"></div>
                        <div class="card-index">${index + 1}</div>
                        
                        ${index === 0 ? '<div class="absolute top-3 right-3 text-2xl" style="animation: bounce 1s infinite">👑</div>' : ''}
                        
                        <!-- Member Avatar -->
                        <div class="absolute top-8 left-1/2 -translate-x-1/2">
                            ${member.avatar 
                                ? `<img src="${member.avatar}" alt="${member.name}" class="w-20 h-20 rounded-full object-cover border-3 border-orange-500 shadow-lg shadow-orange-500/30" loading="lazy" />`
                                : `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl font-bold">
                                    ${member.name.charAt(0).toUpperCase()}
                                </div>`
                            }
                            ${member.online ? '<span class="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></span>' : ''}
                        </div>
                        
                        <!-- Member Info -->
                        <div class="card-content" style="padding-top: 90px;">
                            <h3 class="card-title text-center text-lg mb-0">${member.name}</h3>
                            <p class="text-center text-orange-300 text-sm mb-3">Lv. ${member.level}</p>
                            
                            <div class="space-y-2 text-xs">
                                <div class="flex justify-between px-2 py-1 bg-black/30 rounded">
                                    <span class="text-gray-400">CP</span>
                                    <span class="text-orange-400 font-bold">${member.cp}</span>
                                </div>
                                <div class="flex justify-between px-2 py-1">
                                    <span class="text-gray-400">Contrib</span>
                                    <span class="text-orange-300">${member.contribution}</span>
                                </div>
                            </div>
                            
                            <div class="mt-3 flex justify-center">
                                <span class="px-3 py-1 rounded-full text-xs font-bold ${
                                    member.role === 'Master' ? 'role-master' : 
                                    member.role === 'Vice Master' ? 'role-vice' : 
                                    member.role === '領導' ? 'role-leader' :
                                    member.role === '小可愛' ? 'role-inactive' : 'role-member'
                                }">
                                    ${member.role}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Navigation Dots -->
            <div class="deck-nav" id="member-deck-nav">
                ${members.map((_, index) => `
                    <div class="deck-dot ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToMemberCard(${index})"></div>
                `).join('')}
            </div>
            <p class="swipe-hint">← Swipe or click cards →</p>
        </div>
    </section>
    
    <!-- CP Race Section -->
    <section id="race" class="py-20 px-4">
        <div class="container mx-auto max-w-5xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconRace()} <span data-i18n="cpLeaderboard">CP Race</span>
            </h2>
            <p class="text-center text-orange-300 mb-8 reveal" data-i18n="leaderboardDesc">Who's the strongest?</p>
            
            <!-- Race Stats Bar -->
            <div class="glass-card p-4 mb-6 border border-gray-700" data-nw-reveal="slide">
                <div class="grid grid-cols-3 gap-3 text-center text-sm">
                    <div class="border-r border-gray-700">
                        <p class="text-gray-500 text-xs" data-i18n="weeklyMvp">Weekly MVP</p>
                        <p class="font-bold text-yellow-400">${performanceData.weeklyHighlights.mvp}</p>
                        <p class="text-green-400 text-xs">${performanceData.weeklyHighlights.mvpGain}</p>
                    </div>
                    <div class="border-r border-gray-700">
                        <p class="text-gray-500 text-xs" data-i18n="guildGrowth">Guild Growth</p>
                        <p class="font-bold text-orange-400">${performanceData.weeklyHighlights.totalGuildGain}</p>
                        <p class="text-green-400 text-xs">${performanceData.weeklyHighlights.totalGuildGainPercent}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-xs" data-i18n="slackerAward">Slacker Award</p>
                        <p class="font-bold text-gray-400">${performanceData.weeklyHighlights.slacker}</p>
                        <p class="text-red-400 text-xs" data-i18n="noGains">+0% gains</p>
                    </div>
                </div>
            </div>
            
            <div class="glass-card p-6" data-nw-reveal="scale">
                <!-- Race Header -->
                <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-700 text-xs">
                    <span class="text-gray-500"><span data-i18n="raceUpdate">Updated</span>: ${performanceData.lastUpdated}</span>
                    <span class="text-gray-500"><span data-i18n="vsLast">vs last update</span></span>
                </div>
                
                <div class="space-y-4">
                    ${sortedMembers.map((member, index) => {
                        const percentage = (member.cpValue / maxCP) * 100
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
                        const prevCP = previousCP[member.name] || member.cpValue
                        const cpGain = member.cpValue - prevCP
                        const cpGainPercent = prevCP > 0 ? ((cpGain / prevCP) * 100).toFixed(1) : 0
                        const gainDisplay = cpGain > 0 
                          ? `<span class="text-green-400 text-xs font-bold">▲ +${cpGain >= 1000000000 ? (cpGain/1000000000).toFixed(1) + 'B' : cpGain >= 1000000 ? (cpGain/1000000).toFixed(0) + 'M' : (cpGain/1000).toFixed(0) + 'K'} (${cpGainPercent}%)</span>`
                          : cpGain < 0
                          ? `<span class="text-red-400 text-xs">▼ ${(cpGain/1000000).toFixed(0)}M</span>`
                          : `<span class="text-gray-500 text-xs">— 0%</span>`
                        return `
                        <div class="cp-race-item relative" data-percentage="${percentage}">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl w-10 text-center">${medal}</span>
                                    <img src="${member.avatar}" class="w-10 h-10 rounded-full border-2 ${member.online ? 'border-green-400' : 'border-gray-600'}" alt="${member.name}" onerror="this.src='/static/favicon.svg'">
                                    <div class="flex flex-col">
                                        <span class="font-bold">${member.name}</span>
                                        <span class="text-orange-300 text-sm font-bold">Lv.${member.level}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col items-end">
                                    <span class="text-orange-400 font-mono font-bold">${member.cp}</span>
                                    ${gainDisplay}
                                </div>
                            </div>
                            <div class="bg-gray-800 rounded-full h-5 overflow-hidden relative">
                                <div class="cp-bar" style="width: 0%"></div>
                                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white/80">${percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        `
                    }).join('')}
                </div>
                
                <!-- Race Summary -->
                <div class="mt-6 pt-4 border-t border-gray-700 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                        <div class="text-green-400 font-bold">${performanceData.weeklyHighlights.totalGuildGain}</div>
                        <div class="text-gray-500" data-i18n="totalGain">Total Gain</div>
                    </div>
                    <div>
                        <div class="text-yellow-400 font-bold">${performanceData.weeklyHighlights.mostImproved}</div>
                        <div class="text-gray-500" data-i18n="biggestJump">Biggest Jump</div>
                    </div>
                    <div>
                        <div class="text-orange-400 font-bold">RegginA</div>
                        <div class="text-gray-500" data-i18n="stillFirst">Still #1</div>
                    </div>
                    <div>
                        <div class="text-purple-400 font-bold">${(rosterData.guildStats.totalCP)}</div>
                        <div class="text-gray-500" data-i18n="guildTotal">Guild Total</div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Progress to #1 Section -->
    <section id="progress" class="py-20 px-4">
        <div class="container mx-auto max-w-4xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconTarget()} <span data-i18n="roadToOne">Road to #1</span>
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal" data-i18n="progressDesc">Our journey to becoming NumbahWan</p>
            
            <div class="glass-card p-8 reveal">
                <div class="space-y-8">
                    <!-- Guild Level Progress -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconLevel()} <span data-i18n="guildLevel">Guild Level</span></span>
                            <span class="text-orange-400">Level 15 / 50</span>
                        </div>
                        <div class="progress-container h-8">
                            <div class="progress-bar" style="width: 30%">
                                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">30%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Total Guild CP -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconPower()} <span data-i18n="totalCP">Total Guild CP</span></span>
                            <span class="text-orange-400">5.8B / 10B</span>
                        </div>
                        <div class="progress-container h-8">
                            <div class="progress-bar" style="width: 58%">
                                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">58%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Member Capacity -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconUsers()} <span data-i18n="members">Members</span></span>
                            <span class="text-orange-400">12 / 30</span>
                        </div>
                        <div class="progress-container h-8">
                            <div class="progress-bar" style="width: 40%">
                                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">40%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Boss Raids Completed -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconBoss()} <span data-i18n="bossRaids">Boss Raids This Week</span></span>
                            <span class="text-orange-400">24 / 35</span>
                        </div>
                        <div class="progress-container h-8">
                            <div class="progress-bar" style="width: 69%">
                                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">69%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Guild Ranking -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconTrophy()} <span data-i18n="serverRanking">Server Ranking</span></span>
                            <span class="text-orange-400">#47 → #1</span>
                        </div>
                        <div class="progress-container h-8">
                            <div class="progress-bar" style="width: 85%">
                                <span class="absolute inset-0 flex items-center justify-center text-sm font-bold">We're climbing!</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Milestones -->
                <div class="mt-12 pt-8 border-t border-orange-900/30">
                    <h3 class="text-xl font-bold mb-6">${iconMilestone()} <span data-i18n="milestones">Milestones</span></h3>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4">
                            <svg class="nw-icon" width="28" height="28" style="color:#22c55e"><use href="/static/icons/nw-icons.svg#check-circle"></use></svg>
                            <div>
                                <p class="font-bold text-orange-400">First 3B CP Member! 🔥</p>
                                <p class="text-gray-400 text-sm">RegginA smashed through 3B 521M CP (Jan 2026)</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <svg class="nw-icon" width="28" height="28" style="color:#22c55e"><use href="/static/icons/nw-icons.svg#check-circle"></use></svg>
                            <div>
                                <p class="font-bold text-orange-400">9 Active Members</p>
                                <p class="text-gray-400 text-sm">Quality over quantity - the grinders stay!</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <svg class="nw-icon" width="28" height="28" style="color:#fbbf24"><use href="/static/icons/nw-icons.svg#clock"></use></svg>
                            <div>
                                <p class="font-bold text-gray-400">Top 10 Server Ranking</p>
                                <p class="text-gray-500 text-sm">Coming soon...</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <svg class="nw-icon" width="28" height="28" style="color:#fbbf24"><use href="/static/icons/nw-icons.svg#clock"></use></svg>
                            <div>
                                <p class="font-bold text-gray-400">NumbahWan - #1 Guild</p>
                                <p class="text-gray-500 text-sm">The ultimate goal!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Guild Fun Gallery Section - Stacked Deck Carousel -->
    <section id="gallery" class="gallery-section py-20 px-4 relative">
        <!-- Parallax Background Text -->
        <div class="gallery-bg-text" id="gallery-bg-text">MEMORIES</div>
        
        <div class="container mx-auto max-w-6xl relative z-10">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconCamera()} <span data-i18n="shenanigans">Guild Shenanigans</span>
            </h2>
            <p class="text-center text-orange-300 mb-8 reveal" data-i18n="memories">Memories of our adventures together</p>
            
            <!-- Stacked Deck Carousel - Zero Jitter -->
            <div class="card-deck" id="photo-deck">
                ${guildFunPhotos.map((photo, index) => `
                    <div class="deck-card" data-index="${index}" data-position="${index}" data-image="${photo.image}" data-title="${photo.title.en}" data-desc="${photo.description.en}">
                        <img src="${photo.image}" alt="${photo.title.en}" loading="lazy" class="card-image" />
                        <div class="card-overlay"></div>
                        <div class="card-index">${index + 1}</div>
                        <div class="card-content">
                            <h3 class="card-title" data-i18n-photo="${photo.id}" data-i18n-field="title">${photo.title.en}</h3>
                            <p class="card-desc" data-i18n-photo="${photo.id}" data-i18n-field="description">${photo.description.en}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Navigation Dots -->
            <div class="deck-nav" id="photo-deck-nav">
                ${guildFunPhotos.map((_, index) => `
                    <div class="deck-dot ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToPhotoCard(${index})"></div>
                `).join('')}
            </div>
            <p class="swipe-hint">← Swipe or click cards →</p>
            
            <div class="text-center mt-12 reveal">
                <p class="text-gray-400 mb-4" data-i18n="wantToAdd">Want to add your screenshots?</p>
                <button class="magnetic-btn nw-btn-shine" data-nw-magnetic data-nw-confetti>
                    ${iconUpload()} <span data-i18n="submitPhoto">Submit Photo</span>
                </button>
            </div>
        </div>
    </section>
    
    <!-- Lightbox for Full Screen Image View -->
    <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <button class="lightbox-nav prev" onclick="lightboxNav(-1, event)">‹</button>
        <button class="lightbox-nav next" onclick="lightboxNav(1, event)">›</button>
        <img id="lightbox-img" src="" alt="Full size image" />
        <div class="lightbox-info">
            <div class="lightbox-title" id="lightbox-title"></div>
            <div class="lightbox-desc" id="lightbox-desc"></div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="py-12 px-4 border-t border-orange-900/30">
        <div class="container mx-auto max-w-4xl text-center">
            <div class="flex justify-center mb-6">
                ${generateEmblemSVG('emblem-n')}
            </div>
            <p class="pixel-font text-orange-400 mb-2">NumbahWan Guild</p>
            <p class="text-gray-400 mb-6">"<span data-i18n="motto">We are not just a guild, but</span> <span data-i18n="family">FAMILY</span>"</p>
            <p class="text-gray-500 text-sm">MapleStory Idle RPG | <span data-i18n="server">Server: TW</span></p>
            <p class="text-gray-600 text-xs mt-4">© 2024 NumbahWan Guild. <span data-i18n="madeWith">Made with ❤️ by the family.</span></p>
        </div>
    </footer>

    <script>
        // Register GSAP plugins
        gsap.registerPlugin(ScrollTrigger);
        
        // ============================================
        // STACKED DECK CAROUSEL - Zero Jitter System
        // Pure transform-based, no scroll events
        // ============================================
        
        // Create deck controller
        function createDeckController(deckId, dotsId, bgTextId, bgTexts) {
            const deck = document.getElementById(deckId);
            if (!deck) return null;
            
            const cards = deck.querySelectorAll('.deck-card');
            const dots = document.querySelectorAll(\`#\${dotsId} .deck-dot\`);
            const bgText = document.getElementById(bgTextId);
            const totalCards = cards.length;
            let currentIndex = 0;
            let startX = 0;
            let isDragging = false;
            
            // Update card positions based on current index
            function updatePositions() {
                cards.forEach((card, i) => {
                    const position = i - currentIndex;
                    
                    // Clamp position for CSS
                    const clampedPos = Math.max(-3, Math.min(3, position));
                    card.setAttribute('data-position', clampedPos);
                    
                    // Hide cards too far away
                    if (Math.abs(position) > 3) {
                        card.classList.add('hidden-card');
                    } else {
                        card.classList.remove('hidden-card');
                    }
                });
                
                // Update dots
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
                
                // Update background text
                if (bgText && bgTexts[currentIndex]) {
                    bgText.textContent = bgTexts[currentIndex];
                }
            }
            
            // Go to specific card
            function goTo(index) {
                currentIndex = Math.max(0, Math.min(totalCards - 1, index));
                updatePositions();
            }
            
            // Navigate by direction
            function navigate(direction) {
                goTo(currentIndex + direction);
            }
            
            // ============================================
            // MOMENTUM SCROLL - Physics-based like phone
            // ============================================
            let startX = 0;
            let startTime = 0;
            let lastX = 0;
            let lastTime = 0;
            let velocityX = 0;
            let isDragging = false;
            let dragOffset = 0; // Visual offset during drag
            let momentumAnimation = null;
            
            // Fractional index for smooth scrolling
            let floatIndex = 0;
            
            // Update card positions with fractional offset for smooth scroll
            function updatePositionsSmooth(offset = 0) {
                cards.forEach((card, i) => {
                    const position = i - currentIndex - offset;
                    
                    // Clamp position for CSS
                    const clampedPos = Math.max(-3, Math.min(3, Math.round(position)));
                    card.setAttribute('data-position', clampedPos);
                    
                    // Apply smooth fractional transform
                    const baseTransforms = {
                        '-3': { x: -420, z: -150, ry: 25, s: 0.75, o: 0.3 },
                        '-2': { x: -280, z: -100, ry: 18, s: 0.82, o: 0.5 },
                        '-1': { x: -150, z: -50, ry: 10, s: 0.9, o: 0.75 },
                        '0': { x: 0, z: 50, ry: 0, s: 1, o: 1 },
                        '1': { x: 150, z: -50, ry: -10, s: 0.9, o: 0.75 },
                        '2': { x: 280, z: -100, ry: -18, s: 0.82, o: 0.5 },
                        '3': { x: 420, z: -150, ry: -25, s: 0.75, o: 0.3 },
                    };
                    
                    // Interpolate between positions for smooth movement
                    const fromPos = Math.floor(position);
                    const toPos = Math.ceil(position);
                    const frac = position - fromPos;
                    
                    const from = baseTransforms[Math.max(-3, Math.min(3, fromPos))] || baseTransforms['3'];
                    const to = baseTransforms[Math.max(-3, Math.min(3, toPos))] || baseTransforms['3'];
                    
                    const x = from.x + (to.x - from.x) * frac;
                    const z = from.z + (to.z - from.z) * frac;
                    const ry = from.ry + (to.ry - from.ry) * frac;
                    const s = from.s + (to.s - from.s) * frac;
                    const o = from.o + (to.o - from.o) * frac;
                    
                    card.style.transform = \`translateX(\${x}px) translateZ(\${z}px) rotateY(\${ry}deg) scale(\${s})\`;
                    card.style.opacity = o;
                    card.style.filter = o < 1 ? \`brightness(\${0.5 + o * 0.5})\` : 'brightness(1)';
                    
                    // Hide cards too far away
                    if (Math.abs(position) > 3.5) {
                        card.classList.add('hidden-card');
                    } else {
                        card.classList.remove('hidden-card');
                    }
                });
                
                // Update dots
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
                
                // Update background text
                if (bgText && bgTexts[currentIndex]) {
                    bgText.textContent = bgTexts[currentIndex];
                }
            }
            
            // Touch/Mouse handlers for momentum swipe
            function handleStart(e) {
                // Cancel any ongoing momentum
                if (momentumAnimation) {
                    cancelAnimationFrame(momentumAnimation);
                    momentumAnimation = null;
                }
                
                isDragging = true;
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                startX = clientX;
                lastX = clientX;
                startTime = Date.now();
                lastTime = startTime;
                velocityX = 0;
                dragOffset = 0;
                deck.style.cursor = 'grabbing';
            }
            
            function handleMove(e) {
                if (!isDragging) return;
                e.preventDefault();
                
                const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                const now = Date.now();
                const dt = now - lastTime;
                
                // Calculate velocity (pixels per ms)
                if (dt > 0) {
                    velocityX = (clientX - lastX) / dt;
                }
                
                lastX = clientX;
                lastTime = now;
                
                // Calculate drag offset (convert pixels to card units)
                // Sensitivity: 400px drag = 1 card (slower, more phone-like)
                const sensitivity = 400;
                dragOffset = (clientX - startX) / sensitivity;
                
                // Live update positions during drag
                updatePositionsSmooth(-dragOffset);
            }
            
            function handleEnd(e) {
                if (!isDragging) return;
                isDragging = false;
                deck.style.cursor = 'grab';
                
                // Apply momentum physics - Phone-like scroll feel
                // velocityX is in pixels/ms, convert to cards/ms
                const sensitivity = 400;
                let velocity = velocityX * sensitivity / 1000; // cards per second
                
                // Clamp velocity for smooth phone-like feel (not too fast)
                const maxVelocity = 2; // max 2 cards per second (slower)
                velocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocity * 0.6)); // reduced multiplier
                
                // Start from current visual position
                floatIndex = currentIndex - dragOffset;
                
                // Friction/deceleration - Phone-like slow down to stop
                const friction = 0.96; // Higher = less friction, smoother slow-down
                const minVelocity = 0.005; // Lower threshold for smoother stop
                
                function momentumStep() {
                    // Apply velocity with smooth deceleration
                    floatIndex -= velocity * 0.016; // ~60fps frame time
                    
                    // Progressive friction - slows more as velocity decreases (phone-like)
                    const dynamicFriction = friction - (Math.abs(velocity) * 0.02);
                    velocity *= Math.max(0.9, dynamicFriction);
                    
                    // Clamp to valid range with soft bounce at edges
                    if (floatIndex < 0) {
                        floatIndex = 0;
                        velocity = Math.abs(velocity) * 0.3; // Soft bounce
                    }
                    if (floatIndex > totalCards - 1) {
                        floatIndex = totalCards - 1;
                        velocity = -Math.abs(velocity) * 0.3; // Soft bounce
                    }
                    
                    // Update visual smoothly
                    const visualOffset = floatIndex - Math.round(floatIndex);
                    currentIndex = Math.round(floatIndex);
                    updatePositionsSmooth(visualOffset);
                    
                    // Continue or stop - smoother threshold
                    if (Math.abs(velocity) > minVelocity) {
                        momentumAnimation = requestAnimationFrame(momentumStep);
                    } else {
                        // Snap to nearest card
                        currentIndex = Math.round(floatIndex);
                        currentIndex = Math.max(0, Math.min(totalCards - 1, currentIndex));
                        
                        // Smooth snap animation
                        const snapDuration = 200;
                        const snapStart = performance.now();
                        const startOffset = floatIndex - currentIndex;
                        
                        function snapStep(timestamp) {
                            const elapsed = timestamp - snapStart;
                            const progress = Math.min(1, elapsed / snapDuration);
                            // Ease out
                            const eased = 1 - Math.pow(1 - progress, 3);
                            const offset = startOffset * (1 - eased);
                            
                            updatePositionsSmooth(offset);
                            
                            if (progress < 1) {
                                momentumAnimation = requestAnimationFrame(snapStep);
                            } else {
                                updatePositions(); // Final clean state
                                momentumAnimation = null;
                            }
                        }
                        
                        momentumAnimation = requestAnimationFrame(snapStep);
                    }
                }
                
                // Start momentum
                if (Math.abs(velocity) > minVelocity || Math.abs(dragOffset) > 0.1) {
                    momentumAnimation = requestAnimationFrame(momentumStep);
                } else {
                    // No momentum, just snap back
                    updatePositions();
                }
            }
            
            // Click on side cards to navigate, active card opens lightbox
            cards.forEach((card, i) => {
                card.addEventListener('click', (e) => {
                    // Only handle click if not dragging
                    if (Math.abs(dragOffset) > 0.1) return;
                    
                    if (i !== currentIndex) {
                        // Animate to clicked card
                        floatIndex = currentIndex;
                        const targetIndex = i;
                        const duration = 400;
                        const startTime = performance.now();
                        
                        function animateToCard(timestamp) {
                            const elapsed = timestamp - startTime;
                            const progress = Math.min(1, elapsed / duration);
                            const eased = 1 - Math.pow(1 - progress, 3);
                            
                            floatIndex = currentIndex + (targetIndex - currentIndex) * eased;
                            updatePositionsSmooth(floatIndex - Math.round(floatIndex));
                            
                            if (progress < 1) {
                                requestAnimationFrame(animateToCard);
                            } else {
                                currentIndex = targetIndex;
                                updatePositions();
                            }
                        }
                        
                        requestAnimationFrame(animateToCard);
                    } else {
                        // Active card clicked - open lightbox if it has image data
                        const image = card.getAttribute('data-image');
                        if (image) {
                            openLightbox(image, card.getAttribute('data-title'), card.getAttribute('data-desc'), deckId);
                        }
                    }
                });
            });
            
            // Event listeners
            deck.addEventListener('mousedown', handleStart);
            deck.addEventListener('mousemove', handleMove);
            deck.addEventListener('mouseup', handleEnd);
            deck.addEventListener('mouseleave', handleEnd);
            deck.addEventListener('touchstart', handleStart, { passive: false });
            deck.addEventListener('touchmove', handleMove, { passive: false });
            deck.addEventListener('touchend', handleEnd);
            
            // Keyboard navigation with smooth animation
            deck.setAttribute('tabindex', '0');
            deck.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    goTo(currentIndex - 1);
                }
                if (e.key === 'ArrowRight') {
                    goTo(currentIndex + 1);
                }
            });
            
            // Initial state
            updatePositions();
            
            return { goTo, navigate, currentIndex: () => currentIndex };
        }
        
        // ============================================
        // LIGHTBOX - Full Screen Image Viewer
        // ============================================
        let currentLightboxDeck = null;
        
        function openLightbox(imageSrc, title, desc, deckId) {
            const lightbox = document.getElementById('lightbox');
            const img = document.getElementById('lightbox-img');
            const titleEl = document.getElementById('lightbox-title');
            const descEl = document.getElementById('lightbox-desc');
            
            img.src = imageSrc;
            titleEl.textContent = title || '';
            descEl.textContent = desc || '';
            currentLightboxDeck = deckId;
            
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeLightbox(e) {
            // Don't close if clicking on nav buttons or image
            if (e && (e.target.classList.contains('lightbox-nav') || e.target.tagName === 'IMG')) {
                return;
            }
            const lightbox = document.getElementById('lightbox');
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
            currentLightboxDeck = null;
        }
        
        function lightboxNav(direction, e) {
            e.stopPropagation();
            
            // Navigate the deck
            if (currentLightboxDeck === 'photo-deck' && photoDeck) {
                photoDeck.navigate(direction);
                // Update lightbox image
                const deck = document.getElementById('photo-deck');
                const cards = deck.querySelectorAll('.deck-card');
                const currentIndex = photoDeck.currentIndex();
                const card = cards[currentIndex];
                if (card) {
                    document.getElementById('lightbox-img').src = card.getAttribute('data-image');
                    document.getElementById('lightbox-title').textContent = card.getAttribute('data-title') || '';
                    document.getElementById('lightbox-desc').textContent = card.getAttribute('data-desc') || '';
                }
            }
        }
        
        // Close lightbox on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft' && currentLightboxDeck) lightboxNav(-1, e);
            if (e.key === 'ArrowRight' && currentLightboxDeck) lightboxNav(1, e);
        });
        
        // Global functions
        window.openLightbox = openLightbox;
        window.closeLightbox = closeLightbox;
        window.lightboxNav = lightboxNav;
        
        // Photo Deck
        const photoBgTexts = ['MEMORIES', 'MOMENTS', 'FRIENDS', 'ADVENTURE', 'GOALS', 'RAID'];
        const photoDeck = createDeckController('photo-deck', 'photo-deck-nav', 'gallery-bg-text', photoBgTexts);
        
        // Global functions for onclick
        window.goToPhotoCard = (index) => photoDeck?.goTo(index);
        
        // Member Deck
        const memberBgTexts = ['REGGINA', 'YULUNER', 'NATEHOUOHO', 'REGGINO', '騎鳥', '紈蹈', '阿光YO', '碼農', '泰拳'];
        const memberDeck = createDeckController('member-deck', 'member-deck-nav', 'roster-bg-text', memberBgTexts);
        
        // Global functions for onclick
        window.goToMemberCard = (index) => memberDeck?.goTo(index);
        
        // GSAP parallax for background texts
        gsap.to('#gallery-bg-text', {
            scrollTrigger: {
                trigger: '#gallery',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1
            },
            y: -80,
            opacity: 0.2,
            ease: 'none'
        });
        
        gsap.to('#roster-bg-text', {
            scrollTrigger: {
                trigger: '#roster',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1
            },
            y: -80,
            opacity: 0.2,
            ease: 'none'
        });
        

        
        // ============================================
        // LIVING BACKGROUND - Maple Leaves + Magic Orbs
        // ============================================
        
        // Create floating maple leaves (MapleStory themed)
        function createMapleLeaves() {
            const container = document.getElementById('maple-leaves');
            if (!container) return;
            
            const leafCount = 12; // Keep subtle
            const leafColors = ['#ff6b00', '#ff8c00', '#ffd700', '#ff4500', '#ff7f50'];
            
            for (let i = 0; i < leafCount; i++) {
                const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                const size = 20 + Math.random() * 25;
                const color = leafColors[Math.floor(Math.random() * leafColors.length)];
                const type = Math.floor(Math.random() * 4) + 1;
                
                leaf.setAttribute('width', size);
                leaf.setAttribute('height', size);
                leaf.setAttribute('viewBox', '0 0 24 24');
                leaf.classList.add('maple-leaf', 'type-' + type);
                
                // Maple leaf SVG path
                leaf.innerHTML = \`
                    <path fill="\${color}" d="M12 2C12 2 9 5 9 8C7 6 4 6 4 6C4 6 5 9 7 10C5 10 2 12 2 12C2 12 5 13 8 12C6 14 6 18 6 18C6 18 9 16 10 14C10 16 12 22 12 22C12 22 14 16 14 14C15 16 18 18 18 18C18 18 18 14 16 12C19 13 22 12 22 12C22 12 19 10 17 10C19 9 20 6 20 6C20 6 17 6 15 8C15 5 12 2 12 2Z"/>
                \`;
                
                // Random starting position
                leaf.style.left = Math.random() * 100 + '%';
                leaf.style.animationDelay = (Math.random() * 20) + 's';
                
                container.appendChild(leaf);
            }
        }
        
        // Create magic orbs (glowing particles)
        function createMagicOrbs() {
            const container = document.getElementById('magic-orbs');
            if (!container) return;
            
            const orbCount = 8;
            const orbTypes = ['orange', 'gold', 'amber'];
            
            for (let i = 0; i < orbCount; i++) {
                const orb = document.createElement('div');
                const size = 8 + Math.random() * 20;
                const type = orbTypes[Math.floor(Math.random() * orbTypes.length)];
                
                orb.classList.add('magic-orb', type);
                orb.style.width = size + 'px';
                orb.style.height = size + 'px';
                orb.style.left = Math.random() * 100 + '%';
                orb.style.top = 20 + Math.random() * 60 + '%'; // Keep in middle area
                orb.style.animationDuration = (8 + Math.random() * 12) + 's';
                orb.style.animationDelay = (Math.random() * 5) + 's';
                
                container.appendChild(orb);
            }
        }
        
        // Initialize living background
        createMapleLeaves();
        createMagicOrbs();
        
        // Create floating particles (original system)
        function createParticles() {
            const container = document.getElementById('particles');
            if (!container) return;
            
            const particleCount = 30; // Reduced for performance
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 5 + 's';
                container.appendChild(particle);
                
                // Animate particle
                gsap.to(particle, {
                    y: -window.innerHeight,
                    x: (Math.random() - 0.5) * 200,
                    opacity: 0,
                    duration: 10 + Math.random() * 10,
                    repeat: -1,
                    delay: Math.random() * 5,
                    ease: "none"
                });
            }
        }
        createParticles();
        
        // Hero animations
        const heroTL = gsap.timeline({ delay: 0.5 });
        
        heroTL
            .from('#hero-emblem svg', {
                scale: 0,
                opacity: 0,
                rotation: -180,
                duration: 1,
                ease: "back.out(1.7)"
            })
            .from('#guild-name', {
                y: 50,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            }, "-=0.5")
            .to('#tagline', {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
            }, "-=0.5")
            .to('#motto-card', {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
            }, "-=0.3")
            .to('#hero-buttons', {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
            }, "-=0.3")
            .to('#scroll-indicator', {
                opacity: 1,
                duration: 0.5
            }, "-=0.2");
        
        // Split text animation for guild name
        const guildName = document.getElementById('guild-name');
        const letters = guildName.textContent.split('');
        guildName.innerHTML = letters.map(letter => 
            \`<span class="inline-block">\${letter === ' ' ? '&nbsp;' : letter}</span>\`
        ).join('');
        
        // Reveal animations on scroll
        gsap.utils.toArray('.reveal').forEach((elem, i) => {
            gsap.fromTo(elem, 
                { 
                    opacity: 0, 
                    y: 50 
                },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: elem,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
        
        // CP Race bar animation
        gsap.utils.toArray('.cp-race-item').forEach((item) => {
            const bar = item.querySelector('.cp-bar');
            const percentage = item.dataset.percentage;
            
            gsap.to(bar, {
                width: percentage + '%',
                duration: 1.5,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: item,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        });
        
        // Counter animation
        gsap.utils.toArray('[data-count]').forEach((counter) => {
            const target = parseInt(counter.dataset.count);
            gsap.to(counter, {
                innerText: target,
                duration: 2,
                snap: { innerText: 1 },
                ease: "power2.out",
                scrollTrigger: {
                    trigger: counter,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        });
        
        // Magnetic button effect
        document.querySelectorAll('.magnetic-btn').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                gsap.to(btn, {
                    x: x * 0.3,
                    y: y * 0.3,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
            
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
            });
        });
        
        // Nav emblem hover effect (SVG version)
        const navEmblem = document.getElementById('nav-emblem');
        if (navEmblem) {
            navEmblem.addEventListener('mouseenter', () => {
                gsap.to(navEmblem, {
                    scale: 1.1,
                    duration: 0.2,
                    ease: "back.out(1.7)"
                });
            });
            
            navEmblem.addEventListener('mouseleave', () => {
                gsap.to(navEmblem, {
                    scale: 1,
                    duration: 0.2,
                    ease: "power2.out"
                });
            });
        }
        
        // Smooth scroll for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // Progress bar animation on scroll
        gsap.utils.toArray('.progress-bar').forEach((bar) => {
            const width = bar.style.width;
            bar.style.width = '0%';
            
            gsap.to(bar, {
                width: width,
                duration: 1.5,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: bar,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        });
        
        // Parallax effect for aurora background
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            gsap.to('.aurora-bg', {
                x: x,
                y: y,
                duration: 1,
                ease: "power2.out"
            });
        });
        
        // ========== LANGUAGE SYSTEM (Single Source: /api/i18n) ==========
        const translations = ${JSON.stringify(translationsData)};
        const photoTranslations = translations.photoTranslations;
        const langFlags = translations.langFlags;
        const langCodes = translations.langCodes;
        
        let currentLang = localStorage.getItem('lang') || 'en';
        
        function toggleLangMenu() {
            const menu = document.getElementById('lang-menu');
            menu.classList.toggle('hidden');
        }
        
        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('lang', lang);
            
            // Update flag and code
            document.getElementById('current-lang-flag').textContent = langFlags[lang];
            document.getElementById('current-lang-code').textContent = langCodes[lang];
            
            // Update all translatable elements
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });
            
            // Update photo titles and descriptions
            document.querySelectorAll('[data-i18n-photo]').forEach(el => {
                const photoId = el.getAttribute('data-i18n-photo');
                const field = el.getAttribute('data-i18n-field');
                if (photoTranslations[photoId] && photoTranslations[photoId][field]) {
                    el.textContent = photoTranslations[photoId][field][lang];
                }
            });
            
            // Close menu
            document.getElementById('lang-menu').classList.add('hidden');
            
            // Update HP bar language
            if (window.updateHPBarLang) window.updateHPBarLang();
        }
        
        // Close language menu when clicking outside
        document.addEventListener('click', (e) => {
            const switcher = document.getElementById('lang-switcher');
            if (!switcher.contains(e.target)) {
                document.getElementById('lang-menu').classList.add('hidden');
            }
            
            // Close nav dropdown when clicking outside
            const hamburger = document.querySelector('.hamburger-btn');
            const dropdown = document.getElementById('nav-dropdown');
            if (!hamburger.contains(e.target) && !dropdown.contains(e.target)) {
                closeNavMenu();
            }
        });
        
        // Initialize language on load
        setLanguage(currentLang);
        
        // ========== HAMBURGER MENU ==========
        function toggleNavMenu() {
            const dropdown = document.getElementById('nav-dropdown');
            const hamburger = document.querySelector('.hamburger-btn');
            
            dropdown.classList.toggle('hidden');
            hamburger.classList.toggle('active');
        }
        
        function closeNavMenu() {
            const dropdown = document.getElementById('nav-dropdown');
            const hamburger = document.querySelector('.hamburger-btn');
            
            dropdown.classList.add('hidden');
            hamburger.classList.remove('active');
        }
        
        // ========== LIVE HP BAR SIMULATION ==========
        (function() {
            const MAX_HP = 2046533;
            const MAX_MP = 1645;
            const HEAL_RATE = 0.011; // 1.1% per second (Hero passive)
            const POTION_HEAL = 0.20; // 20% HP heal
            
            let currentHP = Math.floor(MAX_HP * 0.85);
            let currentMP = Math.floor(MAX_MP * 0.65);
            let combatMode = 'farming';
            let modeTimer = 0;
            let potionTimer = 0;
            let mpDrainPhase = true; // true = draining, false = refilling
            
            const modes = {
                farming: { icon: '🌾', dmgMin: 8000, dmgMax: 35000, dmgFreq: 0.25, bigHitChance: 0.03 },
                bossing: { icon: '🐉', dmgMin: 80000, dmgMax: 250000, dmgFreq: 0.4, bigHitChance: 0.12 },
                pvp: { icon: '⚔️', dmgMin: 50000, dmgMax: 180000, dmgFreq: 0.35, bigHitChance: 0.08 }
            };
            
            const modeText = {
                en: { farming: 'Farming', bossing: 'Bossing', pvp: 'PvP' },
                zh: { farming: '打怪中', bossing: '打王中', pvp: 'PvP戰' },
                th: { farming: 'ฟาร์ม', bossing: 'บุกบอส', pvp: 'PvP' }
            };
            
            const combatLogs = {
                en: {
                    farming: ['Slaying mobs...', 'Exp +1,250', 'Meso +3,420', 'Auto-battle ✓', 'Combo x15!', 'Drop! 📦'],
                    bossing: ['Dodge! 💨', 'Boss enraged!', '💥 CRIT!', 'Phase 2...', '⚠️ AOE incoming!', 'Bind success!'],
                    pvp: ['Clash! ⚔️', 'Counter!', 'Shield up! 🛡️', 'Ultimate ready!', 'Enemy stunned!', 'Combo break!']
                },
                zh: {
                    farming: ['刷怪中...', '經驗 +1,250', '楓幣 +3,420', '自動戰鬥 ✓', '連擊 x15!', '掉寶! 📦'],
                    bossing: ['閃避! 💨', 'Boss狂暴!', '💥 爆擊!', '第二階段...', '⚠️ 範圍攻擊!', '定身成功!'],
                    pvp: ['交鋒! ⚔️', '反擊!', '護盾! 🛡️', '大招準備!', '敵人暈眩!', '連擊中斷!']
                },
                th: {
                    farming: ['ล่ามอน...', 'Exp +1,250', 'เมโซ +3,420', 'ออโต้ ✓', 'คอมโบ x15!', 'ดรอป! 📦'],
                    bossing: ['หลบ! 💨', 'บอสโกรธ!', '💥 คริ!', 'เฟส 2...', '⚠️ AOE มา!', 'ล็อคสำเร็จ!'],
                    pvp: ['ปะทะ! ⚔️', 'สวนกลับ!', 'โล่! 🛡️', 'อัลติพร้อม!', 'ศัตรูสตัน!', 'คอมโบเบรค!']
                }
            };
            
            const potionText = {
                en: 'Potion!',
                zh: '喝水!',
                th: 'ยา!'
            };
            
            const mpRestoreText = {
                en: '💙 MP Restore!',
                zh: '💙 MP恢復!',
                th: '💙 MP เติม!'
            };
            
            function getLang() {
                return localStorage.getItem('lang') || 'en';
            }
            
            function updateDisplay() {
                const hpPercent = (currentHP / MAX_HP) * 100;
                const mpPercent = (currentMP / MAX_MP) * 100;
                
                const hpFill = document.getElementById('hp-bar-fill');
                const mpFill = document.getElementById('mp-bar-fill');
                if (!hpFill || !mpFill) return;
                
                hpFill.style.width = hpPercent + '%';
                mpFill.style.width = mpPercent + '%';
                document.getElementById('hp-current').textContent = currentHP.toLocaleString();
                document.getElementById('mp-current').textContent = currentMP.toLocaleString();
                
                // HP bar color based on health
                if (hpPercent < 30) {
                    hpFill.className = 'h-full bg-gradient-to-b from-red-400 via-red-500 to-red-600 transition-all duration-300';
                } else if (hpPercent < 50) {
                    hpFill.className = 'h-full bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 transition-all duration-300';
                } else {
                    hpFill.className = 'h-full bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 transition-all duration-300';
                }
            }
            
            function showCombatLog(msg) {
                const log = document.getElementById('combat-log');
                if (!log) return;
                log.textContent = msg;
                log.style.opacity = '1';
                setTimeout(() => { log.style.opacity = '0.5'; }, 800);
            }
            
            function showPotion() {
                const indicator = document.getElementById('potion-indicator');
                if (!indicator) return;
                indicator.classList.remove('hidden');
                indicator.classList.add('flex');
                setTimeout(() => {
                    indicator.classList.add('hidden');
                    indicator.classList.remove('flex');
                }, 1500);
            }
            
            function switchMode() {
                const modeKeys = Object.keys(modes);
                combatMode = modeKeys[Math.floor(Math.random() * modeKeys.length)];
                const mode = modes[combatMode];
                const lang = getLang();
                const modeIconEl = document.getElementById('combat-mode-icon');
                const modeTextEl = document.getElementById('combat-mode-text');
                if (modeIconEl) modeIconEl.textContent = mode.icon;
                if (modeTextEl) modeTextEl.textContent = modeText[lang][combatMode];
            }
            
            // Update mode text when language changes
            window.updateHPBarLang = function() {
                const lang = getLang();
                const modeTextEl = document.getElementById('combat-mode-text');
                if (modeTextEl) modeTextEl.textContent = modeText[lang][combatMode];
            };
            
            function simulate() {
                const mode = modes[combatMode];
                
                // Passive heal: 1.1% per second (called every 100ms, so /10)
                const healAmount = Math.floor(MAX_HP * HEAL_RATE / 10);
                currentHP = Math.min(MAX_HP, currentHP + healAmount);
                
                // Random damage
                if (Math.random() < mode.dmgFreq / 10) {
                    let dmg = Math.floor(Math.random() * (mode.dmgMax - mode.dmgMin) + mode.dmgMin);
                    
                    // Big hit chance
                    const lang = getLang();
                    if (Math.random() < mode.bigHitChance) {
                        dmg = Math.floor(dmg * 2.5);
                        showCombatLog('💥 -' + dmg.toLocaleString() + ' CRIT!');
                    } else if (Math.random() < 0.25) {
                        const logs = combatLogs[lang][combatMode];
                        showCombatLog(logs[Math.floor(Math.random() * logs.length)]);
                    }
                    
                    currentHP = Math.max(Math.floor(MAX_HP * 0.12), currentHP - dmg);
                }
                
                // Potion every 8-11 seconds (80-110 ticks)
                potionTimer++;
                if (potionTimer > (80 + Math.random() * 30)) {
                    const potionHeal = Math.floor(MAX_HP * POTION_HEAL);
                    currentHP = Math.min(MAX_HP, currentHP + potionHeal);
                    showPotion();
                    const lang = getLang();
                    showCombatLog('🧪 ' + potionText[lang] + ' +' + potionHeal.toLocaleString() + ' HP');
                    potionTimer = 0;
                }
                
                // MP drain/refill cycle (drain to <40%, then refill to 100%)
                if (mpDrainPhase) {
                    // Drain MP gradually
                    currentMP = Math.max(0, currentMP - Math.floor(Math.random() * 15 + 5));
                    if (currentMP < MAX_MP * 0.35) {
                        mpDrainPhase = false; // Start refilling
                        const lang = getLang();
                        showCombatLog(mpRestoreText[lang]);
                    }
                } else {
                    // Refill MP quickly
                    currentMP = Math.min(MAX_MP, currentMP + Math.floor(Math.random() * 80 + 40));
                    if (currentMP >= MAX_MP * 0.98) {
                        mpDrainPhase = true; // Start draining again
                    }
                }
                
                // Mode switch every 20-40 seconds
                modeTimer++;
                if (modeTimer > (200 + Math.random() * 200)) {
                    switchMode();
                    modeTimer = 0;
                }
                
                updateDisplay();
            }
            
            // Start simulation
            setInterval(simulate, 100);
            updateDisplay();
        })();
        
    </script>
</body>
</html>
  `)
})

// Helper function to generate SVG N emblem - matches original exactly
// Thick blocky N like the original pixelated emblem
function generateEmblemSVG(className = 'emblem-n', size = 60) {
  const gradId = 'nGrad' + size + Math.random().toString(36).substr(2, 5)
  return `
    <svg class="${className}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb347"/>
          <stop offset="30%" stop-color="#ff9500"/>
          <stop offset="60%" stop-color="#e86500"/>
          <stop offset="100%" stop-color="#8B4513"/>
        </linearGradient>
      </defs>
      <!-- Thick blocky N: left bar + THICK diagonal + right bar -->
      <rect x="10" y="8" width="24" height="84" rx="3" fill="url(#${gradId})"/>
      <rect x="66" y="8" width="24" height="84" rx="3" fill="url(#${gradId})"/>
      <polygon points="10,8 34,8 90,92 66,92" fill="url(#${gradId})"/>
    </svg>
  `
}

// Custom SVG Icons - Using NumbahWan Guild Icon Sprite
// All icons now reference /static/icons/nw-icons.svg for consistent guild branding
function nwIcon(name, size = 20, extraClass = 'mr-2') {
  return `<svg class="inline nw-icon ${extraClass}" width="${size}" height="${size}" aria-hidden="true"><use href="/static/icons/nw-icons.svg#${name}"></use></svg>`
}

function iconSword() {
  return nwIcon('sword', 20)
}

function iconTrophy() {
  return nwIcon('trophy', 20)
}

function iconInfo() {
  return nwIcon('star', 24)
}

function iconUsers() {
  return nwIcon('users', 24)
}

function iconPower() {
  return nwIcon('fire', 16, '')
}

function iconHeart() {
  return nwIcon('heart', 16, '')
}

function iconUpgrade() {
  return nwIcon('upvote', 16, '')
}

function iconStar() {
  return nwIcon('star', 20)
}

function iconRace() {
  return nwIcon('flag', 24)
}

function iconTarget() {
  return nwIcon('target', 24)
}

function iconLevel() {
  return nwIcon('trophy', 20)
}

function iconBoss() {
  return nwIcon('skull', 20)
}

function iconMilestone() {
  return nwIcon('flag', 20)
}

function iconCamera() {
  return nwIcon('camera', 24)
}

function iconUpload() {
  return nwIcon('upload', 20)
}

function iconCrown() {
  return nwIcon('crown', 20)
}

function iconGaming() {
  return nwIcon('gaming', 24)
}

function iconShield() {
  return nwIcon('shield', 20)
}

function iconParty() {
  return nwIcon('party', 20)
}

// API endpoint for member data
app.get('/api/members', (c) => {
  return c.json({ members, sortedMembers })
})

// Regina page route - serves the static HTML file
app.get('/regina', async (c) => {
  // For Cloudflare Pages, we need to serve static HTML differently
  // The regina.html is in public/ and will be served via the static file serving
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/regina.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development - serve inline redirect
  }
  
  // Fallback - redirect to static file
  return c.redirect('/regina.html')
})

// PvP Arena page route
app.get('/pvp', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/pvp.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/pvp.html')
})

// Fashion Disasters page route
app.get('/fashion', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/fashion.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/fashion.html')
})

// Exclusive Merch page route
app.get('/merch', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/merch.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/merch.html')
})

// Daily Fortune page route
app.get('/fortune', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/fortune.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/fortune.html')
})

// Arcade page route
app.get('/arcade', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/arcade.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/arcade.html')
})

// Meme Gallery page route
app.get('/memes', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/memes.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/memes.html')
})

// Guild Application page route
app.get('/apply', async (c) => {
  try {
    // @ts-ignore - env is provided by Cloudflare Pages
    const asset = await c.env?.ASSETS?.fetch(new Request('https://dummy/apply.html'))
    if (asset) {
      return new Response(asset.body, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  } catch (e) {
    // Fallback for local development
  }
  return c.redirect('/apply.html')
})

export default app
