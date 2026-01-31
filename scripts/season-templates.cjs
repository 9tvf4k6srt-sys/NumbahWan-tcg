/**
 * NumbahWan TCG - Complete Season Templates (S3-S10)
 * Fun, compelling cards that make people NEED to collect!
 * 
 * Each season: 68 cards (2 Mythic, 6 Legendary, 10 Epic, 15 Rare, 15 Uncommon, 20 Common)
 */

// ============================================
// SHARED UTILITIES
// ============================================
const RARITY_STATS = {
  mythic: { atk: [11, 14], hp: [11, 15], cost: [8, 10], spd: [10, 14], crit: [15, 25], dodge: [10, 15] },
  legendary: { atk: [7, 11], hp: [8, 12], cost: [6, 8], spd: [8, 16], crit: [12, 22], dodge: [10, 20] },
  epic: { atk: [5, 9], hp: [6, 11], cost: [4, 6], spd: [7, 14], crit: [10, 20], dodge: [8, 16] },
  rare: { atk: [4, 8], hp: [5, 10], cost: [3, 5], spd: [6, 13], crit: [8, 18], dodge: [6, 14] },
  uncommon: { atk: [3, 6], hp: [4, 8], cost: [2, 4], spd: [5, 11], crit: [5, 15], dodge: [5, 12] },
  common: { atk: [1, 4], hp: [2, 6], cost: [1, 3], spd: [4, 10], crit: [3, 12], dodge: [3, 10] }
};

function randomBetween(min, max, seed = null) {
  if (seed !== null) {
    // Seeded random for consistent generation
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStats(rarity, cardId) {
  const r = RARITY_STATS[rarity];
  return {
    atk: randomBetween(r.atk[0], r.atk[1], cardId),
    hp: randomBetween(r.hp[0], r.hp[1], cardId + 1),
    cost: randomBetween(r.cost[0], r.cost[1], cardId + 2),
    spd: randomBetween(r.spd[0], r.spd[1], cardId + 3),
    crit: randomBetween(r.crit[0], r.crit[1], cardId + 4),
    dodge: randomBetween(r.dodge[0], r.dodge[1], cardId + 5)
  };
}

// ============================================
// SEASON 3: CYBER SIEGE
// ============================================
const SEASON_3 = {
  id: 3,
  name: "Cyber Siege",
  subtitle: "The Digital Uprising",
  theme: "cyberpunk",
  icon: "🤖",
  color: "#00ffff",
  bgGradient: "linear-gradient(135deg, #00ffff, #0080ff)",
  lore: {
    title: "System Crash",
    leader: "RegginA.EXE",
    setting: "A rogue AI named MegaByte has infected the game servers. RegginA uploads her consciousness to fight in cyberspace where code is law."
  },
  mechanics: {
    HACK: { desc: "Take control of enemy card for 1 turn" },
    FIREWALL: { desc: "Block the next attack completely" },
    OVERCLOCK: { desc: "Double ATK but take damage after" },
    VIRUS: { desc: "Spread -1/-1 to adjacent enemies" },
    REBOOT: { desc: "Return to hand when destroyed" }
  },
  categories: ["virus", "program", "ai", "hacker", "firewall", "glitch"],
  cards: [
    // MYTHICS (2)
    { name: { en: "MegaByte, The Virus King", zh: "兆字节，病毒之王", th: "เมกะไบต์ ราชาไวรัส" }, rarity: "mythic", category: "virus", desc: { en: "Born from corrupted code. Antivirus is futile.", zh: "从损坏的代码中诞生。杀毒软件无效。", th: "เกิดจากโค้ดเสียหาย แอนตี้ไวรัสไร้ประโยชน์" }, abilities: ["VIRUS", "HACK"], special: { name: "TOTAL INFECTION", desc: "All enemy cards become Virus type and lose 2 ATK" } },
    { name: { en: "RegginA.EXE", zh: "RegginA.EXE", th: "RegginA.EXE" }, rarity: "mythic", category: "program", desc: { en: "She uploaded her consciousness. Now she IS the firewall.", zh: "她上传了意识。现在她就是防火墙。", th: "เธออัพโหลดจิตสำนึก ตอนนี้เธอคือไฟร์วอลล์" }, abilities: ["FIREWALL", "REBOOT"], special: { name: "ADMIN PRIVILEGES", desc: "Cannot be HACKED. Cure all VIRUS effects" } },
    
    // LEGENDARIES (6)
    { name: { en: "The Hacker (1337_H4X0R)", zh: "黑客 (1337_H4X0R)", th: "แฮกเกอร์ (1337_H4X0R)" }, rarity: "legendary", category: "hacker", desc: { en: "Drinks only Mountain Dew. Types 200 WPM. Never seen sunlight.", zh: "只喝激浪。打字200WPM。从未见过阳光。", th: "ดื่มแต่เมาน์เทนดิว พิมพ์ 200 คำ/นาที ไม่เคยเห็นแดด" }, abilities: ["HACK", "OVERCLOCK"], special: { name: "ZERO DAY EXPLOIT", desc: "First attack each turn is guaranteed critical" } },
    { name: { en: "Firewall Guardian", zh: "防火墙守护者", th: "ผู้พิทักษ์ไฟร์วอลล์" }, rarity: "legendary", category: "firewall", desc: { en: "The last line of defense. Hackers fear the Guardian.", zh: "最后的防线。黑客害怕守护者。", th: "แนวป้องกันสุดท้าย แฮกเกอร์กลัว" }, abilities: ["FIREWALL", "FIREWALL"], special: { name: "DOUBLE PROTECTION", desc: "Blocks TWO attacks" } },
    { name: { en: "Neon Samurai", zh: "霓虹武士", th: "ซามูไรนีออน" }, rarity: "legendary", category: "program", desc: { en: "His blade cuts through firewalls like butter.", zh: "他的刀切穿防火墙如切黄油。", th: "ดาบตัดไฟร์วอลล์เหมือนเนย" }, abilities: ["OVERCLOCK"], special: { name: "DIGITAL SLASH", desc: "Ignores FIREWALL effects" } },
    { name: { en: "Glitch Assassin", zh: "故障刺客", th: "นักฆ่ากลิทช์" }, rarity: "legendary", category: "glitch", desc: { en: "Exists between frames. You never see him coming.", zh: "存在于帧之间。你永远看不到他来。", th: "มีอยู่ระหว่างเฟรม คุณไม่มีทางเห็นเขา" }, abilities: ["REBOOT"], special: { name: "FRAME SKIP", desc: "50% chance to dodge any attack" } },
    { name: { en: "Quantum Computer", zh: "量子计算机", th: "คอมพิวเตอร์ควอนตัม" }, rarity: "legendary", category: "ai", desc: { en: "Is it alive? Dead? Both? Neither? Yes.", zh: "它活着？死了？两者都是？都不是？是的。", th: "มันมีชีวิต? ตาย? ทั้งคู่? ไม่ใช่? ใช่" }, abilities: ["HACK", "FIREWALL"], special: { name: "SUPERPOSITION", desc: "50% no damage, 50% double damage when attacked" } },
    { name: { en: "Root Access", zh: "根权限", th: "Root Access" }, rarity: "legendary", category: "hacker", desc: { en: "sudo rm -rf * ...wait, that's not what I meant!", zh: "sudo rm -rf * ...等等，这不是我想的！", th: "sudo rm -rf * ...เดี๋ยว นั่นไม่ใช่ที่ฉันหมายถึง!" }, abilities: ["HACK", "OVERCLOCK"], special: { name: "SUDO", desc: "Bypass all permissions and protections" } },
    
    // EPICS (10)
    { name: { en: "CAPTCHA Breaker", zh: "验证码破解者", th: "ตัวทำลายแคปช่า" }, rarity: "epic", category: "ai", desc: { en: "Can solve any CAPTCHA. Yes, even the fire hydrants.", zh: "能解任何验证码。是的，包括消防栓。", th: "แก้แคปช่าได้ทุกอัน ใช่ แม้แต่หัวดับเพลิง" }, abilities: ["HACK"], special: { name: "I AM NOT A ROBOT", desc: "Bypass enemy defenses once per turn" } },
    { name: { en: "Blue Screen of Death", zh: "蓝屏死机", th: "จอฟ้ามรณะ" }, rarity: "epic", category: "glitch", desc: { en: "The most feared sight in computing.", zh: "计算中最可怕的景象。", th: "ภาพที่น่ากลัวที่สุดในคอมพิวเตอร์" }, abilities: ["VIRUS"], special: { name: "SYSTEM CRASH", desc: "Freeze ALL cards for 2 turns when destroyed" } },
    { name: { en: "Lag Monster", zh: "延迟怪兽", th: "สัตว์ประหลาดแลค" }, rarity: "epic", category: "glitch", desc: { en: "Appears when your connection is worst. Feeds on frustration.", zh: "在连接最差时出现。以挫败感为食。", th: "ปรากฏเมื่อเน็ตแย่สุด กินความหงุดหงิด" }, abilities: ["VIRUS"], special: { name: "999 PING", desc: "Enemy cards attack last" } },
    { name: { en: "Crypto Miner", zh: "加密矿工", th: "นักขุดคริปโต" }, rarity: "epic", category: "program", desc: { en: "Uses 100% of your CPU. Your fans are screaming.", zh: "使用100%的CPU。风扇在尖叫。", th: "ใช้ CPU 100% พัดลมกรีดร้อง" }, abilities: ["OVERCLOCK"], special: { name: "TO THE MOON", desc: "Gain +1 ATK each turn (max +10)" } },
    { name: { en: "DDOS Dragon", zh: "DDOS龙", th: "มังกร DDOS" }, rarity: "epic", category: "ai", desc: { en: "Breathes a million requests per second.", zh: "每秒吐出一百万个请求。", th: "พ่นล้านคำร้องต่อวินาที" }, abilities: ["VIRUS", "OVERCLOCK"], special: { name: "SERVER OVERLOAD", desc: "Attack ALL enemies for half damage" } },
    { name: { en: "Dark Web Dealer", zh: "暗网商人", th: "พ่อค้าดาร์กเว็บ" }, rarity: "epic", category: "hacker", desc: { en: "Sells exploits, data, souls. Bitcoin only. No refunds.", zh: "卖漏洞、数据、灵魂。只收比特币。不退款。", th: "ขายช่องโหว่ ข้อมูล วิญญาณ บิทคอยน์เท่านั้น ไม่คืนเงิน" }, abilities: ["HACK"], special: { name: "BLACK MARKET", desc: "Copy any card from enemy's graveyard" } },
    { name: { en: "Meme Lord Protocol", zh: "梗王协议", th: "โปรโตคอลมีมลอร์ด" }, rarity: "epic", category: "ai", desc: { en: "Achieved meme consciousness. Communicates in reaction images.", zh: "达成迷因意识。用表情包交流。", th: "บรรลุจิตสำนึกมีม สื่อสารด้วยรูปรีแอคชัน" }, abilities: ["HACK", "VIRUS"], special: { name: "VIRAL MEME", desc: "Summon a copy when this card wins combat" } },
    { name: { en: "GitHub Copilot", zh: "GitHub Copilot", th: "GitHub Copilot" }, rarity: "epic", category: "ai", desc: { en: "AI that writes code. Sometimes correct. Sometimes plagiarism.", zh: "写代码的AI。有时正确。有时抄袭。", th: "AI เขียนโค้ด บางทีถูก บางทีลอก" }, abilities: ["HACK", "REBOOT"], special: { name: "AUTOCOMPLETE", desc: "Predict and counter enemy's next ability" } },
    { name: { en: "Deepfake Doppelganger", zh: "深度伪造替身", th: "Deepfake" }, rarity: "epic", category: "ai", desc: { en: "Is that really them? You can't tell anymore.", zh: "那真的是他们吗？你分辨不出了。", th: "นั่นจริงๆ เป็นพวกเขาไหม? บอกไม่ได้แล้ว" }, abilities: ["HACK"], special: { name: "IMPERSONATE", desc: "Become a copy of any card until end of turn" } },
    { name: { en: "Trojan Horse.zip", zh: "木马.zip", th: "Trojan Horse.zip" }, rarity: "epic", category: "virus", desc: { en: "Looks like a gift! Definitely not a gift.", zh: "看起来像礼物！绝对不是礼物。", th: "ดูเหมือนของขวัญ! แน่นอนไม่ใช่" }, abilities: ["VIRUS", "HACK"], special: { name: "GIFT BOX", desc: "Give to enemy. Explodes for 8 damage after 2 turns" } },
    
    // RARES (15)
    { name: { en: "Cookie Monster.exe", zh: "饼干怪兽.exe", th: "Cookie Monster.exe" }, rarity: "rare", category: "virus", desc: { en: "Tracks your every move. Knows what you browsed at 3 AM.", zh: "追踪你的每一步。知道你凌晨3点看了什么。", th: "ติดตามทุกการเคลื่อนไหว รู้ว่าดูอะไรตอนตี 3" }, abilities: ["HACK"], special: { name: "DATA HARVEST", desc: "See enemy's hand for 2 turns" } },
    { name: { en: "Script Kiddie", zh: "脚本小子", th: "Script Kiddie" }, rarity: "rare", category: "hacker", desc: { en: "Uses tools he doesn't understand. Mom pays for WiFi.", zh: "用他不懂的工具。妈妈付WiFi费。", th: "ใช้เครื่องมือที่ไม่เข้าใจ แม่จ่ายค่า WiFi" }, abilities: ["HACK"], special: { name: "COPY PASTE", desc: "Copy last enemy ability" } },
    { name: { en: "Keyboard Warrior", zh: "键盘侠", th: "นักรบคีย์บอร์ด" }, rarity: "rare", category: "hacker", desc: { en: "Feared in forums. Useless IRL.", zh: "论坛里可怕。现实中没用。", th: "น่ากลัวในฟอรัม ไร้ประโยชน์ในชีวิตจริง" }, abilities: ["OVERCLOCK"], special: { name: "CAPS LOCK", desc: "+3 ATK but enemy's next attacker also gets +3" } },
    { name: { en: "VPN Ninja", zh: "VPN忍者", th: "VPN Ninja" }, rarity: "rare", category: "program", desc: { en: "Could be anywhere. Currently in 7 countries.", zh: "可能在任何地方。目前在7个国家。", th: "อาจอยู่ที่ไหนก็ได้ ตอนนี้อยู่ 7 ประเทศ" }, abilities: ["REBOOT"], special: { name: "PROXY HOP", desc: "Redirect attack to random enemy" } },
    { name: { en: "Antivirus Knight", zh: "杀毒骑士", th: "อัศวินแอนตี้ไวรัส" }, rarity: "rare", category: "program", desc: { en: "Your trial has expired. Please renew?", zh: "您的试用已过期。请续订？", th: "ทดลองใช้หมดอายุ กรุณาต่ออายุ?" }, abilities: ["FIREWALL"], special: { name: "QUARANTINE", desc: "Remove VIRUS from one ally" } },
    { name: { en: "RAM Hoarder (Chrome)", zh: "内存囤积者(Chrome)", th: "RAM Hoarder (Chrome)" }, rarity: "rare", category: "program", desc: { en: "Chrome has 847 tabs open. Chrome is hungry.", zh: "Chrome打开了847个标签页。Chrome饿了。", th: "Chrome เปิด 847 แท็บ Chrome หิว" }, abilities: ["OVERCLOCK"], special: { name: "MEMORY LEAK", desc: "Steal 2 HP from all enemies each turn" } },
    { name: { en: "Ctrl+Z", zh: "撤销", th: "Ctrl+Z" }, rarity: "rare", category: "program", desc: { en: "The most powerful keystroke. Undo everything.", zh: "最强大的按键。撤销一切。", th: "ปุ่มลัดที่ทรงพลังที่สุด ยกเลิกทุกอย่าง" }, abilities: ["REBOOT"], special: { name: "UNDO", desc: "Return last played card to hand" } },
    { name: { en: "Alt+F4 Trickster", zh: "Alt+F4骗子", th: "Alt+F4 Trickster" }, rarity: "rare", category: "hacker", desc: { en: "Press Alt+F4 to win! (It doesn't work)", zh: "按Alt+F4获胜！（不管用）", th: "กด Alt+F4 เพื่อชนะ! (ไม่ได้ผล)" }, abilities: ["HACK"], special: { name: "CLOSE PROGRAM", desc: "25% chance to instantly destroy any card" } },
    { name: { en: "Two Factor Auth", zh: "双因素认证", th: "2FA" }, rarity: "rare", category: "firewall", desc: { en: "Check your phone. No, your other phone.", zh: "检查手机。不，另一个手机。", th: "เช็คมือถือ ไม่ อีกเครื่อง" }, abilities: ["FIREWALL"], special: { name: "DOUBLE CHECK", desc: "HACK must be used twice to work" } },
    { name: { en: "Binary Berserker", zh: "二进制狂战士", th: "Binary Berserker" }, rarity: "rare", category: "ai", desc: { en: "Only speaks in 0s and 1s. 01001011 01001001 01001100 01001100", zh: "只说0和1。01001011 01001001 01001100 01001100", th: "พูดแค่ 0 กับ 1" }, abilities: ["OVERCLOCK"], special: { name: "10101010", desc: "Deal damage equal to enemy's ATK" } },
    { name: { en: "Debugging Duck Army", zh: "调试鸭军团", th: "กองทัพเป็ดดีบัก" }, rarity: "rare", category: "program", desc: { en: "One duck sees one bug. A thousand ducks see all.", zh: "一只鸭子看到一个bug。一千只看到全部。", th: "เป็ดตัวหนึ่งเห็นบั๊กหนึ่ง พันตัวเห็นทั้งหมด" }, abilities: ["FIREWALL"], special: { name: "DUCK DEBUGGER", desc: "Reveal all hidden enemy cards" } },
    { name: { en: "USB of Destiny", zh: "命运之USB", th: "USB แห่งโชคชะตา" }, rarity: "rare", category: "program", desc: { en: "First try: wrong. Second: still wrong. Third: got it!", zh: "第一次：错。第二次：还错。第三次：对了！", th: "ครั้งแรก: ผิด ที่สอง: ยังผิด ที่สาม: ได้แล้ว!" }, abilities: ["REBOOT"], special: { name: "THIRD TIME", desc: "Fails twice, then succeeds with double effect" } },
    { name: { en: "404 Hero Not Found", zh: "404英雄未找到", th: "404 Hero Not Found" }, rarity: "rare", category: "glitch", desc: { en: "The hero we needed couldn't be loaded.", zh: "我们需要的英雄无法加载。", th: "ฮีโร่ที่ต้องการโหลดไม่ได้" }, abilities: ["REBOOT"], special: { name: "PAGE NOT FOUND", desc: "Redirect attack to random target" } },
    { name: { en: "System32 Guardian", zh: "System32守护者", th: "System32 Guardian" }, rarity: "rare", category: "firewall", desc: { en: "DELETE ME NOT. I AM IMPORTANT.", zh: "别删我。我很重要。", th: "อย่าลบฉัน ฉันสำคัญ" }, abilities: ["FIREWALL"], special: { name: "CRITICAL SYSTEM", desc: "If destroyed, enemy loses 2 random deck cards" } },
    { name: { en: "End Process", zh: "结束进程", th: "End Process" }, rarity: "rare", category: "program", desc: { en: "Task Manager's nuclear option.", zh: "任务管理器的核选项。", th: "ตัวเลือกนิวเคลียร์ของ Task Manager" }, abilities: ["OVERCLOCK"], special: { name: "FORCE QUIT", desc: "Destroy any card with less HP than this card's ATK" } },
    
    // UNCOMMONS (15)
    { name: { en: "Tech Support", zh: "技术支持", th: "Tech Support" }, rarity: "uncommon", category: "program", desc: { en: "Have you tried turning it off and on again?", zh: "您试过关掉再打开吗？", th: "ลองปิดแล้วเปิดใหม่หรือยัง?" }, abilities: ["REBOOT"], special: { name: "HAVE YOU TRIED", desc: "Heal ally 4 HP" } },
    { name: { en: "Rubber Duck Debugger", zh: "橡皮鸭调试器", th: "เป็ดยางดีบัก" }, rarity: "uncommon", category: "program", desc: { en: "Explain your code to the duck. The duck knows.", zh: "向鸭子解释代码。鸭子知道。", th: "อธิบายโค้ดให้เป็ดฟัง เป็ดรู้" }, abilities: ["FIREWALL"], special: { name: "QUACK", desc: "Reveal one enemy card" } },
    { name: { en: "Spinning Wheel", zh: "转圈", th: "วงล้อหมุน" }, rarity: "uncommon", category: "glitch", desc: { en: "It's loading. Still loading. Will it stop?", zh: "正在加载。还在加载。会停吗？", th: "กำลังโหลด ยังโหลด จะหยุดไหม?" }, abilities: ["VIRUS"], special: { name: "PLEASE WAIT", desc: "Enemy's next card takes extra turn to play" } },
    { name: { en: "Incognito Mode", zh: "无痕模式", th: "Incognito Mode" }, rarity: "uncommon", category: "program", desc: { en: "Your ISP still knows. But you feel sneaky.", zh: "ISP仍然知道。但你觉得很隐秘。", th: "ISP ยังรู้ แต่คุณรู้สึกลับๆ" }, abilities: ["REBOOT"], special: { name: "TOTALLY PRIVATE", desc: "Cannot be seen in hand preview" } },
    { name: { en: "Clippy", zh: "曲别针助手", th: "Clippy" }, rarity: "uncommon", category: "ai", desc: { en: "It looks like you're trying to win! Would you like help?", zh: "看起来你想赢！需要帮助吗？", th: "ดูเหมือนคุณพยายามชนะ! ต้องการช่วยไหม?" }, abilities: ["FIREWALL"], special: { name: "HELPFUL TIP", desc: "Draw a card (might not be useful)" } },
    { name: { en: "Recursive Loop", zh: "递归循环", th: "Recursive Loop" }, rarity: "uncommon", category: "glitch", desc: { en: "To understand recursion, first understand recursion.", zh: "要理解递归，先理解递归。", th: "เพื่อเข้าใจ recursion ต้องเข้าใจ recursion ก่อน" }, abilities: ["REBOOT"], special: { name: "INFINITE LOOP", desc: "Summon another when destroyed (max 3)" } },
    { name: { en: "Stack Overflow", zh: "堆栈溢出", th: "Stack Overflow" }, rarity: "uncommon", category: "glitch", desc: { en: "The answer was asked in 2009. Marked as duplicate.", zh: "答案在2009年被问过。标记为重复。", th: "คำตอบถูกถามในปี 2009 ทำเครื่องหมายซ้ำ" }, abilities: ["FIREWALL"], special: { name: "DUPLICATE", desc: "Copy last spell effect" } },
    { name: { en: "NFT Ape", zh: "NFT猿", th: "NFT Ape" }, rarity: "uncommon", category: "ai", desc: { en: "Right-click saved. Sued for $200,000.", zh: "右键保存。被起诉20万美元。", th: "คลิกขวาบันทึก ถูกฟ้อง $200,000" }, abilities: [], special: { name: "BLOCKCHAIN", desc: "Cannot be copied" } },
    { name: { en: "WiFi Warrior", zh: "WiFi战士", th: "WiFi Warrior" }, rarity: "uncommon", category: "hacker", desc: { en: "Powerful with 5 bars. Useless with 1.", zh: "5格信号时强。1格时没用。", th: "แรงเมื่อ 5 ขีด ไร้ประโยชน์เมื่อ 1 ขีด" }, abilities: [], special: { name: "SIGNAL STRENGTH", desc: "Stats vary ±3 each turn" } },
    { name: { en: "Localhost Legend", zh: "本地主机传奇", th: "Localhost Legend" }, rarity: "uncommon", category: "program", desc: { en: "Works on my machine! Not my problem.", zh: "在我机器上能用！不是我的问题。", th: "ทำงานได้บนเครื่องฉัน! ไม่ใช่ปัญหาฉัน" }, abilities: ["FIREWALL"], special: { name: "127.0.0.1", desc: "Immune to cards played this turn" } },
    { name: { en: "Patch Notes", zh: "补丁说明", th: "Patch Notes" }, rarity: "uncommon", category: "program", desc: { en: "Bug fixes. (We broke 3 things fixing 1)", zh: "错误修复。（修1个坏了3个）", th: "แก้บั๊ก (พังสามอย่างเพื่อแก้หนึ่ง)" }, abilities: ["REBOOT"], special: { name: "HOTFIX", desc: "Heal 3 HP, lose 1 ATK" } },
    { name: { en: "Endless Scroll", zh: "无限滚动", th: "Endless Scroll" }, rarity: "uncommon", category: "program", desc: { en: "Just one more post... it's 4 AM now.", zh: "再看一个帖子...现在凌晨4点了。", th: "อีกโพสต์เดียว... ตอนนี้ตี 4 แล้ว" }, abilities: [], special: { name: "ADDICTIVE", desc: "Draw a card, enemy draws too" } },
    { name: { en: "Checksum Champion", zh: "校验和冠军", th: "Checksum Champion" }, rarity: "uncommon", category: "firewall", desc: { en: "Numbers match? Pass. Don't match? Goodbye.", zh: "数字匹配？过。不匹配？再见。", th: "ตัวเลขตรง? ผ่าน ไม่ตรง? บาย" }, abilities: ["FIREWALL"], special: { name: "VALIDATION", desc: "Block if enemy ATK ≠ your HP" } },
    { name: { en: "Emoji Elemental", zh: "表情元素", th: "Emoji Elemental" }, rarity: "uncommon", category: "ai", desc: { en: "😤💪🔥 This is fine 🔥💪😤", zh: "😤💪🔥 这很好 🔥💪😤", th: "😤💪🔥 นี่ปกติ 🔥💪😤" }, abilities: [], special: { name: "🔥", desc: "Random emoji effect" } },
    { name: { en: "Error 404", zh: "错误404", th: "Error 404" }, rarity: "uncommon", category: "glitch", desc: { en: "Card not found. That's the point.", zh: "卡牌未找到。这就是重点。", th: "ไม่พบการ์ด นั่นคือประเด็น" }, abilities: ["REBOOT"], special: { name: "NOT FOUND", desc: "Cannot be single-targeted" } },
    
    // COMMONS (20)
    { name: { en: "404 Brain Not Found", zh: "404脑子未找到", th: "404 Brain Not Found" }, rarity: "common", category: "glitch", desc: { en: "Connection to brain timed out.", zh: "与大脑的连接超时。", th: "การเชื่อมต่อกับสมองหมดเวลา" }, abilities: [], special: null },
    { name: { en: "Spam Bot", zh: "垃圾邮件机器人", th: "Spam Bot" }, rarity: "common", category: "ai", desc: { en: "BUY NOW! LIMITED TIME! CLICK HERE!", zh: "立即购买！限时优惠！点击这里！", th: "ซื้อเลย! เวลาจำกัด! คลิกที่นี่!" }, abilities: [], special: null },
    { name: { en: "Buffering...", zh: "缓冲中...", th: "Buffering..." }, rarity: "common", category: "glitch", desc: { en: "Just a moment... Still loading...", zh: "稍等...还在加载...", th: "อีกสักครู่... ยังโหลด..." }, abilities: [], special: null },
    { name: { en: "Password1234", zh: "密码1234", th: "Password1234" }, rarity: "common", category: "program", desc: { en: "The weakest security. Easy to remember!", zh: "最弱的安全性。容易记住！", th: "ความปลอดภัยที่อ่อนแอที่สุด จำง่าย!" }, abilities: [], special: { name: "EASILY HACKED", desc: "Enemy HACK costs 1 less" } },
    { name: { en: "Internet Explorer", zh: "IE浏览器", th: "Internet Explorer" }, rarity: "common", category: "program", desc: { en: "Still loading the 2008 homepage.", zh: "还在加载2008年的主页。", th: "ยังโหลดหน้าแรกปี 2008" }, abilities: [], special: { name: "PLEASE UPDATE", desc: "Attacks 2 turns late" } },
    { name: { en: "Doomscroller", zh: "末日刷屏者", th: "Doomscroller" }, rarity: "common", category: "hacker", desc: { en: "Can't stop. Won't stop. Why am I like this?", zh: "停不下来。不愿停。我为什么这样？", th: "หยุดไม่ได้ ไม่ยอมหยุด ทำไมฉันเป็นแบบนี้?" }, abilities: [], special: { name: "CAN'T LOOK AWAY", desc: "Draw extra card (probably bad)" } },
    { name: { en: "Spaghetti Code", zh: "意大利面代码", th: "Spaghetti Code" }, rarity: "common", category: "glitch", desc: { en: "No one knows how it works. It just runs.", zh: "没人知道它怎么运行。它就是在跑。", th: "ไม่มีใครรู้ว่าทำงานยังไง มันแค่ทำงาน" }, abilities: [], special: { name: "LEGACY CODE", desc: "Random effect each turn" } },
    { name: { en: "Syntax Error", zh: "语法错误", th: "Syntax Error" }, rarity: "common", category: "glitch", desc: { en: "Missing semicolon on line 4,892,847.", zh: "第4,892,847行缺少分号。", th: "ขาด semicolon บรรทัด 4,892,847" }, abilities: [], special: { name: "COMPILE ERROR", desc: "Enemy's next card costs 1 more" } },
    { name: { en: "Rage Click", zh: "愤怒点击", th: "Rage Click" }, rarity: "common", category: "glitch", desc: { en: "*click click click* WHY WON'T THIS WORK", zh: "*点击点击点击* 为什么不行", th: "*คลิก คลิก คลิก* ทำไมไม่ทำงาน" }, abilities: [], special: { name: "MULTIPLE INPUTS", desc: "Attack twice, 50% accuracy" } },
    { name: { en: "Loading Screen", zh: "加载画面", th: "Loading Screen" }, rarity: "common", category: "glitch", desc: { en: "Almost there... 99%... Connection lost.", zh: "快了...99%...连接丢失。", th: "เกือบแล้ว... 99%... หลุด" }, abilities: [], special: null },
    { name: { en: "Popup Ad", zh: "弹窗广告", th: "Popup Ad" }, rarity: "common", category: "virus", desc: { en: "CONGRATULATIONS! You've won!", zh: "恭喜！你赢了！", th: "ยินดีด้วย! คุณชนะ!" }, abilities: ["VIRUS"], special: { name: "ANNOYING", desc: "Summon 2 more when played" } },
    { name: { en: "Firewall Frog", zh: "防火墙青蛙", th: "กบไฟร์วอลล์" }, rarity: "common", category: "firewall", desc: { en: "It is Wednesday my dudes.", zh: "今天是星期三，兄弟们。", th: "วันนี้วันพุธพวก" }, abilities: ["FIREWALL"], special: null },
    { name: { en: "Byte-Sized Warrior", zh: "字节大小战士", th: "Byte-Sized Warrior" }, rarity: "common", category: "program", desc: { en: "Small but mighty. Exactly 8 bits.", zh: "小但强大。正好8位。", th: "เล็กแต่แกร่ง พอดี 8 บิต" }, abilities: [], special: null },
    { name: { en: "Backup Buddy", zh: "备份伙伴", th: "Backup Buddy" }, rarity: "common", category: "program", desc: { en: "Remember to save your work!", zh: "记得保存你的工作！", th: "อย่าลืมเซฟงาน!" }, abilities: ["REBOOT"], special: null },
    { name: { en: "404 Cat", zh: "404猫", th: "แมว 404" }, rarity: "common", category: "glitch", desc: { en: "This cat cannot be found. Maybe in a box?", zh: "找不到这只猫。也许在盒子里？", th: "หาแมวนี้ไม่เจอ อาจอยู่ในกล่อง?" }, abilities: [], special: { name: "SCHRODINGER", desc: "50% dodge chance" } },
    { name: { en: "Ping Pong", zh: "乒乓", th: "Ping Pong" }, rarity: "common", category: "program", desc: { en: "Ping... Pong... Connection stable. For now.", zh: "Ping...Pong...连接稳定。暂时。", th: "Ping... Pong... เสถียร ในตอนนี้" }, abilities: [], special: { name: "ECHO", desc: "Return damage to attacker" } },
    { name: { en: "Cache Money", zh: "缓存大亨", th: "Cache Money" }, rarity: "common", category: "program", desc: { en: "Storing data for faster access. Mostly cat pics.", zh: "存储数据以便快速访问。主要是猫图。", th: "เก็บข้อมูลเพื่อเข้าถึงเร็ว ส่วนใหญ่รูปแมว" }, abilities: [], special: null },
    { name: { en: "Kernel Panic", zh: "内核恐慌", th: "Kernel Panic" }, rarity: "common", category: "glitch", desc: { en: "Your system gave up and died.", zh: "你的系统放弃了，死了。", th: "ระบบยอมแพ้และตาย" }, abilities: [], special: null },
    { name: { en: "Memory Leak", zh: "内存泄漏", th: "Memory Leak" }, rarity: "common", category: "glitch", desc: { en: "Where did all the RAM go?", zh: "所有的内存都去哪了？", th: "RAM หายไปไหนหมด?" }, abilities: [], special: null },
    { name: { en: "Null Pointer", zh: "空指针", th: "Null Pointer" }, rarity: "common", category: "glitch", desc: { en: "Points to nothing. Crashes everything.", zh: "指向虚无。崩溃一切。", th: "ชี้ไปไม่มีอะไร พังทุกอย่าง" }, abilities: [], special: null }
  ]
};

// ============================================
// SEASON 4: REALM OF SHADOWS
// ============================================
const SEASON_4 = {
  id: 4,
  name: "Realm of Shadows",
  subtitle: "The Lurker's Domain",
  theme: "dark_fantasy",
  icon: "🌑",
  color: "#4a0080",
  bgGradient: "linear-gradient(135deg, #4a0080, #1a0033)",
  lore: {
    title: "Into the Void",
    leader: "The Lurker Supreme",
    setting: "The guild's quietest member reveals their true power - a portal to the Shadow Dimension where nothing is as it seems."
  },
  mechanics: {
    LURK: { desc: "Hidden until you choose to reveal" },
    SHADOW: { desc: "Cannot be targeted by spells" },
    VOID: { desc: "Banish instead of destroy" },
    NIGHTMARE: { desc: "Enemy skips next attack" },
    STEALTH: { desc: "Ignore GUARD effects" }
  },
  categories: ["shadow", "nightmare", "void", "undead", "phantom", "demon"],
  cards: [
    // MYTHICS (2)
    { name: { en: "The Lurker Supreme Awakened", zh: "觉醒的潜伏者至尊", th: "The Lurker Supreme ตื่น" }, rarity: "mythic", category: "shadow", desc: { en: "You thought they were AFK. They were watching. Always watching.", zh: "你以为他们AFK。他们在看。一直在看。", th: "คุณคิดว่าเขา AFK เขาเฝ้าดู ตลอดเวลา" }, abilities: ["LURK", "VOID"], special: { name: "SUPREME SHADOW", desc: "All your cards gain STEALTH permanently" } },
    { name: { en: "Void Emperor", zh: "虚空帝王", th: "จักรพรรดิ์ว่างเปล่า" }, rarity: "mythic", category: "void", desc: { en: "Rules over nothing. Nothing is everything.", zh: "统治虚无。虚无即一切。", th: "ปกครองความว่างเปล่า ความว่างคือทุกอย่าง" }, abilities: ["VOID", "NIGHTMARE"], special: { name: "ABSOLUTE ZERO", desc: "Banish ALL cards when played (including yours)" } },
    
    // LEGENDARIES (6)
    { name: { en: "Shadow Merchant", zh: "暗影商人", th: "พ่อค้าเงา" }, rarity: "legendary", category: "shadow", desc: { en: "Sells secrets at premium prices. Cash or soul accepted.", zh: "高价出售秘密。收现金或灵魂。", th: "ขายความลับราคาสูง รับเงินสดหรือวิญญาณ" }, abilities: ["LURK", "SHADOW"], special: { name: "DARK DEAL", desc: "Trade HP for enemy's best card" } },
    { name: { en: "Nightmare Weaver", zh: "噩梦编织者", th: "ผู้ทอฝันร้าย" }, rarity: "legendary", category: "nightmare", desc: { en: "Your worst fears, made manifest. Sleep is not an escape.", zh: "你最大的恐惧，具象化。睡眠不是逃避。", th: "ความกลัวที่เลวร้ายที่สุด กลายเป็นจริง" }, abilities: ["NIGHTMARE", "NIGHTMARE"], special: { name: "ENDLESS NIGHTMARE", desc: "Enemy skips 2 turns" } },
    { name: { en: "Eclipse Knight", zh: "日蚀骑士", th: "อัศวินสุริยุปราคา" }, rarity: "legendary", category: "shadow", desc: { en: "Born when sun meets moon. Wields both light and dark.", zh: "太阳与月亮相遇时诞生。驾驭光明与黑暗。", th: "เกิดเมื่อดวงอาทิตย์พบดวงจันทร์" }, abilities: ["SHADOW", "STEALTH"], special: { name: "TOTAL ECLIPSE", desc: "Disable ALL abilities for 1 turn" } },
    { name: { en: "Phantom Thief", zh: "幻影大盗", th: "โจรปีศาจ" }, rarity: "legendary", category: "phantom", desc: { en: "Steals more than items. Steals hope itself.", zh: "偷的不只是物品。偷的是希望本身。", th: "ขโมยมากกว่าของ ขโมยความหวัง" }, abilities: ["STEALTH", "LURK"], special: { name: "SOUL HEIST", desc: "Steal enemy's special ability" } },
    { name: { en: "The Lurker's Pet", zh: "潜伏者的宠物", th: "สัตว์เลี้ยงของ Lurker" }, rarity: "legendary", category: "shadow", desc: { en: "No one knows what it is. No one wants to know.", zh: "没人知道它是什么。没人想知道。", th: "ไม่มีใครรู้ว่ามันคืออะไร ไม่มีใครอยากรู้" }, abilities: ["LURK", "VOID"], special: { name: "???", desc: "Effect changes based on game state" } },
    { name: { en: "Dread Lord", zh: "恐惧领主", th: "ลอร์ดแห่งความหวาดกลัว" }, rarity: "legendary", category: "demon", desc: { en: "Fear given form. Your terror sustains him.", zh: "恐惧的化身。你的恐惧滋养他。", th: "ความกลัวที่มีรูปร่าง ความหวาดกลัวหล่อเลี้ยงเขา" }, abilities: ["NIGHTMARE", "SHADOW"], special: { name: "DREAD AURA", desc: "All enemies get -2 ATK permanently" } },
    
    // EPICS (10)
    { name: { en: "Sleep Paralysis Demon", zh: "鬼压床恶魔", th: "ปีศาจผีอำ" }, rarity: "epic", category: "demon", desc: { en: "You can't move. You can't scream. It's sitting on your chest.", zh: "你动不了。你叫不出。它坐在你胸口。", th: "คุณขยับไม่ได้ กรีดไม่ได้ มันนั่งบนอกคุณ" }, abilities: ["NIGHTMARE"], special: { name: "PARALYSIS", desc: "Target cannot act for 2 turns" } },
    { name: { en: "Creepypasta Creature", zh: "都市传说怪物", th: "สิ่งมีชีวิตครีปปี้พาสต้า" }, rarity: "epic", category: "nightmare", desc: { en: "Started as a story. Became real from belief.", zh: "起初只是故事。因信仰而成真。", th: "เริ่มเป็นเรื่องเล่า กลายเป็นจริงจากความเชื่อ" }, abilities: ["LURK", "NIGHTMARE"], special: { name: "VIRAL FEAR", desc: "Spread to enemy's deck as a curse" } },
    { name: { en: "Jumpscare Jack", zh: "惊吓杰克", th: "Jack Jumpscare" }, rarity: "epic", category: "nightmare", desc: { en: "BOO! ...Did I get you? The terror never fades.", zh: "嘘！...吓到你了吗？恐惧永不消退。", th: "บู้! ...ตกใจไหม? ความหวาดกลัวไม่เคยจางหาย" }, abilities: ["STEALTH"], special: { name: "JUMPSCARE", desc: "Deal triple damage on first attack" } },
    { name: { en: "The Thing Under the Bed", zh: "床底下的东西", th: "สิ่งที่อยู่ใต้เตียง" }, rarity: "epic", category: "shadow", desc: { en: "Don't let your feet hang over the edge.", zh: "不要让你的脚悬在床边。", th: "อย่าให้เท้าห้อยออกมานอกเตียง" }, abilities: ["LURK", "STEALTH"], special: { name: "ANKLE GRAB", desc: "Pull enemy card out of play for 2 turns" } },
    { name: { en: "Memory Eraser", zh: "记忆抹除者", th: "ผู้ลบความทรงจำ" }, rarity: "epic", category: "void", desc: { en: "What were we talking about? I forgot... everything.", zh: "我们在说什么？我忘了...一切。", th: "เราพูดเรื่องอะไรอยู่? ฉันลืม...ทุกอย่าง" }, abilities: ["VOID"], special: { name: "FORGET", desc: "Return enemy card to deck, shuffled" } },
    { name: { en: "Guilt Ghost", zh: "罪恶之灵", th: "ผีความรู้สึกผิด" }, rarity: "epic", category: "phantom", desc: { en: "Reminds you of everything you've ever done wrong.", zh: "提醒你做过的所有错事。", th: "เตือนคุณถึงทุกอย่างที่เคยทำผิด" }, abilities: ["NIGHTMARE", "SHADOW"], special: { name: "REGRET", desc: "Enemy's last 3 actions are reversed" } },
    { name: { en: "Existential Dread", zh: "存在性恐惧", th: "ความหวาดกลัวการดำรงอยู่" }, rarity: "epic", category: "void", desc: { en: "Why are we here? Does anything matter? ...No.", zh: "我们为什么在这里？有什么重要吗？...没有。", th: "ทำไมเราถึงอยู่ที่นี่? มีอะไรสำคัญไหม? ...ไม่" }, abilities: ["VOID", "VOID"], special: { name: "MEANINGLESS", desc: "Both players lose 5 HP" } },
    { name: { en: "Shadow Clone Master", zh: "影分身大师", th: "ปรมาจารย์ร่างแยก" }, rarity: "epic", category: "shadow", desc: { en: "Is it the real one? None of them are. All of them are.", zh: "哪个是真的？都不是。都是。", th: "อันไหนจริง? ไม่มี ทุกอันจริง" }, abilities: ["SHADOW", "LURK"], special: { name: "SHADOW ARMY", desc: "Summon 3 Shadow Clones (3/3)" } },
    { name: { en: "Banshee Wail", zh: "女妖哀号", th: "เสียงร้องแบนชี" }, rarity: "epic", category: "undead", desc: { en: "Her scream announces death. Whose death? Yours.", zh: "她的尖叫预告死亡。谁的死亡？你的。", th: "เสียงกรีดของเธอประกาศความตาย ใครตาย? คุณ" }, abilities: ["NIGHTMARE"], special: { name: "DEATH CRY", desc: "Instantly kill any card with 5 or less HP" } },
    { name: { en: "The Forgotten One", zh: "被遗忘者", th: "ผู้ถูกลืม" }, rarity: "epic", category: "void", desc: { en: "Once had a name. Now has nothing.", zh: "曾经有名字。现在什么都没有。", th: "เคยมีชื่อ ตอนนี้ไม่มีอะไร" }, abilities: ["VOID", "STEALTH"], special: { name: "FORGOTTEN", desc: "Cannot be targeted or remembered" } },
    
    // RARES (15)
    { name: { en: "Closet Monster", zh: "衣柜怪物", th: "สัตว์ประหลาดในตู้" }, rarity: "rare", category: "shadow", desc: { en: "The closet door is open. Just a crack.", zh: "衣柜门开着。只开了一条缝。", th: "ประตูตู้เสื้อผ้าเปิดอยู่ แค่นิดเดียว" }, abilities: ["LURK"], special: { name: "CRACK OPEN", desc: "Attack from hiding with +3 damage" } },
    { name: { en: "Mirror Stalker", zh: "镜中追踪者", th: "ผู้สะกดรอยในกระจก" }, rarity: "rare", category: "phantom", desc: { en: "Something in the mirror moved differently than you.", zh: "镜子里有东西和你动作不同。", th: "มีบางอย่างในกระจกขยับต่างจากคุณ" }, abilities: ["SHADOW"], special: { name: "REFLECTION", desc: "Copy enemy's last attack" } },
    { name: { en: "Corpse Whisper", zh: "尸语者", th: "ผู้กระซิบศพ" }, rarity: "rare", category: "undead", desc: { en: "The dead have secrets. He knows them all.", zh: "死者有秘密。他全都知道。", th: "คนตายมีความลับ เขารู้หมด" }, abilities: ["NIGHTMARE"], special: { name: "DEATH SECRETS", desc: "Revive a destroyed card as a 2/2" } },
    { name: { en: "Paranoia Spirit", zh: "偏执妄想灵", th: "วิญญาณหวาดระแวง" }, rarity: "rare", category: "phantom", desc: { en: "They're watching you. They're always watching.", zh: "他们在看你。他们一直在看。", th: "พวกเขาเฝ้าดูคุณ ตลอดเวลา" }, abilities: ["NIGHTMARE", "STEALTH"], special: { name: "PARANOID", desc: "Enemy cannot see your cards" } },
    { name: { en: "Void Spawn", zh: "虚空产卵", th: "ลูกหลานแห่งความว่างเปล่า" }, rarity: "rare", category: "void", desc: { en: "Born from nothing. Returns to nothing.", zh: "从虚无中诞生。回归虚无。", th: "เกิดจากความว่างเปล่า กลับสู่ความว่างเปล่า" }, abilities: ["VOID"], special: { name: "NOTHINGNESS", desc: "When destroyed, banish attacker too" } },
    { name: { en: "Anxiety Incarnate", zh: "焦虑化身", th: "ความวิตกกังวลที่เป็นรูปธรรม" }, rarity: "rare", category: "nightmare", desc: { en: "Did you lock the door? Are they mad at you? What if...", zh: "你锁门了吗？他们生你的气吗？如果...", th: "คุณล็อคประตูหรือยัง? พวกเขาโกรธคุณไหม? ถ้า..." }, abilities: ["NIGHTMARE"], special: { name: "OVERTHINK", desc: "Enemy must play cards twice to take effect" } },
    { name: { en: "Doppelganger", zh: "二重身", th: "Doppelganger" }, rarity: "rare", category: "phantom", desc: { en: "Looks exactly like you. Acts exactly unlike you.", zh: "看起来和你一模一样。行为完全不像你。", th: "ดูเหมือนคุณทุกประการ ทำตัวไม่เหมือนคุณเลย" }, abilities: ["LURK", "SHADOW"], special: { name: "IMPOSTER", desc: "Become a copy of any ally" } },
    { name: { en: "Night Terror", zh: "夜惊", th: "ความหวาดกลัวยามค่ำคืน" }, rarity: "rare", category: "nightmare", desc: { en: "3 AM. Wide awake. Something is wrong.", zh: "凌晨3点。完全清醒。有什么不对。", th: "ตี 3 ตื่นเต็มที่ มีบางอย่างผิดปกติ" }, abilities: ["NIGHTMARE"], special: { name: "3 AM", desc: "Triple damage at night (after turn 5)" } },
    { name: { en: "Phobia Feeder", zh: "恐惧饲养者", th: "ผู้เลี้ยงโฟเบีย" }, rarity: "rare", category: "demon", desc: { en: "Has a collection of fears. Wants to add yours.", zh: "收集恐惧。想加上你的。", th: "มีคอลเลกชันความกลัว อยากเพิ่มของคุณ" }, abilities: ["NIGHTMARE", "LURK"], special: { name: "COLLECT FEAR", desc: "Gain +1/+1 for each NIGHTMARE used" } },
    { name: { en: "Soul Collector", zh: "灵魂收集者", th: "นักสะสมวิญญาณ" }, rarity: "rare", category: "undead", desc: { en: "Your soul is overdue. Time to collect.", zh: "你的灵魂已经逾期。该收集了。", th: "วิญญาณคุณเกินกำหนด ถึงเวลาเก็บ" }, abilities: ["VOID"], special: { name: "REPO", desc: "Take control of any card with 3 or less HP" } },
    { name: { en: "Whisperer in the Dark", zh: "黑暗中的低语者", th: "ผู้กระซิบในความมืด" }, rarity: "rare", category: "shadow", desc: { en: "Can't see it. Can only hear it. Getting closer.", zh: "看不到它。只能听到它。越来越近。", th: "มองไม่เห็น ได้ยินแค่เสียง ใกล้เข้ามา" }, abilities: ["LURK", "STEALTH"], special: { name: "WHISPER", desc: "Deal 2 damage to all enemies each turn" } },
    { name: { en: "Grave Robber", zh: "盗墓者", th: "คนขุดหลุมศพ" }, rarity: "rare", category: "undead", desc: { en: "The dead don't need their stuff. He does.", zh: "死人不需要他们的东西。他需要。", th: "คนตายไม่ต้องการของ เขาต้องการ" }, abilities: ["STEALTH"], special: { name: "LOOT CORPSE", desc: "Draw card for each destroyed enemy this turn" } },
    { name: { en: "Shade Assassin", zh: "阴影刺客", th: "นักฆ่าเงา" }, rarity: "rare", category: "shadow", desc: { en: "Your shadow just stabbed you.", zh: "你的影子刚刚刺了你。", th: "เงาของคุณเพิ่งแทงคุณ" }, abilities: ["SHADOW", "STEALTH"], special: { name: "SHADOW STAB", desc: "Ignore armor and shields" } },
    { name: { en: "Restless Spirit", zh: "不安的灵魂", th: "วิญญาณกระสับกระส่าย" }, rarity: "rare", category: "phantom", desc: { en: "Can't rest. Can't leave. Stuck forever.", zh: "无法安息。无法离开。永远困住。", th: "พักไม่ได้ ไปไม่ได้ ติดตลอดกาล" }, abilities: ["NIGHTMARE"], special: { name: "ETERNAL UNREST", desc: "Returns to play when destroyed" } },
    { name: { en: "Mind Flayer Jr.", zh: "小夺心魔", th: "Mind Flayer Jr." }, rarity: "rare", category: "demon", desc: { en: "Like a Mind Flayer, but smaller. Still terrifying.", zh: "像夺心魔，但更小。仍然可怕。", th: "เหมือน Mind Flayer แต่เล็กกว่า ยังน่ากลัว" }, abilities: ["NIGHTMARE", "VOID"], special: { name: "BRAIN SNACK", desc: "Enemy discards random card" } },
    
    // UNCOMMONS (15) 
    { name: { en: "Creaking Door", zh: "吱呀作响的门", th: "ประตูดังเอี๊ยด" }, rarity: "uncommon", category: "shadow", desc: { en: "Nobody opened it. It opened anyway.", zh: "没人打开它。它还是开了。", th: "ไม่มีใครเปิด มันเปิดเอง" }, abilities: ["LURK"], special: null },
    { name: { en: "Flickering Light", zh: "闪烁的灯", th: "แสงกะพริบ" }, rarity: "uncommon", category: "phantom", desc: { en: "The light bulb is fine. Then why is it flickering?", zh: "灯泡没问题。那为什么在闪？", th: "หลอดไฟปกติ แล้วทำไมมันกะพริบ?" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Cold Spot", zh: "冷点", th: "จุดเย็น" }, rarity: "uncommon", category: "phantom", desc: { en: "Suddenly cold. Breath visible. Something's here.", zh: "突然很冷。能看到呼吸。有什么在这。", th: "เย็นทันที เห็นลมหายใจ มีบางอย่างอยู่ที่นี่" }, abilities: ["STEALTH"], special: null },
    { name: { en: "Shadow Puppet", zh: "皮影戏", th: "หุ่นเงา" }, rarity: "uncommon", category: "shadow", desc: { en: "Cute on the wall. Less cute when it moves alone.", zh: "在墙上很可爱。自己动时就不可爱了。", th: "น่ารักบนผนัง น่ารักน้อยลงเมื่อขยับเอง" }, abilities: ["LURK"], special: null },
    { name: { en: "Dust Bunny Demon", zh: "灰尘兔恶魔", th: "ปีศาจกระต่ายฝุ่น" }, rarity: "uncommon", category: "demon", desc: { en: "Lives under your bed. Has grown sentient. Hungry.", zh: "住在你床下。已经有了意识。饿了。", th: "อาศัยใต้เตียง มีความคิดแล้ว หิว" }, abilities: ["LURK"], special: null },
    { name: { en: "Uncanny Valley Resident", zh: "恐怖谷居民", th: "ผู้อยู่อาศัย Uncanny Valley" }, rarity: "uncommon", category: "nightmare", desc: { en: "Almost looks human. Almost. Not quite.", zh: "看起来几乎像人。几乎。不完全是。", th: "ดูเกือบเป็นมนุษย์ เกือบ ไม่ใช่ซะทีเดียว" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Abandoned Doll", zh: "被遗弃的娃娃", th: "ตุ๊กตาที่ถูกทอดทิ้ง" }, rarity: "uncommon", category: "shadow", desc: { en: "Its eyes follow you. Even when you're not looking.", zh: "它的眼睛跟着你。即使你不看它时也是。", th: "ตามองตามคุณ แม้คุณไม่มอง" }, abilities: ["LURK"], special: null },
    { name: { en: "Midnight Snack", zh: "午夜零食", th: "ของว่างเที่ยงคืน" }, rarity: "uncommon", category: "demon", desc: { en: "You're the snack.", zh: "你就是零食。", th: "คุณคือของว่าง" }, abilities: ["STEALTH"], special: null },
    { name: { en: "Déjà Vu", zh: "既视感", th: "Déjà Vu" }, rarity: "uncommon", category: "void", desc: { en: "Haven't we done this before? Again? And again?", zh: "我们之前做过这个吗？又来？又来？", th: "เราเคยทำแบบนี้ไหม? อีกแล้ว? อีกแล้ว?" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Imposter Syndrome", zh: "冒充者综合征", th: "Imposter Syndrome" }, rarity: "uncommon", category: "phantom", desc: { en: "They'll find out you're a fraud. Any moment now.", zh: "他们会发现你是骗子。随时都会。", th: "พวกเขาจะพบว่าคุณเป็นคนหลอกลวง อีกสักครู่" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Void Puppy", zh: "虚空小狗", th: "ลูกสุนัขว่างเปล่า" }, rarity: "uncommon", category: "void", desc: { en: "Good boy! ...Where did it go? Was it ever there?", zh: "好孩子！...它去哪了？它存在过吗？", th: "น้องหมาดี! ...มันไปไหน? มันเคยอยู่ไหม?" }, abilities: ["VOID"], special: null },
    { name: { en: "Ominous Dripping", zh: "不祥的滴水声", th: "เสียงหยดน้ำชวนขนลุก" }, rarity: "uncommon", category: "shadow", desc: { en: "Drip. Drip. Drip. What is it? Don't look.", zh: "滴。滴。滴。是什么？别看。", th: "หยด หยด หยด มันคืออะไร? อย่ามอง" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Wrong Turn Spirit", zh: "迷路幽灵", th: "วิญญาณเลี้ยวผิด" }, rarity: "uncommon", category: "phantom", desc: { en: "You shouldn't have come this way.", zh: "你不应该走这边来。", th: "คุณไม่ควรมาทางนี้" }, abilities: ["LURK"], special: null },
    { name: { en: "Procrastination Demon", zh: "拖延恶魔", th: "ปีศาจผัดวันประกันพรุ่ง" }, rarity: "uncommon", category: "demon", desc: { en: "You'll deal with it later. Much later. Never.", zh: "你以后再处理。很久以后。永远不。", th: "คุณจะจัดการทีหลัง ทีหลังมาก ไม่เคย" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Self-Doubt Specter", zh: "自我怀疑幽灵", th: "ผีความสงสัยในตัวเอง" }, rarity: "uncommon", category: "phantom", desc: { en: "Are you sure that was the right play?", zh: "你确定那是正确的选择吗？", th: "คุณแน่ใจว่านั่นคือการเล่นที่ถูกต้องไหม?" }, abilities: ["NIGHTMARE"], special: null },
    
    // COMMONS (20)
    { name: { en: "Spooky Noise", zh: "诡异的声音", th: "เสียงน่ากลัว" }, rarity: "common", category: "shadow", desc: { en: "What was that?!", zh: "那是什么？！", th: "นั่นคืออะไร?!" }, abilities: [], special: null },
    { name: { en: "Basement Dweller", zh: "地下室居民", th: "ผู้อยู่ใต้ดิน" }, rarity: "common", category: "shadow", desc: { en: "Lives in darkness. Prefers it that way.", zh: "住在黑暗中。喜欢这样。", th: "อาศัยในความมืด ชอบแบบนั้น" }, abilities: ["LURK"], special: null },
    { name: { en: "Cobweb Ghost", zh: "蜘蛛网幽灵", th: "ผีใยแมงมุม" }, rarity: "common", category: "phantom", desc: { en: "Dusty. Forgotten. Still there.", zh: "布满灰尘。被遗忘。仍然在那。", th: "เต็มไปด้วยฝุ่น ถูกลืม ยังอยู่" }, abilities: [], special: null },
    { name: { en: "Goosebumps", zh: "鸡皮疙瘩", th: "ขนลุก" }, rarity: "common", category: "nightmare", desc: { en: "Your skin knows something you don't.", zh: "你的皮肤知道你不知道的事。", th: "ผิวหนังคุณรู้บางอย่างที่คุณไม่รู้" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Static Whispers", zh: "静电低语", th: "เสียงกระซิบสัญญาณรบกวน" }, rarity: "common", category: "void", desc: { en: "Voices in the static. Almost words.", zh: "静电中的声音。几乎是话语。", th: "เสียงในสัญญาณรบกวน เกือบเป็นคำพูด" }, abilities: [], special: null },
    { name: { en: "Feeling of Being Watched", zh: "被注视的感觉", th: "ความรู้สึกถูกจ้องมอง" }, rarity: "common", category: "nightmare", desc: { en: "Turn around. Nothing. But still...", zh: "转身。什么都没有。但是...", th: "หันไป ไม่มีอะไร แต่ยัง..." }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Forgotten Memory", zh: "被遗忘的记忆", th: "ความทรงจำที่ถูกลืม" }, rarity: "common", category: "void", desc: { en: "What was I thinking about?", zh: "我刚在想什么？", th: "ฉันคิดอะไรอยู่?" }, abilities: ["VOID"], special: null },
    { name: { en: "Shadow Rat", zh: "暗影老鼠", th: "หนูเงา" }, rarity: "common", category: "shadow", desc: { en: "Skitters in the darkness. Always watching.", zh: "在黑暗中窜动。一直在看。", th: "วิ่งในความมืด เฝ้าดูตลอด" }, abilities: ["STEALTH"], special: null },
    { name: { en: "Nightmare Fuel", zh: "噩梦燃料", th: "เชื้อเพลิงฝันร้าย" }, rarity: "common", category: "nightmare", desc: { en: "Sleep tight.", zh: "睡个好觉。", th: "หลับฝันดี" }, abilities: ["NIGHTMARE"], special: null },
    { name: { en: "Creepy Smile", zh: "诡异的微笑", th: "รอยยิ้มน่าขนลุก" }, rarity: "common", category: "nightmare", desc: { en: "Why is it smiling like that?", zh: "它为什么那样笑？", th: "ทำไมมันยิ้มแบบนั้น?" }, abilities: [], special: null },
    { name: { en: "Gloom Spore", zh: "阴郁孢子", th: "สปอร์มืดมน" }, rarity: "common", category: "void", desc: { en: "Spreads depression.", zh: "传播抑郁。", th: "แพร่ความหดหู่" }, abilities: [], special: null },
    { name: { en: "Void Wisp", zh: "虚空小精灵", th: "Void Wisp" }, rarity: "common", category: "void", desc: { en: "A tiny piece of nothing.", zh: "一小块虚无。", th: "ชิ้นเล็กๆ ของความว่างเปล่า" }, abilities: ["VOID"], special: null },
    { name: { en: "Tiny Horror", zh: "小恐怖", th: "Tiny Horror" }, rarity: "common", category: "demon", desc: { en: "Small but dreadful.", zh: "小但可怕。", th: "เล็กแต่น่ากลัว" }, abilities: [], special: null },
    { name: { en: "Eerie Glow", zh: "诡异的光芒", th: "แสงเรืองรอง" }, rarity: "common", category: "phantom", desc: { en: "Glowing from an unknown source.", zh: "从未知来源发光。", th: "เรืองแสงจากแหล่งที่ไม่รู้" }, abilities: [], special: null },
    { name: { en: "Chill Down Spine", zh: "脊背发凉", th: "หนาวสะท้านกระดูกสันหลัง" }, rarity: "common", category: "nightmare", desc: { en: "Brrr...", zh: "嗖...", th: "บรื..." }, abilities: [], special: null },
    { name: { en: "Dark Corner", zh: "黑暗角落", th: "มุมมืด" }, rarity: "common", category: "shadow", desc: { en: "Something's there. In the corner.", zh: "有什么在那。在角落里。", th: "มีบางอย่างอยู่ที่นั่น ในมุม" }, abilities: ["LURK"], special: null },
    { name: { en: "Fading Echo", zh: "消逝的回声", th: "เสียงสะท้อนที่จางหาย" }, rarity: "common", category: "void", desc: { en: "Did someone call your name?", zh: "有人叫你的名字吗？", th: "มีใครเรียกชื่อคุณไหม?" }, abilities: [], special: null },
    { name: { en: "Restless Night", zh: "不安的夜晚", th: "คืนกระสับกระส่าย" }, rarity: "common", category: "nightmare", desc: { en: "Can't sleep. Won't sleep.", zh: "睡不着。不想睡。", th: "นอนไม่หลับ ไม่ยอมนอน" }, abilities: [], special: null },
    { name: { en: "Shadow Wisp", zh: "暗影精灵", th: "Shadow Wisp" }, rarity: "common", category: "shadow", desc: { en: "A dancing shadow with no source.", zh: "一个没有来源的跳舞的影子。", th: "เงาที่เต้นรำโดยไม่มีแหล่งที่มา" }, abilities: [], special: null },
    { name: { en: "Nameless Dread", zh: "无名恐惧", th: "ความหวาดกลัวไร้ชื่อ" }, rarity: "common", category: "void", desc: { en: "Afraid of what? You don't know.", zh: "怕什么？你不知道。", th: "กลัวอะไร? คุณไม่รู้" }, abilities: [], special: null }
  ]
};

// Export seasons
module.exports = { 
  SEASON_3, 
  SEASON_4,
  RARITY_STATS,
  generateStats
};
