import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'

const app = new Hono()

// Serve static files
app.use('/static/*', serveStatic())

// Member roster data from screenshots
const members = [
  { name: "RegginA", level: 76, cp: "2B 325M", cpValue: 2325000000, contribution: 2030, upgrade: 6, role: "Master", online: false, daysAgo: null },
  { name: "Yuluner晴", level: 75, cp: "1B 199M", cpValue: 1199000000, contribution: 950, upgrade: 3, role: "Guild Member", online: false, daysAgo: "Today" },
  { name: "泰拳寒玉", level: 49, cp: "7,567,864", cpValue: 7567864, contribution: 760, upgrade: 3, role: "Guild Member", online: false, daysAgo: "Today" },
  { name: "RegginO", level: 73, cp: "515M 709K", cpValue: 515709000, contribution: 1870, upgrade: 4, role: "Vice Master", online: false, daysAgo: null },
  { name: "阿光Yo", level: 67, cp: "144M 110K", cpValue: 144110000, contribution: 780, upgrade: 0, role: "Guild Member", online: false, daysAgo: "Today" },
  { name: "Natehouoho", level: 71, cp: "746M 509K", cpValue: 746509000, contribution: 20, upgrade: 0, role: "Guild Member", online: true, daysAgo: null },
  { name: "納踢祝著", level: 71, cp: "458M 115K", cpValue: 458115000, contribution: 2560, upgrade: 10, role: "領導", online: false, daysAgo: null },
  { name: "碼農小孫", level: 61, cp: "17M 501K", cpValue: 17501000, contribution: 150, upgrade: 0, role: "Guild Member", online: false, daysAgo: "Today" },
  { name: "騎鳥回家", level: 69, cp: "320M 240K", cpValue: 320240000, contribution: 490, upgrade: 0, role: "Guild Member", online: true, daysAgo: null },
  { name: "TW#VWQG7R9C03", level: 65, cp: "99M 969K", cpValue: 99969000, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "5d" },
  { name: "小亨寶寶", level: 54, cp: "13M 174K", cpValue: 13174000, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "14d" },
  { name: "葉陽", level: 46, cp: "2,572,190", cpValue: 2572190, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "15d" },
]

// Sort by CP for leaderboard
const sortedMembers = [...members].sort((a, b) => b.cpValue - a.cpValue)
const maxCP = sortedMembers[0].cpValue

// Guild Fun photos data (placeholder for AI-generated images)
const guildFunPhotos = [
  { id: 1, title: "Boss Raid Party", description: "The gang taking down Zakum!" },
  { id: 2, title: "Guild Hangout", description: "Chilling at Henesys" },
  { id: 3, title: "Epic Loot Drop", description: "When RNG blesses us" },
  { id: 4, title: "Training Session", description: "Grinding together" },
  { id: 5, title: "Victory Pose", description: "After defeating Black Mage" },
  { id: 6, title: "Guild Photo", description: "All members assembled" },
]

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NumbahWan Guild | MapleStory Idle RPG</title>
    <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
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
        
        body {
            font-family: 'Orbitron', sans-serif;
            background: var(--bg-dark);
            color: #fff;
            overflow-x: hidden;
        }
        
        .pixel-font {
            font-family: 'Press Start 2P', cursive;
        }
        
        /* Aurora gradient background */
        .aurora-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(ellipse at 20% 20%, rgba(255, 107, 0, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 80%, rgba(255, 157, 77, 0.1) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(139, 69, 19, 0.1) 0%, transparent 70%);
            z-index: -1;
            animation: auroraMove 20s ease-in-out infinite;
        }
        
        @keyframes auroraMove {
            0%, 100% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.1) rotate(5deg); }
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
        
        /* Hero banner with image */
        .hero-banner {
            position: relative;
            width: 100%;
            min-height: 100vh;
            background: url('/static/hero-banner.jpg') center center / cover no-repeat;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        
        .hero-banner::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.6) 50%, rgba(10,10,15,0.95) 100%);
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
        
        /* Photo gallery */
        .photo-card {
            aspect-ratio: 4/3;
            background: linear-gradient(135deg, rgba(255, 107, 0, 0.2) 0%, rgba(139, 69, 19, 0.2) 100%);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            transition: all 0.4s ease;
        }
        
        .photo-card:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(255, 107, 0, 0.5);
        }
        
        .photo-card::before {
            content: '📸';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            opacity: 0.5;
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
    </style>
</head>
<body>
    <!-- Aurora Background -->
    <div class="aurora-bg"></div>
    
    <!-- Particles -->
    <div id="particles"></div>
    
    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 rounded-full">
        <div class="container mx-auto px-6 py-4 flex items-center justify-between">
            <a href="#hero" class="flex items-center gap-3">
                <div id="nav-emblem">${generateEmblemSVG('emblem-n')}</div>
                <span class="pixel-font text-sm text-orange-400">NumbahWan</span>
            </a>
            <div class="hidden md:flex items-center gap-8">
                <a href="#about" class="nav-link text-sm">About</a>
                <a href="#roster" class="nav-link text-sm">Roster</a>
                <a href="#race" class="nav-link text-sm">CP Race</a>
                <a href="#progress" class="nav-link text-sm">Progress</a>
                <a href="#gallery" class="nav-link text-sm">Guild Fun</a>
            </div>
            <button class="magnetic-btn text-sm" onclick="document.getElementById('roster').scrollIntoView({behavior: 'smooth'})">
                Join Us
            </button>
        </div>
    </nav>
    
    <!-- Hero Section with Banner Image -->
    <section id="hero" class="hero-banner">
        <div class="hero-content w-full max-w-4xl mx-auto">
            <div class="flex justify-center mb-6" id="hero-emblem">
                ${generateEmblemSVG('emblem-n emblem-n-large', 100)}
            </div>
            <h1 class="pixel-title mb-4" id="guild-name" style="display: block; width: 100%; text-align: center; margin-left: auto; margin-right: auto;">
                NumbahWan
            </h1>
            <p class="text-xl md:text-2xl text-orange-300 mb-6 opacity-0" id="tagline">
                MapleStory Idle RPG Guild
            </p>
            <div class="glass-card p-4 md:p-6 max-w-xl mx-auto mb-8 opacity-0" id="motto-card">
                <p class="text-base md:text-xl italic text-orange-200">
                    "We are not just a guild, but <span class="text-orange-400 font-bold">FAMILY</span>"
                </p>
            </div>
            <div class="flex flex-wrap justify-center gap-4 opacity-0" id="hero-buttons">
                <button class="magnetic-btn" onclick="document.getElementById('roster').scrollIntoView({behavior: 'smooth'})">
                    ${iconSword()} Meet The Family
                </button>
                <button class="magnetic-btn" style="background: transparent; border: 2px solid var(--primary);" onclick="document.getElementById('progress').scrollIntoView({behavior: 'smooth'})">
                    ${iconTrophy()} Our Journey
                </button>
            </div>
        </div>
        
        <!-- Scroll indicator -->
        <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 z-10" id="scroll-indicator">
            <div class="w-6 h-10 border-2 border-orange-400 rounded-full flex justify-center">
                <div class="w-1 h-3 bg-orange-400 rounded-full mt-2 animate-bounce"></div>
            </div>
        </div>
    </section>
    
    <!-- About Section -->
    <section id="about" class="py-20 px-4">
        <div class="container mx-auto max-w-6xl">
            <h2 class="text-4xl font-bold text-center mb-12 neon-orange reveal">
                ${iconInfo()} About NumbahWan
            </h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="12">0</div>
                    <p class="text-orange-300 mt-2">Family Members</p>
                </div>
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="76">0</div>
                    <p class="text-orange-300 mt-2">Highest Level</p>
                </div>
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="2">0</div>
                    <p class="text-orange-300 mt-2">Billion+ CP</p>
                </div>
            </div>
            <!-- Guild Master Section -->
            <div class="glass-card p-8 mt-12 reveal">
                <div class="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 class="text-2xl font-bold text-orange-400 mb-4">${iconStar()} Our Guild Master</h3>
                        <div class="flex items-center gap-4 mb-4">
                            <span class="text-4xl">👑</span>
                            <div>
                                <p class="text-2xl font-bold text-white">RegginA</p>
                                <p class="text-orange-300">Level 76 • CP: 2B 325M</p>
                            </div>
                        </div>
                        <p class="text-gray-300 leading-relaxed">
                            The legendary leader of NumbahWan, RegginA leads by example - always at the frontline 
                            protecting guild members and pushing the limits of what's possible. With over 2 billion CP, 
                            our GM shows us that dedication and teamwork can overcome any challenge.
                        </p>
                        <p class="text-gray-300 leading-relaxed mt-4">
                            "We rise together, we fall together. That's the NumbahWan way."
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
                        <h3 class="text-2xl font-bold text-orange-400 mb-4">${iconStar()} Our Story</h3>
                        <p class="text-gray-300 leading-relaxed">
                            NumbahWan started with a simple dream - to become the #1 guild in MapleStory Idle RPG. 
                            But along the way, we discovered something more valuable: each other. 
                            Our members come from different backgrounds, but we share one thing in common - 
                            the passion for the game and the bonds we've formed.
                        </p>
                        <p class="text-gray-300 leading-relaxed mt-4">
                            Whether it's grinding bosses at 3 AM or celebrating someone's rare drop, 
                            we're always there for each other. That's what makes us NumbahWan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Member Roster Section -->
    <section id="roster" class="py-20 px-4">
        <div class="container mx-auto max-w-7xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconUsers()} The Family
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal">Our beloved guild members</p>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${members.map((member, index) => `
                    <div class="member-card glass-card p-6 reveal" style="animation-delay: ${index * 0.1}s">
                        <div class="relative">
                            ${index === 0 ? '<span class="crown">👑</span>' : ''}
                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold">
                                    ${member.name.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-bold text-lg truncate">${member.name}</h3>
                                        ${member.online ? '<span class="online-dot"></span>' : ''}
                                    </div>
                                    <p class="text-orange-300 text-sm">Lv. ${member.level}</p>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-400 text-sm">${iconPower()} CP</span>
                                    <span class="text-orange-400 font-bold">${member.cp}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-400 text-sm">${iconHeart()} Contribution</span>
                                    <span class="text-orange-300">${member.contribution}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-gray-400 text-sm">${iconUpgrade()} Upgrades</span>
                                    <span class="text-orange-300">${member.upgrade}</span>
                                </div>
                            </div>
                            <div class="mt-4 pt-4 border-t border-orange-900/30 flex justify-between items-center">
                                <span class="px-3 py-1 rounded-full text-xs font-bold ${
                                    member.role === 'Master' ? 'role-master' : 
                                    member.role === 'Vice Master' ? 'role-vice' : 
                                    member.role === '領導' ? 'role-leader' : 'role-member'
                                }">
                                    ${member.role}
                                </span>
                                ${member.daysAgo ? `<span class="text-gray-500 text-xs">${member.daysAgo}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    
    <!-- CP Race Section -->
    <section id="race" class="py-20 px-4">
        <div class="container mx-auto max-w-5xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconRace()} CP Race
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal">Who's leading the pack?</p>
            
            <div class="glass-card p-8 reveal">
                <div class="space-y-6">
                    ${sortedMembers.map((member, index) => {
                        const percentage = (member.cpValue / maxCP) * 100
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
                        return `
                        <div class="cp-race-item" data-percentage="${percentage}">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl w-8">${medal}</span>
                                    <span class="font-bold">${member.name}</span>
                                    <span class="text-gray-500 text-sm">Lv.${member.level}</span>
                                </div>
                                <span class="text-orange-400 font-mono">${member.cp}</span>
                            </div>
                            <div class="bg-gray-800 rounded-full h-6 overflow-hidden">
                                <div class="cp-bar" style="width: 0%"></div>
                            </div>
                        </div>
                        `
                    }).join('')}
                </div>
            </div>
        </div>
    </section>
    
    <!-- Progress to #1 Section -->
    <section id="progress" class="py-20 px-4">
        <div class="container mx-auto max-w-4xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconTarget()} Road to #1
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal">Our journey to becoming NumbahWan</p>
            
            <div class="glass-card p-8 reveal">
                <div class="space-y-8">
                    <!-- Guild Level Progress -->
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold">${iconLevel()} Guild Level</span>
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
                            <span class="font-bold">${iconPower()} Total Guild CP</span>
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
                            <span class="font-bold">${iconUsers()} Members</span>
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
                            <span class="font-bold">${iconBoss()} Boss Raids This Week</span>
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
                            <span class="font-bold">${iconTrophy()} Server Ranking</span>
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
                    <h3 class="text-xl font-bold mb-6">${iconMilestone()} Recent Milestones</h3>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4">
                            <span class="text-2xl">✅</span>
                            <div>
                                <p class="font-bold text-orange-400">First 2B CP Member!</p>
                                <p class="text-gray-400 text-sm">RegginA reached 2B 325M CP</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-2xl">✅</span>
                            <div>
                                <p class="font-bold text-orange-400">12 Members Strong</p>
                                <p class="text-gray-400 text-sm">Our family keeps growing!</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-2xl">⏳</span>
                            <div>
                                <p class="font-bold text-gray-400">Top 10 Server Ranking</p>
                                <p class="text-gray-500 text-sm">Coming soon...</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-2xl">⏳</span>
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
    
    <!-- Guild Fun Gallery Section -->
    <section id="gallery" class="py-20 px-4">
        <div class="container mx-auto max-w-6xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconCamera()} Guild Shenanigans
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal">Memories of our adventures together</p>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${guildFunPhotos.map((photo, index) => `
                    <div class="photo-card glass-card reveal" style="animation-delay: ${index * 0.1}s">
                        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <h3 class="font-bold text-orange-400">${photo.title}</h3>
                            <p class="text-sm text-gray-300">${photo.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="text-center mt-12 reveal">
                <p class="text-gray-400 mb-4">Want to add your screenshots?</p>
                <button class="magnetic-btn">
                    ${iconUpload()} Submit Photo
                </button>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer class="py-12 px-4 border-t border-orange-900/30">
        <div class="container mx-auto max-w-4xl text-center">
            <div class="flex justify-center mb-6">
                ${generateEmblemSVG('emblem-n')}
            </div>
            <p class="pixel-font text-orange-400 mb-2">NumbahWan Guild</p>
            <p class="text-gray-400 mb-6">"We are not just a guild, but FAMILY"</p>
            <p class="text-gray-500 text-sm">MapleStory Idle RPG | Server: TW</p>
            <p class="text-gray-600 text-xs mt-4">© 2024 NumbahWan Guild. Made with ❤️ by the family.</p>
        </div>
    </footer>

    <script>
        // Register GSAP plugins
        gsap.registerPlugin(ScrollTrigger);
        
        // Create floating particles
        function createParticles() {
            const container = document.getElementById('particles');
            const particleCount = 50;
            
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
    </script>
</body>
</html>
  `)
})

// Helper function to generate SVG N emblem - matches original exactly
// Standard N: left bar, diagonal from top-left to bottom-right, right bar
function generateEmblemSVG(className = 'emblem-n', size = 60) {
  const gradId = 'nGrad' + size + Math.random().toString(36).substr(2, 5)
  return `
    <svg class="${className}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb347"/>
          <stop offset="35%" stop-color="#ff9500"/>
          <stop offset="65%" stop-color="#e86500"/>
          <stop offset="100%" stop-color="#8B4513"/>
        </linearGradient>
      </defs>
      <!-- Standard N: | diagonal \\ | -->
      <path d="
        M 12,8 
        L 34,8 
        L 34,20 
        L 66,75 
        L 66,8 
        L 88,8 
        L 88,92 
        L 66,92 
        L 66,80 
        L 34,25 
        L 34,92 
        L 12,92 
        Z
      " fill="url(#${gradId})" stroke="none"/>
    </svg>
  `
}

// Custom SVG Icons
function iconSword() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M17 15l4 4M19 9l-6 6"/></svg>`
}

function iconTrophy() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4H19C19.55 4 20 4.45 20 5V8C20 10.21 18.21 12 16 12H15.92C15.43 13.68 13.99 14.96 12.24 15.24V17H14C15.1 17 16 17.9 16 19V20C16 20.55 15.55 21 15 21H9C8.45 21 8 20.55 8 20V19C8 17.9 8.9 17 10 17H11.76V15.24C10.01 14.96 8.57 13.68 8.08 12H8C5.79 12 4 10.21 4 8V5C4 4.45 4.45 4 5 4H10C10 2.9 10.9 2 12 2ZM6 6V8C6 9.1 6.9 10 8 10V6H6ZM16 10C17.1 10 18 9.1 18 8V6H16V10Z"/></svg>`
}

function iconInfo() {
  return `<svg class="inline w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01"/></svg>`
}

function iconUsers() {
  return `<svg class="inline w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`
}

function iconPower() {
  return `<svg class="inline w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>`
}

function iconHeart() {
  return `<svg class="inline w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
}

function iconUpgrade() {
  return `<svg class="inline w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>`
}

function iconStar() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`
}

function iconRace() {
  return `<svg class="inline w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`
}

function iconTarget() {
  return `<svg class="inline w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
}

function iconLevel() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>`
}

function iconBoss() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`
}

function iconMilestone() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`
}

function iconCamera() {
  return `<svg class="inline w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`
}

function iconUpload() {
  return `<svg class="inline w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`
}

// API endpoint for member data
app.get('/api/members', (c) => {
  return c.json({ members, sortedMembers })
})

export default app
