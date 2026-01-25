import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'

const app = new Hono()

// Serve static files
app.use('/static/*', serveStatic())

// ============================================================================
// MEMBER ROSTER DATA - Last Updated: 2026-01-24
// ============================================================================
// Avatar naming convention: avatar-[username]-[description].jpg
// All avatars stored in /public/static/ with meaningful names for easy debugging
// ============================================================================
const members = [
  // Master - RegginA: White masked warrior, alpha leader
  { name: "RegginA", level: 77, cp: "2B 382M", cpValue: 2382000000, contribution: 2180, upgrade: 3, role: "Master", online: false, daysAgo: "Today", avatar: "/static/avatar-reggina-master-masked-warrior.jpg" },
  
  // Yuluner晴: 晴 = sunny/clear - Bright cheerful sun theme
  { name: "Yuluner晴", level: 75, cp: "1B 247M", cpValue: 1247000000, contribution: 1100, upgrade: 3, role: "Guild Member", online: false, daysAgo: "Today", avatar: "/static/avatar-yuluner-sunny-cheerful.jpg" },
  
  // 泰拳寒玉: Thai Boxing + Cold Jade - Martial artist ice theme
  { name: "泰拳寒玉", level: 49, cp: "7,567,864", cpValue: 7567864, contribution: 990, upgrade: 10, role: "Guild Member", online: false, daysAgo: "1d", avatar: "/static/avatar-taiquanhanyu-thaiboxer-jade.jpg" },
  
  // Vice Master - RegginO: Pink hair with flower crown
  { name: "RegginO", level: 73, cp: "566M 603K", cpValue: 566603000, contribution: 2020, upgrade: 3, role: "Vice Master", online: true, daysAgo: null, avatar: "/static/avatar-reggino-vicemaster-pinkhair.jpg" },
  
  // 阿光Yo: 光 = light - Glowing light mage
  { name: "阿光Yo", level: 67, cp: "144M 110K", cpValue: 144110000, contribution: 780, upgrade: 0, role: "Guild Member", online: false, daysAgo: "1d", avatar: "/static/avatar-aguangyo-light-mage.jpg" },
  
  // Natehouoho: Playful fun adventurer
  { name: "Natehouoho", level: 72, cp: "959M 627K", cpValue: 959627000, contribution: 320, upgrade: 3, role: "Guild Member", online: true, daysAgo: null, avatar: "/static/avatar-natehouoho-playful-adventurer.jpg" },
  
  // 紈稻税著 (Leader): Sleepy gamer falling asleep with phone
  { name: "紈稻税著", level: 71, cp: "458M 115K", cpValue: 458115000, contribution: 2560, upgrade: 0, role: "領導", online: false, daysAgo: "1d", avatar: "/static/avatar-wandaoshuizhu-sleepy-gamer.jpg" },
  
  // 碼農小孫: 碼農 = programmer/coder - Tech geek with glasses
  { name: "碼農小孫", level: 61, cp: "22M 566K", cpValue: 22566000, contribution: 150, upgrade: 0, role: "Guild Member", online: false, daysAgo: "Today", avatar: "/static/avatar-manongxiaosun-programmer.jpg" },
  
  // 騎鳥回家: "Riding bird home" - Character on bird mount
  { name: "騎鳥回家", level: 70, cp: "354M 744K", cpValue: 354744000, contribution: 990, upgrade: 10, role: "Guild Member", online: false, daysAgo: "Today", avatar: "/static/avatar-qiniaohuijia-riding-bird.jpg" },
  
  // TW#VWQG7R9C03: Random ID - Mystery anonymous character
  { name: "TW#VWQG7R9C03", level: 65, cp: "99M 969K", cpValue: 99969000, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "6d", avatar: "/static/avatar-twvwqg-mystery-anonymous.jpg" },
  
  // 小亨寶寶: 寶寶 = baby - Adorable cute baby character
  { name: "小亨寶寶", level: 54, cp: "13M 174K", cpValue: 13174000, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "15d", avatar: "/static/avatar-xiaohengbaobao-baby-cute.jpg" },
  
  // 葉陽: 葉 = leaf, 陽 = sun - Nature druid with sun aura
  { name: "葉陽", level: 46, cp: "2,572,190", cpValue: 2572190, contribution: 0, upgrade: 0, role: "Guild Member", online: false, daysAgo: "16d", avatar: "/static/avatar-yeyang-leaf-sun-nature.jpg" },
]

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

// Translations
const translations = {
  en: {
    joinUs: "Join Us",
    about: "About",
    roster: "Roster",
    cpRace: "CP Race",
    progress: "Progress",
    guildFun: "Guild Fun",
    tagline: "MapleStory Idle RPG Guild",
    motto: "We are not just a guild, but",
    family: "FAMILY",
    meetFamily: "Meet The Family",
    ourJourney: "Our Journey",
    aboutTitle: "About NumbahWan",
    familyMembers: "Family Members",
    highestLevel: "Highest Level",
    billionCP: "Billion+ CP",
    guildMaster: "Guild Master",
    gmDesc: "The legendary leader of NumbahWan, RegginA leads by example - always at the frontline protecting the family.",
    gmQuote: "We rise together, we fall together. That's the NumbahWan way.",
    ourStory: "Our Story",
    storyText1: "NumbahWan started with a simple dream - to become the #1 guild in MapleStory Idle RPG.",
    storyText2: "What makes us special isn't just our CP or rankings - it's our bond. Whether it's boss raids or just hanging out, we're always there for each other.",
    theFamily: "The Family",
    rosterDesc: "Meet our amazing guild members",
    cpLeaderboard: "CP Leaderboard",
    leaderboardDesc: "Who's the strongest?",
    roadToOne: "Road to #1",
    progressDesc: "Our journey to becoming NumbahWan",
    guildLevel: "Guild Level",
    totalCP: "Total Guild CP",
    members: "Members",
    bossRaids: "Boss Raids This Week",
    serverRanking: "Server Ranking",
    milestones: "Milestones",
    shenanigans: "Guild Shenanigans",
    memories: "Memories of our adventures together",
    submitPhoto: "Submit Photo",
    wantToAdd: "Want to add your screenshots?",
    server: "Server: TW",
    madeWith: "Made with ❤️ by the family."
  },
  zh: {
    joinUs: "加入我們",
    about: "關於",
    roster: "成員",
    cpRace: "戰力榜",
    progress: "進度",
    guildFun: "公會趣事",
    tagline: "楓之谷放置RPG公會",
    motto: "我們不只是公會，更是",
    family: "家人",
    meetFamily: "認識家人們",
    ourJourney: "我們的旅程",
    aboutTitle: "關於 NumbahWan",
    familyMembers: "家族成員",
    highestLevel: "最高等級",
    billionCP: "十億+戰力",
    guildMaster: "公會會長",
    gmDesc: "NumbahWan的傳奇領袖，RegginA以身作則 - 永遠站在最前線保護家人。",
    gmQuote: "我們一起崛起，一起承擔。這就是NumbahWan的精神。",
    ourStory: "我們的故事",
    storyText1: "NumbahWan從一個簡單的夢想開始 - 成為楓之谷放置RPG的第一公會。",
    storyText2: "讓我們特別的不只是戰力或排名 - 而是我們的羈絆。無論是打王還是閒聊，我們永遠在彼此身邊。",
    theFamily: "家族成員",
    rosterDesc: "認識我們優秀的公會成員",
    cpLeaderboard: "戰力排行榜",
    leaderboardDesc: "誰是最強的？",
    roadToOne: "邁向第一",
    progressDesc: "我們成為NumbahWan的旅程",
    guildLevel: "公會等級",
    totalCP: "公會總戰力",
    members: "成員數量",
    bossRaids: "本週打王次數",
    serverRanking: "伺服器排名",
    milestones: "里程碑",
    shenanigans: "公會趣事",
    memories: "我們一起冒險的回憶",
    submitPhoto: "上傳照片",
    wantToAdd: "想要分享你的截圖嗎？",
    server: "伺服器：台灣",
    madeWith: "家人們用 ❤️ 製作"
  },
  th: {
    joinUs: "เข้าร่วม",
    about: "เกี่ยวกับ",
    roster: "สมาชิก",
    cpRace: "อันดับ CP",
    progress: "ความคืบหน้า",
    guildFun: "กิลด์สนุกๆ",
    tagline: "กิลด์ MapleStory Idle RPG",
    motto: "เราไม่ได้เป็นแค่กิลด์ แต่เป็น",
    family: "ครอบครัว",
    meetFamily: "พบกับครอบครัว",
    ourJourney: "การเดินทางของเรา",
    aboutTitle: "เกี่ยวกับ NumbahWan",
    familyMembers: "สมาชิกครอบครัว",
    highestLevel: "เลเวลสูงสุด",
    billionCP: "พันล้าน+ CP",
    guildMaster: "หัวหน้ากิลด์",
    gmDesc: "ผู้นำในตำนานของ NumbahWan, RegginA เป็นแบบอย่าง - อยู่แนวหน้าปกป้องครอบครัวเสมอ",
    gmQuote: "เราขึ้นด้วยกัน เราลงด้วยกัน นี่คือวิถี NumbahWan",
    ourStory: "เรื่องราวของเรา",
    storyText1: "NumbahWan เริ่มต้นจากความฝันง่ายๆ - เป็นกิลด์อันดับ 1 ใน MapleStory Idle RPG",
    storyText2: "สิ่งที่ทำให้เราพิเศษไม่ใช่แค่ CP หรืออันดับ - แต่เป็นสายสัมพันธ์ของเรา ไม่ว่าจะบุกบอสหรือแค่แฮงเอาท์ เราอยู่ด้วยกันเสมอ",
    theFamily: "ครอบครัว",
    rosterDesc: "พบกับสมาชิกกิลด์สุดเจ๋งของเรา",
    cpLeaderboard: "อันดับ CP",
    leaderboardDesc: "ใครแข็งแกร่งที่สุด?",
    roadToOne: "สู่อันดับ 1",
    progressDesc: "การเดินทางสู่การเป็น NumbahWan",
    guildLevel: "เลเวลกิลด์",
    totalCP: "CP รวมกิลด์",
    members: "จำนวนสมาชิก",
    bossRaids: "บุกบอสสัปดาห์นี้",
    serverRanking: "อันดับเซิร์ฟเวอร์",
    milestones: "เหตุการณ์สำคัญ",
    shenanigans: "กิลด์สนุกๆ",
    memories: "ความทรงจำการผจญภัยด้วยกัน",
    submitPhoto: "ส่งรูป",
    wantToAdd: "อยากเพิ่มภาพหน้าจอของคุณไหม?",
    server: "เซิร์ฟเวอร์: TW",
    madeWith: "สร้างด้วย ❤️ โดยครอบครัว"
  }
}

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>NumbahWan Guild | MapleStory Idle RPG</title>
    <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
    <!-- INSTANT LOADING SCREEN - renders immediately before any external resources -->
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
      .il-title{font-family:'Orbitron',Arial,sans-serif;font-size:clamp(1.2rem,4vw,2rem);font-weight:700;background:linear-gradient(180deg,#ffcc70 0%,#ff9500 30%,#ff6b00 60%,#cc4400 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-top:30px;animation:ilGlow 2s ease-in-out infinite}
      @keyframes ilGlow{0%,100%{filter:drop-shadow(0 0 10px rgba(255,107,0,.8))}50%{filter:drop-shadow(0 0 20px rgba(255,215,0,1))}}
      .il-dots{display:flex;gap:8px;margin-top:20px}
      .il-dot{width:10px;height:10px;background:#ff6b00;border-radius:50%;animation:ilBounce 1.4s ease-in-out infinite;box-shadow:0 0 10px #ff6b00}
      .il-dot:nth-child(2){animation-delay:.2s;background:#ffd700;box-shadow:0 0 10px #ffd700}
      .il-dot:nth-child(3){animation-delay:.4s}
      @keyframes ilBounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
    </style>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
    <script src="/static/bgm.js" defer></script>
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
<body>
    <!-- INSTANT LOADING SCREEN - shows immediately before anything else loads -->
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
        // Hide loader when page is ready (min 500ms display time)
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
                }, remaining);
            }
            if (document.readyState === 'complete') { hideLoader(); }
            else { window.addEventListener('load', hideLoader); }
        })();
    </script>
    
    <!-- Aurora Background -->
    <div class="aurora-bg"></div>
    
    <!-- Particles -->
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
                <button class="magnetic-btn text-xs sm:text-sm px-3 py-2" onclick="document.getElementById('roster').scrollIntoView({behavior: 'smooth'})" data-i18n="joinUs">
                    Join Us
                </button>
            </div>
        </div>
    </nav>
    
    <!-- Dropdown Menu Panel -->
    <div id="nav-dropdown" class="fixed top-20 left-4 right-4 z-40 glass-card rounded-2xl p-4 hidden nav-dropdown">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a href="#race" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ffd700" d="M19 5H17V3H7V5H5C3.9 5 3 5.9 3 7V8C3 10.2 4.6 12 6.7 12.5C7.4 14 8.9 15.1 10.6 15.4L10 17H8V19H16V17H14L13.4 15.4C15.1 15.1 16.6 14 17.3 12.5C19.4 12 21 10.2 21 8V7C21 5.9 20.1 5 19 5ZM5 8V7H7V10.5C5.8 10 5 9.1 5 8ZM19 8C19 9.1 18.2 10 17 10.5V7H19V8Z"/><rect fill="#ffd700" x="9" y="19" width="6" height="2"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="cpLeaderboard">CP Ranking</span>
                <span class="text-xs text-gray-400">#47 Server</span>
            </a>
            <a href="/pvp" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ef4444" d="M6 2L3 5L9 11L6 14L4 12L2 14L5 17L7 15L9 17L12 14L7 9L10 6L15 11L12 14L14 16L17 13L20 16L22 14L19 11L22 8L16 2L13 5L10 2L6 2Z"/><path fill="#ffd700" d="M9 15L7 17L9 19L11 21L13 19L11 17L9 15Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="gmPvp">GM PvP</span>
                <span class="text-xs text-gray-400">Grandmaster 5</span>
            </a>
            <a href="/fashion" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ec4899" d="M12 2C10 2 9 3 9 4V6L6 10L8 12L6 20H18L16 12L18 10L15 6V4C15 3 14 2 12 2Z"/><circle fill="#ffd700" cx="12" cy="5" r="1.3"/><circle fill="#fff" cx="10" cy="15" r="1" opacity="0.7"/><circle fill="#fff" cx="14" cy="15" r="1" opacity="0.7"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="gmFashion">GM Fashion</span>
                <span class="text-xs text-gray-400">12 Disasters</span>
            </a>
            <a href="/merch" class="dropdown-item highlight">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#a855f7" d="M5 7H19L21 21H3L5 7Z"/><path fill="none" stroke="#0a0a0f" stroke-width="2" stroke-linecap="round" d="M8 7V5C8 3 9.8 1.5 12 1.5C14.2 1.5 16 3 16 5V7"/><rect fill="#ffd700" x="9" y="11" width="6" height="2" rx="1"/></svg>
                <span class="font-bold text-purple-400 text-sm" data-i18n="exclusiveMerch">Merch</span>
                <span class="text-xs text-yellow-400">Members Only</span>
            </a>
            <a href="/fortune" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><circle fill="#a855f7" cx="12" cy="10" r="8"/><ellipse fill="#0a0a0f" cx="12" cy="20" rx="5" ry="2" opacity="0.7"/><circle fill="#fff" cx="8" cy="7" r="2" opacity="0.5"/><path fill="#ffd700" d="M10 11L12 9L15 12L12 14L10 11Z" opacity="0.6"/></svg>
                <span class="font-bold text-purple-400 text-sm" data-i18n="dailyFortune">Fortune</span>
                <span class="text-xs text-purple-300">Daily Luck</span>
            </a>
            <a href="#roster" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><circle fill="#ff6b00" cx="9" cy="7" r="4"/><path fill="#ff6b00" d="M2 20C2 16 5 13 9 13C13 13 16 16 16 20H2Z"/><circle fill="#ffd700" cx="17" cy="8" r="3"/><path fill="#ffd700" d="M13 20C13 16.5 15 14 17 14C19 14 22 16.5 22 20H13Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="theFamily">Members</span>
                <span class="text-xs text-gray-400">12 Family</span>
            </a>
            <a href="#gallery" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ec4899" d="M20 5H17L15 3H9L7 5H4C2.9 5 2 5.9 2 7V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V7C22 5.9 21.1 5 20 5Z"/><circle fill="#0a0a0f" cx="12" cy="13" r="5"/><circle fill="#3b82f6" cx="12" cy="13" r="3"/><circle fill="#fff" cx="10" cy="11" r="1"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="shenanigans">Shenanigans</span>
                <span class="text-xs text-gray-400">6 Photos</span>
            </a>
            <a href="#progress" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><rect fill="#22c55e" x="3" y="3" width="18" height="18" rx="2"/><rect fill="#0a0a0f" x="5" y="5" width="14" height="14" rx="1" opacity="0.4"/><path fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" d="M6 16L10 11L14 14L18 7"/><circle fill="#ffd700" cx="18" cy="7" r="2"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="roadToOne">Progress</span>
                <span class="text-xs text-gray-400">Road to #1</span>
            </a>
            <a href="#progress" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ef4444" d="M18 3L20 6L18 9L21 7V11L18 14L21 17L17 19L14 17L11 19L8 17L4 19L2 15L5 12L2 9L5 6L8 8L11 5L14 7L17 4L18 3Z"/><circle fill="#ffd700" cx="15" cy="10" r="1.8"/><circle fill="#0a0a0f" cx="15" cy="10" r="0.7"/><path fill="#ff6b00" d="M9 18L7 22L10 21L12 23L14 21L17 22L15 18H9Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="bossRaids">Boss Raids</span>
                <span class="text-xs text-gray-400">24/35</span>
            </a>
            <a href="#about" onclick="closeNavMenu()" class="dropdown-item">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ffd700" d="M3 18H21V16L18 8L14 12L12 6L10 12L6 8L3 16V18Z"/><circle fill="#fff" cx="6" cy="7" r="2"/><circle fill="#fff" cx="12" cy="5" r="2"/><circle fill="#fff" cx="18" cy="7" r="2"/><circle fill="#ef4444" cx="6" cy="7" r="1"/><circle fill="#3b82f6" cx="12" cy="5" r="1"/><circle fill="#22c55e" cx="18" cy="7" r="1"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="guildMaster">Guild Master</span>
                <span class="text-xs text-gray-400">RegginA</span>
            </a>
            <a href="/apply" class="dropdown-item highlight">
                <svg class="mb-1" width="28" height="28" viewBox="0 0 24 24"><path fill="#ff6b00" d="M12 2C12 2 6 8 6 14C6 16 7 18 8 19L10 17V14L12 12L14 14V17L16 19C17 18 18 16 18 14C18 8 12 2 12 2Z"/><circle fill="#0a0a0f" cx="12" cy="10" r="2.5"/><circle fill="#3b82f6" cx="12" cy="10" r="1.5"/><path fill="#ff4500" d="M10 19L8 23L10 21L12 24L14 21L16 23L14 19H10Z"/></svg>
                <span class="font-bold text-orange-400 text-sm" data-i18n="joinUs">Join Us</span>
                <span class="text-xs text-green-400">Recruiting!</span>
            </a>
        </div>
    </div>
    
    <!-- Hero Section with Banner Image -->
    <section id="hero" class="hero-banner">
        <div class="hero-content w-full max-w-4xl mx-auto">
            <div class="flex justify-center mb-6" id="hero-emblem">
                ${generateEmblemSVG('emblem-n emblem-n-large', 100)}
            </div>
            <h1 class="pixel-title mb-4" id="guild-name" style="display: block; width: 100%; text-align: center; margin-left: auto; margin-right: auto;">
                NumbahWan
            </h1>
            <p class="text-xl md:text-2xl text-orange-300 mb-6 opacity-0" id="tagline" data-i18n="tagline">
                MapleStory Idle RPG Guild
            </p>
            <div class="glass-card p-4 md:p-6 max-w-xl mx-auto mb-8 opacity-0" id="motto-card">
                <p class="text-base md:text-xl italic text-orange-200">
                    "<span data-i18n="motto">We are not just a guild, but</span> <span class="text-orange-400 font-bold" data-i18n="family">FAMILY</span>"
                </p>
            </div>
            <div class="flex flex-wrap justify-center gap-4 opacity-0" id="hero-buttons">
                <button class="magnetic-btn" onclick="document.getElementById('roster').scrollIntoView({behavior: 'smooth'})">
                    ${iconSword()} <span data-i18n="meetFamily">Meet The Family</span>
                </button>
                <button class="magnetic-btn" style="background: transparent; border: 2px solid var(--primary);" onclick="document.getElementById('progress').scrollIntoView({behavior: 'smooth'})">
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
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="12">0</div>
                    <p class="text-orange-300 mt-2" data-i18n="familyMembers">Family Members</p>
                </div>
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="76">0</div>
                    <p class="text-orange-300 mt-2" data-i18n="highestLevel">Highest Level</p>
                </div>
                <div class="glass-card p-8 text-center reveal">
                    <div class="stat-number" data-count="2">0</div>
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
                                <p class="text-orange-300">Level 76 • CP: 2B 325M</p>
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
    
    <!-- Member Roster Section -->
    <section id="roster" class="py-20 px-4">
        <div class="container mx-auto max-w-7xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconUsers()} <span data-i18n="theFamily">The Family</span>
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal" data-i18n="rosterDesc">Meet our amazing guild members</p>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${members.map((member, index) => `
                    <div class="member-card glass-card p-6 reveal" style="animation-delay: ${index * 0.1}s">
                        <div class="relative">
                            ${index === 0 ? '<span class="crown"><svg class="nw-icon" width="24" height="24" style="color:#ffd700"><use href="/static/icons/nw-icons.svg#crown"></use></svg></span>' : ''}
                            <div class="flex items-center gap-4 mb-4">
                                ${member.avatar 
                                    ? `<img src="${member.avatar}" alt="${member.name}" class="w-16 h-16 rounded-full object-cover border-2 border-orange-500" loading="lazy" />`
                                    : `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold">
                                    ${member.name.charAt(0).toUpperCase()}
                                </div>`
                                }
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
                ${iconRace()} <span data-i18n="cpLeaderboard">CP Race</span>
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal" data-i18n="leaderboardDesc">Who's the strongest?</p>
            
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
                                <p class="font-bold text-orange-400">First 2B CP Member!</p>
                                <p class="text-gray-400 text-sm">RegginA reached 2B 325M CP</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <svg class="nw-icon" width="28" height="28" style="color:#22c55e"><use href="/static/icons/nw-icons.svg#check-circle"></use></svg>
                            <div>
                                <p class="font-bold text-orange-400">12 Members Strong</p>
                                <p class="text-gray-400 text-sm">Our family keeps growing!</p>
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
    
    <!-- Guild Fun Gallery Section -->
    <section id="gallery" class="py-20 px-4">
        <div class="container mx-auto max-w-6xl">
            <h2 class="text-4xl font-bold text-center mb-4 neon-orange reveal">
                ${iconCamera()} <span data-i18n="shenanigans">Guild Shenanigans</span>
            </h2>
            <p class="text-center text-orange-300 mb-12 reveal" data-i18n="memories">Memories of our adventures together</p>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${guildFunPhotos.map((photo, index) => `
                    <div class="photo-card glass-card reveal overflow-hidden group cursor-pointer" style="animation-delay: ${index * 0.1}s">
                        <img src="${photo.image}" alt="${photo.title.en}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-4">
                            <h3 class="font-bold text-orange-400 text-lg" data-i18n-photo="${photo.id}" data-i18n-field="title">${photo.title.en}</h3>
                            <p class="text-sm text-gray-300" data-i18n-photo="${photo.id}" data-i18n-field="description">${photo.description.en}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="text-center mt-12 reveal">
                <p class="text-gray-400 mb-4" data-i18n="wantToAdd">Want to add your screenshots?</p>
                <button class="magnetic-btn">
                    ${iconUpload()} <span data-i18n="submitPhoto">Submit Photo</span>
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
            <p class="text-gray-400 mb-6">"<span data-i18n="motto">We are not just a guild, but</span> <span data-i18n="family">FAMILY</span>"</p>
            <p class="text-gray-500 text-sm">MapleStory Idle RPG | <span data-i18n="server">Server: TW</span></p>
            <p class="text-gray-600 text-xs mt-4">© 2024 NumbahWan Guild. <span data-i18n="madeWith">Made with ❤️ by the family.</span></p>
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
        
        // ========== LANGUAGE SYSTEM ==========
        const translations = {
            en: {
                joinUs: "Join Us", about: "About", roster: "Roster", cpRace: "CP Race", 
                progress: "Progress", guildFun: "Guild Fun", tagline: "MapleStory Idle RPG Guild",
                motto: "We are not just a guild, but", family: "FAMILY", meetFamily: "Meet The Family",
                ourJourney: "Our Journey", aboutTitle: "About NumbahWan", familyMembers: "Family Members",
                highestLevel: "Highest Level", billionCP: "Billion+ CP", guildMaster: "Guild Master",
                gmDesc: "The legendary leader of NumbahWan, RegginA leads by example - always at the frontline protecting the family.",
                gmQuote: "We rise together, we fall together. That's the NumbahWan way.",
                ourStory: "Our Story", storyText1: "NumbahWan started with a simple dream - to become the #1 guild in MapleStory Idle RPG.",
                storyText2: "What makes us special isn't just our CP or rankings - it's our bond. Whether it's boss raids or just hanging out, we're always there for each other.",
                theFamily: "The Family", rosterDesc: "Meet our amazing guild members", cpLeaderboard: "CP Leaderboard",
                leaderboardDesc: "Who's the strongest?", roadToOne: "Road to #1", progressDesc: "Our journey to becoming NumbahWan",
                guildLevel: "Guild Level", totalCP: "Total Guild CP", members: "Members", bossRaids: "Boss Raids",
                serverRanking: "Server Ranking", milestones: "Milestones", shenanigans: "Shenanigans",
                memories: "Memories of our adventures together", submitPhoto: "Submit Photo", wantToAdd: "Want to add your screenshots?",
                server: "Server: TW", madeWith: "Made with ❤️ by the family.",
                gmPvp: "GM PvP", gmFashion: "GM Fashion", exclusiveMerch: "Merch", dailyFortune: "Fortune", contentRankDesc: "Guild Power Rankings", pvpRankDesc: "Battle Rankings",
                membersDesc: "Our Guild Members", funDesc: "Fun Moments", progressDesc2: "Guild Progress",
                raidsDesc: "Weekly Battles", gmDesc2: "Our Leader", joinDesc: "Become Family"
            },
            zh: {
                joinUs: "加入我們", about: "關於", roster: "成員", cpRace: "戰力榜", 
                progress: "進度", guildFun: "公會趣事", tagline: "楓之谷放置RPG公會",
                motto: "我們不只是公會，更是", family: "家人", meetFamily: "認識家人們",
                ourJourney: "我們的旅程", aboutTitle: "關於 NumbahWan", familyMembers: "家族成員",
                highestLevel: "最高等級", billionCP: "十億+戰力", guildMaster: "公會會長",
                gmDesc: "NumbahWan的傳奇領袖，RegginA以身作則 - 永遠站在最前線保護家人。",
                gmQuote: "我們一起崛起，一起承擔。這就是NumbahWan的精神。",
                ourStory: "我們的故事", storyText1: "NumbahWan從一個簡單的夢想開始 - 成為楓之谷放置RPG的第一公會。",
                storyText2: "讓我們特別的不只是戰力或排名 - 而是我們的羈絆。無論是打王還是閒聊，我們永遠在彼此身邊。",
                theFamily: "家族成員", rosterDesc: "認識我們優秀的公會成員", cpLeaderboard: "戰力排行榜",
                leaderboardDesc: "誰是最強的？", roadToOne: "邁向第一", progressDesc: "我們成為NumbahWan的旅程",
                guildLevel: "公會等級", totalCP: "公會總戰力", members: "成員數量", bossRaids: "打王",
                serverRanking: "伺服器排名", milestones: "里程碑", shenanigans: "公會趣事",
                memories: "我們一起冒險的回憶", submitPhoto: "上傳照片", wantToAdd: "想要分享你的截圖嗎？",
                server: "伺服器：台灣", madeWith: "家人們用 ❤️ 製作",
                gmPvp: "會長PvP", gmFashion: "會長時尚", exclusiveMerch: "限定商品", dailyFortune: "每日運勢", contentRankDesc: "公會戰力排名", pvpRankDesc: "戰鬥排名",
                membersDesc: "我們的成員", funDesc: "歡樂時刻", progressDesc2: "公會進度",
                raidsDesc: "每週戰鬥", gmDesc2: "我們的領袖", joinDesc: "成為家人"
            },
            th: {
                joinUs: "เข้าร่วม", about: "เกี่ยวกับ", roster: "สมาชิก", cpRace: "อันดับ CP", 
                progress: "ความคืบหน้า", guildFun: "กิลด์สนุกๆ", tagline: "กิลด์ MapleStory Idle RPG",
                motto: "เราไม่ได้เป็นแค่กิลด์ แต่เป็น", family: "ครอบครัว", meetFamily: "พบกับครอบครัว",
                ourJourney: "การเดินทางของเรา", aboutTitle: "เกี่ยวกับ NumbahWan", familyMembers: "สมาชิกครอบครัว",
                highestLevel: "เลเวลสูงสุด", billionCP: "พันล้าน+ CP", guildMaster: "หัวหน้ากิลด์",
                gmDesc: "ผู้นำในตำนานของ NumbahWan, RegginA เป็นแบบอย่าง - อยู่แนวหน้าปกป้องครอบครัวเสมอ",
                gmQuote: "เราขึ้นด้วยกัน เราลงด้วยกัน นี่คือวิถี NumbahWan",
                ourStory: "เรื่องราวของเรา", storyText1: "NumbahWan เริ่มต้นจากความฝันง่ายๆ - เป็นกิลด์อันดับ 1 ใน MapleStory Idle RPG",
                storyText2: "สิ่งที่ทำให้เราพิเศษไม่ใช่แค่ CP หรืออันดับ - แต่เป็นสายสัมพันธ์ของเรา ไม่ว่าจะบุกบอสหรือแค่แฮงเอาท์ เราอยู่ด้วยกันเสมอ",
                theFamily: "ครอบครัว", rosterDesc: "พบกับสมาชิกกิลด์สุดเจ๋งของเรา", cpLeaderboard: "อันดับ CP",
                leaderboardDesc: "ใครแข็งแกร่งที่สุด?", roadToOne: "สู่อันดับ 1", progressDesc: "การเดินทางสู่การเป็น NumbahWan",
                guildLevel: "เลเวลกิลด์", totalCP: "CP รวมกิลด์", members: "จำนวนสมาชิก", bossRaids: "บุกบอส",
                serverRanking: "อันดับเซิร์ฟเวอร์", milestones: "เหตุการณ์สำคัญ", shenanigans: "สนุกๆ",
                memories: "ความทรงจำการผจญภัยด้วยกัน", submitPhoto: "ส่งรูป", wantToAdd: "อยากเพิ่มภาพหน้าจอของคุณไหม?",
                server: "เซิร์ฟเวอร์: TW", madeWith: "สร้างด้วย ❤️ โดยครอบครัว",
                gmPvp: "GM PvP", gmFashion: "แฟชั่น GM", exclusiveMerch: "สินค้า", dailyFortune: "ดวงประจำวัน", contentRankDesc: "อันดับพลังกิลด์", pvpRankDesc: "อันดับต่อสู้",
                membersDesc: "สมาชิกกิลด์", funDesc: "ช่วงเวลาสนุก", progressDesc2: "ความคืบหน้ากิลด์",
                raidsDesc: "ต่อสู้รายสัปดาห์", gmDesc2: "ผู้นำของเรา", joinDesc: "เป็นครอบครัว"
            }
        };
        
        const photoTranslations = {
            1: { title: { en: "Henesys Market Day", zh: "乾坤西斯市集日", th: "วันตลาดเฮเนซิส" }, description: { en: "Shopping with the squad!", zh: "和夥伴們一起逛街！", th: "ช้อปปิ้งกับทีม!" }},
            2: { title: { en: "Selfie Time!", zh: "自拍時間！", th: "เวลาเซลฟี่!" }, description: { en: "Best friends forever", zh: "永遠的好朋友", th: "เพื่อนที่ดีที่สุดตลอดไป" }},
            3: { title: { en: "Sunset Chill", zh: "夕陽時光", th: "พักผ่อนยามเย็น" }, description: { en: "RegginA & friend on cloud nine", zh: "RegginA和朋友在雲端", th: "RegginA และเพื่อนบนเมฆ" }},
            4: { title: { en: "Wings of Destiny", zh: "命運之翼", th: "ปีกแห่งโชคชะตา" }, description: { en: "Power couple goals", zh: "戰力夫妻目標", th: "เป้าหมายคู่รักสุดแกร่ง" }},
            5: { title: { en: "First Time Together", zh: "第一次一起", th: "ครั้งแรกด้วยกัน" }, description: { en: "Where it all began", zh: "一切的開始", th: "จุดเริ่มต้นของทุกอย่าง" }},
            6: { title: { en: "Boss Raid!", zh: "打王啦！", th: "บุกบอส!" }, description: { en: "Kerning City throwdown", zh: "乾坤城大戰", th: "ศึกเคอร์นิ่งซิตี้" }}
        };
        
        const langFlags = { en: "🇬🇧", zh: "🇹🇼", th: "🇹🇭" };
        const langCodes = { en: "EN", zh: "中文", th: "ไทย" };
        
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
