/**
 * NumbahWan TCG - Season Templates 7-10
 * The Epic Conclusion!
 */

// ============================================
// SEASON 7: RAGE QUIT REBELLION
// ============================================
const SEASON_7 = {
  id: 7,
  name: "Rage Quit Rebellion",
  subtitle: "The Toxic Uprising",
  theme: "chaos",
  icon: "💢",
  color: "#ff0040",
  bgGradient: "linear-gradient(135deg, #ff0040, #990000)",
  lore: {
    title: "The Banned Return",
    leader: "Rage Incarnate",
    setting: "Every rage quitter, every troll, every griefer who was banned - they've united. They want revenge, and NumbahWan is their first target."
  },
  mechanics: {
    RAGE: { desc: "Gains ATK when damaged" },
    TILT: { desc: "Enemy accuracy reduced" },
    GRIEF: { desc: "Destroy random enemy card" },
    TOXIC: { desc: "Debuff persists between turns" },
    RAGEQUIT: { desc: "If destroyed, destroy attacker too" }
  },
  categories: ["troll", "griefer", "quitter", "toxic", "banned", "smurf"],
  cards: [
    // MYTHICS
    { name: { en: "Rage Incarnate", zh: "愤怒化身", th: "ความโกรธเป็นรูปร่าง" }, rarity: "mythic", category: "quitter", desc: { en: "Pure, concentrated fury. Keyboard broken beyond repair.", zh: "纯粹、浓缩的愤怒。键盘彻底报废。", th: "ความโกรธที่บริสุทธิ์และเข้มข้น คีย์บอร์ดพังเกินซ่อม" }, abilities: ["RAGE", "RAGEQUIT"], special: { name: "PURE FURY", desc: "Gain +3 ATK for each damage taken. Cannot be calmed." } },
    { name: { en: "The Uninstaller", zh: "卸载者", th: "ผู้ถอนการติดตั้ง" }, rarity: "mythic", category: "banned", desc: { en: "Has uninstalled 47 games. Reinstalled all of them.", zh: "卸载了47个游戏。全部重装了。", th: "ถอนการติดตั้งแล้ว 47 เกม ติดตั้งใหม่ทั้งหมด" }, abilities: ["GRIEF", "TOXIC"], special: { name: "PERMABAN", desc: "Remove target card from the game entirely" } },
    
    // LEGENDARIES
    { name: { en: "Keyboard Smasher", zh: "砸键盘的人", th: "นักทุบคีย์บอร์ด" }, rarity: "legendary", category: "quitter", desc: { en: "RIP: 23 keyboards. You will be remembered.", zh: "安息：23个键盘。你们会被记住的。", th: "R.I.P.: 23 คีย์บอร์ด จะจดจำพวกคุณ" }, abilities: ["RAGE", "RAGE"], special: { name: "KEYBOARD SLAM", desc: "Deal damage equal to missing HP" } },
    { name: { en: "Report Spammer", zh: "举报刷屏者", th: "Report Spammer" }, rarity: "legendary", category: "toxic", desc: { en: "Reports everyone. Including themselves by accident.", zh: "举报所有人。包括不小心举报自己。", th: "รายงานทุกคน รวมถึงตัวเองโดยบังเอิญ" }, abilities: ["TILT", "TOXIC"], special: { name: "MASS REPORT", desc: "Mark all enemies as 'reported' - they deal less damage" } },
    { name: { en: "AFK Avenger", zh: "AFK复仇者", th: "AFK Avenger" }, rarity: "legendary", category: "griefer", desc: { en: "Was AFK that one time. Never forgave the team.", zh: "那次AFK了。从未原谅队友。", th: "เคย AFK ครั้งนั้น ไม่เคยให้อภัยทีม" }, abilities: ["GRIEF"], special: { name: "FOUNTAIN DIVE", desc: "Go AFK, then return with full rage" } },
    { name: { en: "Grief Lord", zh: "坑人之王", th: "ลอร์ดแห่งการรบกวน" }, rarity: "legendary", category: "griefer", desc: { en: "Ruins games for fun. Has no other hobbies.", zh: "为了乐趣破坏游戏。没有其他爱好。", th: "ทำลายเกมเพื่อความสนุก ไม่มีงานอดิเรกอื่น" }, abilities: ["GRIEF", "GRIEF"], special: { name: "GRIEFING SPREE", desc: "Destroy 3 random enemy cards" } },
    { name: { en: "Tilt Master", zh: "倾斜大师", th: "Tilt Master" }, rarity: "legendary", category: "toxic", desc: { en: "Can make anyone tilt in under 30 seconds.", zh: "能在30秒内让任何人倾斜。", th: "ทำให้ใครก็ได้ tilt ใน 30 วินาที" }, abilities: ["TILT", "TILT"], special: { name: "MENTAL WARFARE", desc: "Enemy misses 50% of attacks" } },
    { name: { en: "Permabanned Legend", zh: "永封传奇", th: "ตำนานแบนถาวร" }, rarity: "legendary", category: "banned", desc: { en: "Banned so many times they named a rule after him.", zh: "被封了很多次，以至于有一条规则以他命名。", th: "โดนแบนบ่อยจนตั้งชื่อกฎตามเขา" }, abilities: ["RAGEQUIT", "TOXIC"], special: { name: "EVASION", desc: "Create a new account (summon a copy) when destroyed" } },
    
    // EPICS
    { name: { en: "Smurf King", zh: "小号之王", th: "Smurf King" }, rarity: "epic", category: "smurf", desc: { en: "Bronze lobby? This is my main, I swear.", zh: "青铜局？这是我的大号，我发誓。", th: "บรอนซ์? นี่คือบัญชีหลักของฉัน ฉันสาบาน" }, abilities: ["GRIEF"], special: { name: "ALT ACCOUNT", desc: "Appear as Common rarity to enemies" } },
    { name: { en: "Salt Mine", zh: "盐矿", th: "เหมืองเกลือ" }, rarity: "epic", category: "toxic", desc: { en: "Produces infinite salt. Powers the entire server.", zh: "产出无限的盐。为整个服务器供能。", th: "ผลิตเกลือไม่จำกัด จ่ายพลังงานทั้งเซิร์ฟเวอร์" }, abilities: ["TOXIC", "TILT"], special: { name: "INFINITE SALT", desc: "Spread TOXIC to all enemies" } },
    { name: { en: "Blame Bot", zh: "甩锅机器人", th: "Blame Bot" }, rarity: "epic", category: "toxic", desc: { en: "It's never my fault. NEVER.", zh: "从来不是我的错。从来不是。", th: "ไม่ใช่ความผิดของฉัน ไม่เคย" }, abilities: ["TILT"], special: { name: "DEFLECT", desc: "Redirect all damage to random ally or enemy" } },
    { name: { en: "Toxic Cloud", zh: "毒云", th: "เมฆพิษ" }, rarity: "epic", category: "toxic", desc: { en: "Poisons the chat. Poisons the game. Poisons your day.", zh: "毒化聊天。毒化游戏。毒化你的一天。", th: "วางยาพิษแชท วางยาพิษเกม วางยาพิษวันของคุณ" }, abilities: ["TOXIC", "TOXIC"], special: { name: "GAS LEAK", desc: "-1 ATK to all cards each turn" } },
    { name: { en: "Mic Screamer", zh: "麦克风尖叫者", th: "Mic Screamer" }, rarity: "epic", category: "toxic", desc: { en: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAA", zh: "啊啊啊啊啊啊啊啊啊啊啊啊啊", th: "อ๊ากกกกกกกกกกกกกกกกกกกก" }, abilities: ["TILT"], special: { name: "EAR RUPTURE", desc: "Stun all cards for 1 turn" } },
    { name: { en: "Team Killer", zh: "杀队友的人", th: "Team Killer" }, rarity: "epic", category: "griefer", desc: { en: "Oops. My hand slipped. 37 times.", zh: "哎呀。我手滑了。37次。", th: "โอ๊ะ มือลื่น 37 ครั้ง" }, abilities: ["GRIEF"], special: { name: "FRIENDLY FIRE", desc: "Deal damage to both ally and enemy" } },
    { name: { en: "Chat Censor", zh: "聊天审查", th: "Chat Censor" }, rarity: "epic", category: "banned", desc: { en: "Everything is ****** and ********.", zh: "一切都是******和********。", th: "ทุกอย่างคือ ****** และ ********" }, abilities: ["TILT"], special: { name: "LANGUAGE!", desc: "Silence enemy abilities for 2 turns" } },
    { name: { en: "Rage Flame", zh: "愤怒之焰", th: "เปลวไฟแห่งความโกรธ" }, rarity: "epic", category: "quitter", desc: { en: "Burns bridges. Burns keyboards. Burns everything.", zh: "烧桥。烧键盘。烧一切。", th: "เผาสะพาน เผาคีย์บอร์ด เผาทุกอย่าง" }, abilities: ["RAGE", "RAGEQUIT"], special: { name: "MELTDOWN", desc: "Deal 10 damage to self and all enemies" } },
    { name: { en: "Abandon Penalty", zh: "弃赛惩罚", th: "Abandon Penalty" }, rarity: "epic", category: "quitter", desc: { en: "Deserves it. Totally deserves it.", zh: "活该。完全活该。", th: "สมควรแล้ว สมควรโดยสิ้นเชิง" }, abilities: ["RAGEQUIT"], special: { name: "COOLDOWN", desc: "When this dies, enemy can't play cards next turn" } },
    { name: { en: "Throwaway Account", zh: "一次性账号", th: "Throwaway Account" }, rarity: "epic", category: "smurf", desc: { en: "Don't care. Will make another one.", zh: "无所谓。会再开一个。", th: "ไม่แคร์ จะทำใหม่" }, abilities: ["RAGEQUIT", "GRIEF"], special: { name: "DISPOSABLE", desc: "When destroyed, put a copy in your deck" } },
    
    // RARES (15)
    { name: { en: "Tilted Tower", zh: "倾斜塔", th: "Tilted Tower" }, rarity: "rare", category: "quitter", desc: { en: "One bad game. Now it's personal.", zh: "一场糟糕的比赛。现在这是私人恩怨了。", th: "เกมแย่หนึ่งเกม ตอนนี้เป็นเรื่องส่วนตัว" }, abilities: ["TILT"], special: { name: "TILT SPIRAL", desc: "Each loss: +2 ATK, -1 HP" } },
    { name: { en: "Monitor Puncher", zh: "打显示器的人", th: "Monitor Puncher" }, rarity: "rare", category: "quitter", desc: { en: "That's the third monitor this month.", zh: "这是这个月第三个显示器了。", th: "นี่คือจอที่สามเดือนนี้" }, abilities: ["RAGE"], special: { name: "BROKEN SCREEN", desc: "Deal damage, lose equal HP" } },
    { name: { en: "Int Feeder", zh: "送人头的", th: "Int Feeder" }, rarity: "rare", category: "griefer", desc: { en: "0/47/2. 'I'm trying!'", zh: "0/47/2。'我在努力！'", th: "0/47/2 'ฉันพยายามอยู่!'" }, abilities: ["GRIEF"], special: { name: "FEEDING", desc: "When this dies, enemy gains +2 ATK" } },
    { name: { en: "All Chat Warrior", zh: "全图聊天战士", th: "All Chat Warrior" }, rarity: "rare", category: "toxic", desc: { en: "GG EZ. (Lost 0-47)", zh: "GG EZ。（0-47输了）", th: "GG EZ (แพ้ 0-47)" }, abilities: ["TOXIC"], special: { name: "TRASH TALK", desc: "Reduce enemy morale (ATK)" } },
    { name: { en: "Vote Kick Victim", zh: "被投票踢出者", th: "Vote Kick Victim" }, rarity: "rare", category: "banned", desc: { en: "4/5 voted yes. The 5th was me.", zh: "4/5投了赞成。第5个是我。", th: "4/5 โหวตใช่ คนที่ 5 คือฉัน" }, abilities: ["RAGEQUIT"], special: { name: "EJECTED", desc: "When removed, take a random enemy with you" } },
    { name: { en: "Queue Dodger", zh: "躲排队的人", th: "Queue Dodger" }, rarity: "rare", category: "quitter", desc: { en: "Saw that name. Instant dodge.", zh: "看到那个名字。立刻躲了。", th: "เห็นชื่อนั้น หนีทันที" }, abilities: ["RAGEQUIT"], special: { name: "NOPE", desc: "Return to hand before taking fatal damage" } },
    { name: { en: "Rage Typer", zh: "愤怒打字者", th: "Rage Typer" }, rarity: "rare", category: "toxic", desc: { en: "asdjfklasjdfklasjdfklsajdf", zh: "asdjfklasjdfklasjdfklsajdf", th: "asdjfklasjdfklasjdfklsajdf" }, abilities: ["RAGE", "TILT"], special: { name: "KEYBOARD MASH", desc: "Deal random damage 1-10" } },
    { name: { en: "Sarcastic Emote", zh: "讽刺表情", th: "Sarcastic Emote" }, rarity: "rare", category: "toxic", desc: { en: "Nice shot! Nice shot! Nice shot!", zh: "好球！好球！好球！", th: "ช็อตสวย! ช็อตสวย! ช็อตสวย!" }, abilities: ["TILT"], special: { name: "BM", desc: "Reduce enemy's next attack by 3" } },
    { name: { en: "Hardware Destroyer", zh: "硬件毁灭者", th: "Hardware Destroyer" }, rarity: "rare", category: "quitter", desc: { en: "Total damage: $3,847 in equipment.", zh: "总损失：$3,847的设备。", th: "ความเสียหายทั้งหมด: อุปกรณ์ $3,847" }, abilities: ["RAGE"], special: { name: "BREAKING POINT", desc: "Destroy self to deal massive damage" } },
    { name: { en: "Mute Button", zh: "静音按钮", th: "Mute Button" }, rarity: "rare", category: "banned", desc: { en: "The most powerful tool against toxicity.", zh: "对抗毒性的最强工具。", th: "เครื่องมือที่ทรงพลังที่สุดต่อความเป็นพิษ" }, abilities: [], special: { name: "SILENCE", desc: "Cancel enemy's next ability" } },
    { name: { en: "Unranked Terror", zh: "非排位恐怖", th: "Unranked Terror" }, rarity: "rare", category: "smurf", desc: { en: "New account. Definitely not a smurf.", zh: "新账号。绝对不是小号。", th: "บัญชีใหม่ ไม่ใช่สมูร์ฟแน่นอน" }, abilities: ["GRIEF"], special: { name: "STOMP", desc: "+3 ATK vs lower rarity" } },
    { name: { en: "Cooldown Timer", zh: "冷却计时器", th: "Cooldown Timer" }, rarity: "rare", category: "banned", desc: { en: "30 minute penalty. Worth it.", zh: "30分钟惩罚。值得。", th: "ค่าปรับ 30 นาที คุ้ม" }, abilities: ["RAGEQUIT"], special: { name: "WORTH IT", desc: "Skip next turn, gain +5/+5" } },
    { name: { en: "Surrender Spammer", zh: "投降刷屏者", th: "Surrender Spammer" }, rarity: "rare", category: "quitter", desc: { en: "FF at 5. FF at 10. FF at 15.", zh: "5分钟投降。10分钟投降。15分钟投降。", th: "FF นาทีที่ 5 FF นาทีที่ 10 FF นาทีที่ 15" }, abilities: ["TILT"], special: { name: "GIVE UP", desc: "End battle immediately (both take damage)" } },
    { name: { en: "Troll Account", zh: "喷子账号", th: "Troll Account" }, rarity: "rare", category: "troll", desc: { en: "Exists only to ruin your day.", zh: "存在只是为了毁掉你的一天。", th: "มีอยู่เพียงเพื่อทำลายวันของคุณ" }, abilities: ["GRIEF", "TOXIC"], special: { name: "JUST FOR FUN", desc: "Random chaotic effect" } },
    { name: { en: "Chat Banned", zh: "禁言", th: "Chat Banned" }, rarity: "rare", category: "banned", desc: { en: "Can't type. Uses pings instead.", zh: "不能打字。用Ping代替。", th: "พิมพ์ไม่ได้ ใช้ ping แทน" }, abilities: ["TILT"], special: { name: "? ? ?", desc: "Confuse enemy's next target" } },
    
    // UNCOMMONS (15)
    { name: { en: "Salt Shaker", zh: "盐罐", th: "Salt Shaker" }, rarity: "uncommon", category: "toxic", desc: { en: "Sprinkles salt everywhere.", zh: "到处撒盐。", th: "โรยเกลือทุกที่" }, abilities: ["TOXIC"], special: null },
    { name: { en: "Blame Game", zh: "甩锅游戏", th: "Blame Game" }, rarity: "uncommon", category: "toxic", desc: { en: "It's definitely not my fault.", zh: "绝对不是我的错。", th: "แน่นอนไม่ใช่ความผิดของฉัน" }, abilities: ["TILT"], special: null },
    { name: { en: "Disconnected", zh: "断开连接", th: "Disconnected" }, rarity: "uncommon", category: "quitter", desc: { en: "Totally accidental. Definitely.", zh: "完全是意外。绝对是。", th: "อุบัติเหตุโดยสิ้นเชิง แน่นอน" }, abilities: ["RAGEQUIT"], special: null },
    { name: { en: "Bad Game", zh: "糟糕的比赛", th: "Bad Game" }, rarity: "uncommon", category: "quitter", desc: { en: "Everyone has them. This one was special.", zh: "每个人都有。这场特别糟。", th: "ทุกคนมี เกมนี้พิเศษ" }, abilities: ["TILT"], special: null },
    { name: { en: "Reported", zh: "被举报", th: "Reported" }, rarity: "uncommon", category: "banned", desc: { en: "You have been reported.", zh: "你已被举报。", th: "คุณถูกรายงาน" }, abilities: ["TOXIC"], special: null },
    { name: { en: "Ping Spam", zh: "Ping刷屏", th: "Ping Spam" }, rarity: "uncommon", category: "toxic", desc: { en: "? ? ? ? ? ? ?", zh: "? ? ? ? ? ? ?", th: "? ? ? ? ? ? ?" }, abilities: ["TILT"], special: null },
    { name: { en: "Salty Tears", zh: "咸咸的泪水", th: "น้ำตาเค็ม" }, rarity: "uncommon", category: "quitter", desc: { en: "Delicious.", zh: "美味。", th: "อร่อย" }, abilities: ["RAGE"], special: null },
    { name: { en: "Keyboard Warrior", zh: "键盘侠", th: "Keyboard Warrior" }, rarity: "uncommon", category: "toxic", desc: { en: "Brave behind a screen.", zh: "在屏幕后面很勇敢。", th: "กล้าหลังจอ" }, abilities: ["TOXIC"], special: null },
    { name: { en: "Griefing 101", zh: "坑人入门", th: "Griefing 101" }, rarity: "uncommon", category: "griefer", desc: { en: "A beginner's guide to ruining games.", zh: "破坏游戏的初学者指南。", th: "คู่มือมือใหม่ในการทำลายเกม" }, abilities: ["GRIEF"], special: null },
    { name: { en: "Empty Threats", zh: "空洞的威胁", th: "Empty Threats" }, rarity: "uncommon", category: "toxic", desc: { en: "I'll report you! (Does nothing)", zh: "我要举报你！（什么都没做）", th: "ฉันจะรายงานคุณ! (ไม่ทำอะไร)" }, abilities: ["TILT"], special: null },
    { name: { en: "Alt Account", zh: "小号", th: "Alt Account" }, rarity: "uncommon", category: "smurf", desc: { en: "For when you get banned.", zh: "为了被封号时用。", th: "สำหรับเมื่อโดนแบน" }, abilities: ["RAGEQUIT"], special: null },
    { name: { en: "Excuse Factory", zh: "借口工厂", th: "Excuse Factory" }, rarity: "uncommon", category: "toxic", desc: { en: "Lag! Hacks! Team's fault!", zh: "卡！开挂！队友的错！", th: "แลค! โกง! โทษทีม!" }, abilities: ["TILT"], special: null },
    { name: { en: "Rage Bubble", zh: "愤怒气泡", th: "Rage Bubble" }, rarity: "uncommon", category: "quitter", desc: { en: "Building up... building up...", zh: "在积累...在积累...", th: "สะสม... สะสม..." }, abilities: ["RAGE"], special: null },
    { name: { en: "Tilt Factor", zh: "倾斜因素", th: "Tilt Factor" }, rarity: "uncommon", category: "toxic", desc: { en: "The more you lose, the worse you play.", zh: "输得越多，玩得越差。", th: "ยิ่งแพ้มาก ยิ่งเล่นแย่" }, abilities: ["TILT"], special: null },
    { name: { en: "Broken Controller", zh: "坏掉的手柄", th: "Broken Controller" }, rarity: "uncommon", category: "quitter", desc: { en: "Not the first. Won't be the last.", zh: "不是第一个。不会是最后一个。", th: "ไม่ใช่อันแรก จะไม่ใช่อันสุดท้าย" }, abilities: ["RAGE"], special: null },
    
    // COMMONS (20)
    { name: { en: "Angry Noob", zh: "愤怒的菜鸟", th: "Angry Noob" }, rarity: "common", category: "quitter", desc: { en: "New and already mad.", zh: "新来的，已经很生气了。", th: "ใหม่และโกรธแล้ว" }, abilities: [], special: null },
    { name: { en: "Toxic Whisper", zh: "有毒的私聊", th: "Toxic Whisper" }, rarity: "common", category: "toxic", desc: { en: "Post-game harassment.", zh: "赛后骚扰。", th: "คุกคามหลังเกม" }, abilities: [], special: null },
    { name: { en: "Quit Button", zh: "退出按钮", th: "Quit Button" }, rarity: "common", category: "quitter", desc: { en: "Click. Done.", zh: "点击。完成。", th: "คลิก เสร็จ" }, abilities: [], special: null },
    { name: { en: "Sore Loser", zh: "输不起的人", th: "Sore Loser" }, rarity: "common", category: "quitter", desc: { en: "Can't accept defeat.", zh: "无法接受失败。", th: "รับความพ่ายแพ้ไม่ได้" }, abilities: [], special: null },
    { name: { en: "Bad Sport", zh: "体育精神差", th: "Bad Sport" }, rarity: "common", category: "toxic", desc: { en: "No GG. Just salt.", zh: "没有GG。只有盐。", th: "ไม่มี GG แค่เกลือ" }, abilities: [], special: null },
    { name: { en: "Tantrum", zh: "发脾气", th: "Tantrum" }, rarity: "common", category: "quitter", desc: { en: "Childish rage.", zh: "幼稚的愤怒。", th: "ความโกรธเด็กๆ" }, abilities: [], special: null },
    { name: { en: "Eye Roll", zh: "翻白眼", th: "Eye Roll" }, rarity: "common", category: "toxic", desc: { en: "*sigh*", zh: "*叹气*", th: "*ถอนหายใจ*" }, abilities: [], special: null },
    { name: { en: "Gg No Re", zh: "gg不再打了", th: "Gg No Re" }, rarity: "common", category: "quitter", desc: { en: "One and done.", zh: "一局不再。", th: "เกมเดียวพอ" }, abilities: [], special: null },
    { name: { en: "Passive Aggressive", zh: "消极攻击", th: "Passive Aggressive" }, rarity: "common", category: "toxic", desc: { en: "No, it's fine. Whatever.", zh: "没事，随便。", th: "ไม่เป็นไร ยังไงก็ได้" }, abilities: [], special: null },
    { name: { en: "Deep Breath", zh: "深呼吸", th: "Deep Breath" }, rarity: "common", category: "quitter", desc: { en: "Trying not to rage. Failing.", zh: "努力不发火。失败了。", th: "พยายามไม่โกรธ ล้มเหลว" }, abilities: [], special: null },
    { name: { en: "Muted", zh: "已静音", th: "Muted" }, rarity: "common", category: "banned", desc: { en: "Silence is golden.", zh: "沉默是金。", th: "ความเงียบคือทอง" }, abilities: [], special: null },
    { name: { en: "Reported For Nothing", zh: "无故被举报", th: "Reported For Nothing" }, rarity: "common", category: "banned", desc: { en: "False report. Still scary.", zh: "假举报。仍然可怕。", th: "รายงานเท็จ ยังน่ากลัว" }, abilities: [], special: null },
    { name: { en: "Petty Revenge", zh: "小心眼报复", th: "Petty Revenge" }, rarity: "common", category: "griefer", desc: { en: "You took my kill. I'll take your game.", zh: "你抢了我的人头。我毁了你的比赛。", th: "คุณเอา kill ของฉัน ฉันจะเอาเกมคุณ" }, abilities: [], special: null },
    { name: { en: "Smurf Detected", zh: "检测到小号", th: "Smurf Detected" }, rarity: "common", category: "smurf", desc: { en: "Level 5 with Diamond skills.", zh: "5级有钻石技术。", th: "เลเวล 5 แต่ทักษะไดมอนด์" }, abilities: [], special: null },
    { name: { en: "Troll Face", zh: "喷子脸", th: "Troll Face" }, rarity: "common", category: "troll", desc: { en: "Problem?", zh: "有问题？", th: "มีปัญหาไหม?" }, abilities: [], special: null },
    { name: { en: "Frustration", zh: "挫败感", th: "Frustration" }, rarity: "common", category: "quitter", desc: { en: "Just... why?", zh: "就...为什么？", th: "แค่... ทำไม?" }, abilities: [], special: null },
    { name: { en: "Denial", zh: "否认", th: "Denial" }, rarity: "common", category: "toxic", desc: { en: "I'm not toxic, you're toxic!", zh: "我不毒，你才毒！", th: "ฉันไม่พิษ คุณพิษ!" }, abilities: [], special: null },
    { name: { en: "Low Blow", zh: "下流招", th: "Low Blow" }, rarity: "common", category: "toxic", desc: { en: "That was uncalled for.", zh: "那没有必要。", th: "นั่นไม่จำเป็น" }, abilities: [], special: null },
    { name: { en: "Grudge", zh: "怨恨", th: "Grudge" }, rarity: "common", category: "quitter", desc: { en: "I'll remember this. Forever.", zh: "我会记住的。永远。", th: "ฉันจะจำไว้ ตลอดกาล" }, abilities: [], special: null },
    { name: { en: "Spite Play", zh: "赌气的玩法", th: "Spite Play" }, rarity: "common", category: "griefer", desc: { en: "Bad for me, worse for you.", zh: "对我不好，对你更差。", th: "แย่สำหรับฉัน แย่กว่าสำหรับคุณ" }, abilities: [], special: null }
  ]
};

// ============================================
// SEASON 8: LEGENDS REBORN
// ============================================
const SEASON_8 = {
  id: 8,
  name: "Legends Reborn",
  subtitle: "Heroes Return",
  theme: "nostalgia",
  icon: "⭐",
  color: "#ff69b4",
  bgGradient: "linear-gradient(135deg, #ff69b4, #da70d6)",
  lore: {
    title: "Anniversary Celebration",
    leader: "RegginA, Ascended",
    setting: "One year since the guild's founding. Ancient magic resurrects and empowers the original heroes. Fan-favorites return with new art and upgraded abilities."
  },
  mechanics: {
    LEGACY: { desc: "Copies abilities of original card" },
    ASCEND: { desc: "Evolve into stronger form" },
    NOSTALGIA: { desc: "Bonus with other Reborn cards" },
    REMASTER: { desc: "Enhanced version of classic" },
    THROWBACK: { desc: "Use Season 1 mechanics" }
  },
  categories: ["og", "reborn", "ascended", "vintage", "classic", "legend"],
  cards: [
    // MYTHICS
    { name: { en: "RegginA, Ascended", zh: "升华的RegginA", th: "RegginA ผู้ยกระดับ" }, rarity: "mythic", category: "ascended", desc: { en: "Beyond mortal form. Pure guild energy.", zh: "超越凡人形态。纯粹的公会能量。", th: "เหนือรูปแบบมนุษย์ พลังกิลด์บริสุทธิ์" }, abilities: ["ASCEND", "LEGACY"], special: { name: "TRANSCENDENCE", desc: "All Season 1 cards in deck gain +3/+3" } },
    { name: { en: "Harlay, Eternal Alpha", zh: "永恒阿尔法哈雷", th: "Harlay อัลฟ่าอมตะ" }, rarity: "mythic", category: "ascended", desc: { en: "The pack follows forever. Even in death.", zh: "狗群永远追随。即使死亡。", th: "ฝูงติดตามตลอดกาล แม้ในความตาย" }, abilities: ["LEGACY", "NOSTALGIA"], special: { name: "ETERNAL PACK", desc: "All Dogs are immune to destruction" } },
    
    // LEGENDARIES
    { name: { en: "Classic RegginA Reborn", zh: "经典RegginA重生", th: "Classic RegginA Reborn" }, rarity: "legendary", category: "reborn", desc: { en: "Remember when it all began? She does.", zh: "记得一切开始的时候吗？她记得。", th: "จำได้ไหมเมื่อทุกอย่างเริ่มต้น? เธอจำได้" }, abilities: ["LEGACY", "THROWBACK"], special: { name: "ORIGINAL", desc: "Gains all abilities from Season 1 RegginA" } },
    { name: { en: "Vintage Whale", zh: "复古大鲸鱼", th: "Vintage Whale" }, rarity: "legendary", category: "vintage", desc: { en: "Spending since day one. The original supporter.", zh: "从第一天开始氪金。最初的支持者。", th: "ใช้เงินตั้งแต่วันแรก ผู้สนับสนุนดั้งเดิม" }, abilities: ["REMASTER", "NOSTALGIA"], special: { name: "FOUNDING WHALE", desc: "Draw 2 cards. If they're from Season 1, draw 2 more." } },
    { name: { en: "OG Lurker", zh: "元老潜伏者", th: "OG Lurker" }, rarity: "legendary", category: "og", desc: { en: "Been lurking since beta. Still lurking.", zh: "从测试版就开始潜水。现在还在潜。", th: "แอบดูตั้งแต่เบต้า ยังแอบดูอยู่" }, abilities: ["LEGACY", "THROWBACK"], special: { name: "VETERAN LURKER", desc: "Hidden. Can attack while hidden." } },
    { name: { en: "Legacy Champion", zh: "传承冠军", th: "Legacy Champion" }, rarity: "legendary", category: "legend", desc: { en: "Won the first tournament. Still undefeated in hearts.", zh: "赢得了第一个锦标赛。在心中仍然不败。", th: "ชนะทัวร์นาเมนต์แรก ยังไม่แพ้ในใจ" }, abilities: ["NOSTALGIA", "ASCEND"], special: { name: "FIRST VICTORY", desc: "+5/+5 if this is your first card played" } },
    { name: { en: "Retro Sacred Log", zh: "复古圣木", th: "Retro Sacred Log" }, rarity: "legendary", category: "classic", desc: { en: "The original artifact. Now with HD textures.", zh: "原始神器。现在有高清材质。", th: "สิ่งประดิษฐ์ดั้งเดิม ตอนนี้มีพื้นผิว HD" }, abilities: ["REMASTER", "THROWBACK"], special: { name: "SACRED REMASTER", desc: "All allies gain original Season 1 effects" } },
    { name: { en: "Founding Member #001", zh: "创始成员#001", th: "Founding Member #001" }, rarity: "legendary", category: "og", desc: { en: "The first to join. The last to leave.", zh: "第一个加入。最后一个离开。", th: "คนแรกที่เข้าร่วม คนสุดท้ายที่จาก" }, abilities: ["LEGACY", "NOSTALGIA"], special: { name: "SENIORITY", desc: "Immune to effects from newer cards" } },
    
    // EPICS
    { name: { en: "Anniversary Cake", zh: "周年蛋糕", th: "Anniversary Cake" }, rarity: "epic", category: "classic", desc: { en: "Happy 1st birthday, NumbahWan!", zh: "一岁生日快乐，NumbahWan！", th: "สุขสันต์วันเกิดครบ 1 ขวบ NumbahWan!" }, abilities: ["NOSTALGIA"], special: { name: "CELEBRATION", desc: "Heal all allies 5 HP" } },
    { name: { en: "Throwback Thursday", zh: "怀旧星期四", th: "Throwback Thursday" }, rarity: "epic", category: "vintage", desc: { en: "Remember the good old days?", zh: "记得美好的旧时光吗？", th: "จำวันเก่าๆ ที่ดีได้ไหม?" }, abilities: ["THROWBACK", "THROWBACK"], special: { name: "TBT", desc: "Replay any Season 1 card from graveyard" } },
    { name: { en: "Nostalgia Trip", zh: "怀旧之旅", th: "Nostalgia Trip" }, rarity: "epic", category: "vintage", desc: { en: "Back when the game was good. (It still is)", zh: "当游戏还好的时候。（现在也好）", th: "ตอนที่เกมยังดี (ยังดีอยู่)" }, abilities: ["NOSTALGIA", "NOSTALGIA"], special: { name: "MEMORY LANE", desc: "+2/+2 for each Reborn card in play" } },
    { name: { en: "HD Remaster", zh: "高清重制", th: "HD Remaster" }, rarity: "epic", category: "reborn", desc: { en: "Same card, better pixels.", zh: "同样的卡，更好的像素。", th: "การ์ดเดิม พิกเซลดีขึ้น" }, abilities: ["REMASTER"], special: { name: "4K UPGRADE", desc: "Double all stats of target card" } },
    { name: { en: "Veterans' Reunion", zh: "老兵聚会", th: "Veterans' Reunion" }, rarity: "epic", category: "og", desc: { en: "The old gang's all here.", zh: "老帮派都在这里。", th: "แก๊งเก่าอยู่ครบ" }, abilities: ["LEGACY", "NOSTALGIA"], special: { name: "REUNION", desc: "Summon 2 random Season 1 Commons" } },
    { name: { en: "Classic Combo", zh: "经典连招", th: "Classic Combo" }, rarity: "epic", category: "classic", desc: { en: "The original OP strategy.", zh: "原始的OP策略。", th: "กลยุทธ์ OP ดั้งเดิม" }, abilities: ["THROWBACK", "LEGACY"], special: { name: "OG META", desc: "Chain 3 attacks in one turn" } },
    { name: { en: "Memory Crystal", zh: "记忆水晶", th: "Memory Crystal" }, rarity: "epic", category: "classic", desc: { en: "Contains all the memories of Season 1.", zh: "包含第一季的所有回忆。", th: "มีความทรงจำทั้งหมดของซีซั่น 1" }, abilities: ["NOSTALGIA"], special: { name: "RECALL", desc: "See all cards opponent played this game" } },
    { name: { en: "Gilded Frame", zh: "镀金框", th: "Gilded Frame" }, rarity: "epic", category: "vintage", desc: { en: "A premium upgrade for classic cards.", zh: "经典卡的高级升级。", th: "อัพเกรดพรีเมียมสำหรับการ์ดคลาสสิก" }, abilities: ["REMASTER", "ASCEND"], special: { name: "PREMIUM EDITION", desc: "Target Reborn card gains +4/+4" } },
    { name: { en: "Time Capsule", zh: "时间胶囊", th: "Time Capsule" }, rarity: "epic", category: "classic", desc: { en: "Sealed since the beginning.", zh: "从一开始就封存。", th: "ปิดผนึกตั้งแต่เริ่มต้น" }, abilities: ["THROWBACK"], special: { name: "UNSEALED", desc: "Draw 3 random Season 1 cards" } },
    { name: { en: "Legacy Code", zh: "遗留代码", th: "Legacy Code" }, rarity: "epic", category: "og", desc: { en: "Old code, but it still works. Somehow.", zh: "旧代码，但它仍然工作。不知怎的。", th: "โค้ดเก่า แต่ยังทำงาน ยังไงก็ตาม" }, abilities: ["LEGACY", "THROWBACK"], special: { name: "DON'T TOUCH", desc: "Cannot be modified or removed" } },
    
    // RARES + UNCOMMONS + COMMONS abbreviated
    { name: { en: "Beta Tester Badge", zh: "测试者徽章", th: "Beta Tester Badge" }, rarity: "rare", category: "og", desc: { en: "Played since before launch.", zh: "发布前就开始玩了。", th: "เล่นก่อนเปิดตัว" }, abilities: ["LEGACY"], special: { name: "EARLY ADOPTER", desc: "+3/+3 on first turn" } },
    { name: { en: "Old Guard", zh: "老卫兵", th: "Old Guard" }, rarity: "rare", category: "og", desc: { en: "Defending the guild since day one.", zh: "从第一天就保卫公会。", th: "ปกป้องกิลด์ตั้งแต่วันแรก" }, abilities: ["LEGACY", "NOSTALGIA"], special: { name: "STEADFAST", desc: "Cannot be moved or repositioned" } },
    { name: { en: "Remastered Classic", zh: "重制经典", th: "Remastered Classic" }, rarity: "rare", category: "reborn", desc: { en: "Same feel, new look.", zh: "同样的感觉，新的外观。", th: "ความรู้สึกเดิม รูปลักษณ์ใหม่" }, abilities: ["REMASTER"], special: null },
    { name: { en: "Vintage Collection", zh: "复古收藏", th: "Vintage Collection" }, rarity: "rare", category: "vintage", desc: { en: "Worth more than new cards.", zh: "比新卡更值钱。", th: "มีค่ามากกว่าการ์ดใหม่" }, abilities: ["NOSTALGIA"], special: null },
    { name: { en: "Founder's Token", zh: "创始人代币", th: "Founder's Token" }, rarity: "uncommon", category: "og", desc: { en: "Proof of early support.", zh: "早期支持的证明。", th: "หลักฐานการสนับสนุนยุคแรก" }, abilities: ["LEGACY"], special: null },
    { name: { en: "Nostalgic Feeling", zh: "怀旧之情", th: "Nostalgic Feeling" }, rarity: "uncommon", category: "vintage", desc: { en: "Ah, those were the days.", zh: "啊，那是美好的日子。", th: "อา นั่นคือวันเวลา" }, abilities: ["NOSTALGIA"], special: null },
    { name: { en: "Classic Card Back", zh: "经典卡背", th: "Classic Card Back" }, rarity: "common", category: "classic", desc: { en: "The original design.", zh: "原始设计。", th: "การออกแบบดั้งเดิม" }, abilities: [], special: null },
    { name: { en: "Old Screenshot", zh: "旧截图", th: "Old Screenshot" }, rarity: "common", category: "vintage", desc: { en: "Look how far we've come.", zh: "看看我们走了多远。", th: "ดูว่าเรามาไกลแค่ไหน" }, abilities: [], special: null },
    { name: { en: "Memories", zh: "回忆", th: "Memories" }, rarity: "common", category: "vintage", desc: { en: "The best kind of treasure.", zh: "最好的宝藏。", th: "สมบัติที่ดีที่สุด" }, abilities: [], special: null },
    { name: { en: "First Login", zh: "第一次登录", th: "First Login" }, rarity: "common", category: "og", desc: { en: "Everyone starts somewhere.", zh: "每个人都从某处开始。", th: "ทุกคนเริ่มต้นที่ไหนสักแห่ง" }, abilities: [], special: null }
  ]
};

// ============================================
// SEASON 9: MULTIVERSE MAYHEM
// ============================================
const SEASON_9 = {
  id: 9,
  name: "Multiverse Mayhem",
  subtitle: "Infinite Possibilities",
  theme: "multiverse",
  icon: "🌌",
  color: "#9400d3",
  bgGradient: "linear-gradient(135deg, #9400d3, #4b0082)",
  lore: {
    title: "Reality Breaks",
    leader: "Multiverse RegginA",
    setting: "Portals open to alternate realities. Infinite versions of every character collide. Hero meets villain. Past meets future. Nothing is as it seems."
  },
  mechanics: {
    PORTAL: { desc: "Swap with card from deck" },
    ALTERNATE: { desc: "Different effect each game" },
    REALITY: { desc: "Change the board rules" },
    PARADOX: { desc: "Exist in two places at once" },
    DUPLICATE: { desc: "Create a copy of this card" }
  },
  categories: ["prime", "alternate", "paradox", "void", "mirror", "chaos"],
  cards: [
    // MYTHICS
    { name: { en: "Multiverse RegginA", zh: "多元宇宙RegginA", th: "RegginA มัลติเวิร์ส" }, rarity: "mythic", category: "prime", desc: { en: "All versions. All timelines. All at once.", zh: "所有版本。所有时间线。同时。", th: "ทุกเวอร์ชัน ทุกไทม์ไลน์ พร้อมกัน" }, abilities: ["PORTAL", "PARADOX"], special: { name: "INFINITE REGGINS", desc: "Summon 1 copy of each RegginA variant in existence" } },
    { name: { en: "Reality Breaker", zh: "现实破坏者", th: "ผู้ทำลายความจริง" }, rarity: "mythic", category: "chaos", desc: { en: "When reality breaks, everything is possible.", zh: "当现实破碎，一切皆有可能。", th: "เมื่อความจริงแตก ทุกอย่างเป็นไปได้" }, abilities: ["REALITY", "ALTERNATE"], special: { name: "SHATTERED REALITY", desc: "Randomize ALL stats on ALL cards" } },
    
    // LEGENDARIES
    { name: { en: "Evil RegginA", zh: "邪恶RegginA", th: "RegginA ชั่วร้าย" }, rarity: "legendary", category: "alternate", desc: { en: "From a universe where the guild went dark.", zh: "来自公会堕落的宇宙。", th: "จากจักรวาลที่กิลด์ตกต่ำ" }, abilities: ["ALTERNATE", "PARADOX"], special: { name: "DARK MIRROR", desc: "Deal damage equal to your missing HP" } },
    { name: { en: "Robot Harlay", zh: "机器人哈雷", th: "Harlay หุ่นยนต์" }, rarity: "legendary", category: "alternate", desc: { en: "Upgraded. Enhanced. Still a good boy.", zh: "升级了。增强了。仍然是个好孩子。", th: "อัพเกรดแล้ว ปรับปรุงแล้ว ยังเป็นน้องหมาดี" }, abilities: ["PORTAL", "DUPLICATE"], special: { name: "MECHA DOG", desc: "Split into 2 smaller Robot Harlays" } },
    { name: { en: "Angel Lurker", zh: "天使潜伏者", th: "Lurker เทวดา" }, rarity: "legendary", category: "alternate", desc: { en: "The opposite of shadow. Pure light.", zh: "影子的对立面。纯光。", th: "ตรงข้ามของเงา แสงบริสุทธิ์" }, abilities: ["PARADOX", "REALITY"], special: { name: "DIVINE PRESENCE", desc: "Heal all cards on both sides" } },
    { name: { en: "Pirate Whale", zh: "海盗鲸鱼", th: "วาฬโจรสลัด" }, rarity: "legendary", category: "alternate", desc: { en: "Yarr! Time to loot some premium currency!", zh: "呀！是时候掠夺一些高级货币了！", th: "ยาร์! ถึงเวลาปล้นสกุลเงินพรีเมียม!" }, abilities: ["PORTAL", "ALTERNATE"], special: { name: "PLUNDER", desc: "Steal 3 random cards from enemy deck" } },
    { name: { en: "Paradox Twin", zh: "悖论双胞胎", th: "Paradox Twin" }, rarity: "legendary", category: "paradox", desc: { en: "Two of the same. Both real. Both fake.", zh: "两个相同的。都是真的。都是假的。", th: "สองของเหมือนกัน ทั้งคู่จริง ทั้งคู่ปลอม" }, abilities: ["PARADOX", "DUPLICATE"], special: { name: "ENTANGLED", desc: "Damage to one heals the other" } },
    { name: { en: "Void Walker", zh: "虚空行者", th: "Void Walker" }, rarity: "legendary", category: "void", desc: { en: "Exists between realities. Belongs to none.", zh: "存在于现实之间。不属于任何一个。", th: "มีอยู่ระหว่างความจริง ไม่เป็นของใคร" }, abilities: ["PORTAL", "REALITY"], special: { name: "BETWEEN WORLDS", desc: "Cannot be targeted while in the Void" } },
    
    // EPICS
    { name: { en: "Mirror Match", zh: "镜像对决", th: "Mirror Match" }, rarity: "epic", category: "mirror", desc: { en: "Fighting yourself is the hardest battle.", zh: "与自己战斗是最艰难的战斗。", th: "การต่อสู้กับตัวเองคือการต่อสู้ที่ยากที่สุด" }, abilities: ["DUPLICATE", "PARADOX"], special: { name: "REFLECTION", desc: "Create a copy on the enemy's side" } },
    { name: { en: "Dimensional Rift", zh: "次元裂缝", th: "Dimensional Rift" }, rarity: "epic", category: "chaos", desc: { en: "A tear in reality. Things leak through.", zh: "现实的裂缝。东西漏出来了。", th: "รอยฉีกในความจริง สิ่งต่างๆ รั่วไหลผ่าน" }, abilities: ["PORTAL", "REALITY"], special: { name: "LEAK", desc: "Random card from another game joins" } },
    { name: { en: "Timeline Split", zh: "时间线分裂", th: "Timeline Split" }, rarity: "epic", category: "paradox", desc: { en: "Two paths diverge. Both taken.", zh: "两条路分开。都走了。", th: "สองเส้นทางแยก ทั้งคู่ถูกเลือก" }, abilities: ["PARADOX", "ALTERNATE"], special: { name: "BRANCH", desc: "Play the same card twice with different effects" } },
    { name: { en: "What If?", zh: "假如？", th: "What If?" }, rarity: "epic", category: "alternate", desc: { en: "In another timeline, you made a different choice.", zh: "在另一个时间线，你做出了不同的选择。", th: "ในไทม์ไลน์อื่น คุณเลือกต่างออกไป" }, abilities: ["ALTERNATE", "ALTERNATE"], special: { name: "ALTERNATE CHOICE", desc: "Redo your last turn differently" } },
    { name: { en: "Cosmic Horror Zakum", zh: "宇宙恐怖扎昆", th: "Cosmic Horror Zakum" }, rarity: "epic", category: "void", desc: { en: "From a universe where Zakum won.", zh: "来自扎昆获胜的宇宙。", th: "จากจักรวาลที่ Zakum ชนะ" }, abilities: ["REALITY", "PARADOX"], special: { name: "ELDER GOD", desc: "All rules become suggestions" } },
    { name: { en: "Quantum Uncertainty", zh: "量子不确定性", th: "Quantum Uncertainty" }, rarity: "epic", category: "paradox", desc: { en: "Alive and dead. Strong and weak. Yes and no.", zh: "活着和死了。强和弱。是和否。", th: "มีชีวิตและตาย แข็งแรงและอ่อนแอ ใช่และไม่" }, abilities: ["PARADOX"], special: { name: "SUPERSTATE", desc: "Stats are random until observed" } },
    { name: { en: "Doppelganger Army", zh: "二重身军队", th: "กองทัพร่างโคลน" }, rarity: "epic", category: "mirror", desc: { en: "Infinite copies. Infinite chaos.", zh: "无限复制。无限混乱。", th: "สำเนาไม่จำกัด ความวุ่นวายไม่จำกัด" }, abilities: ["DUPLICATE", "DUPLICATE"], special: { name: "LEGION", desc: "Create 5 copies (1/1 each)" } },
    { name: { en: "Reality Anchor", zh: "现实之锚", th: "Reality Anchor" }, rarity: "epic", category: "prime", desc: { en: "Keeps everything from falling apart.", zh: "让一切不至于崩溃。", th: "รักษาทุกอย่างไม่ให้แตกสลาย" }, abilities: ["REALITY"], special: { name: "STABLE", desc: "Prevent all reality-altering effects" } },
    { name: { en: "Variant Collector", zh: "变体收集者", th: "Variant Collector" }, rarity: "epic", category: "prime", desc: { en: "Gotta catch all the RegginAs.", zh: "要收集所有的RegginA。", th: "ต้องสะสม RegginA ทั้งหมด" }, abilities: ["PORTAL", "ALTERNATE"], special: { name: "COLLECTION", desc: "+1/+1 for each unique variant in deck" } },
    { name: { en: "Void Storm", zh: "虚空风暴", th: "Void Storm" }, rarity: "epic", category: "void", desc: { en: "When the multiverse bleeds.", zh: "当多元宇宙流血时。", th: "เมื่อมัลติเวิร์สมีเลือดไหล" }, abilities: ["REALITY", "PORTAL"], special: { name: "COLLAPSE", desc: "Send all cards to the Void for 1 turn" } },
    
    // RARES + UNCOMMONS + COMMONS abbreviated
    { name: { en: "Portal Hopper", zh: "传送门跳跃者", th: "Portal Hopper" }, rarity: "rare", category: "chaos", desc: { en: "Never in one place for long.", zh: "从不在一个地方待太久。", th: "ไม่เคยอยู่ที่หนึ่งนาน" }, abilities: ["PORTAL"], special: null },
    { name: { en: "Reality Glitch", zh: "现实故障", th: "Reality Glitch" }, rarity: "rare", category: "chaos", desc: { en: "Something went wrong somewhere.", zh: "某处出了问题。", th: "บางอย่างผิดพลาดที่ไหนสักที่" }, abilities: ["REALITY"], special: null },
    { name: { en: "Alternate Self", zh: "另一个自己", th: "Alternate Self" }, rarity: "rare", category: "alternate", desc: { en: "The you that made different choices.", zh: "做出不同选择的你。", th: "คุณที่เลือกต่างออกไป" }, abilities: ["ALTERNATE"], special: null },
    { name: { en: "Paradox Echo", zh: "悖论回声", th: "Paradox Echo" }, rarity: "uncommon", category: "paradox", desc: { en: "A remnant of what could have been.", zh: "本可能发生的事物的残余。", th: "เศษเสี้ยวของสิ่งที่อาจเป็น" }, abilities: ["PARADOX"], special: null },
    { name: { en: "Dimensional Crack", zh: "次元裂缝", th: "Dimensional Crack" }, rarity: "uncommon", category: "void", desc: { en: "Small leak. Big problems.", zh: "小漏洞。大问题。", th: "รอยรั่วเล็ก ปัญหาใหญ่" }, abilities: ["PORTAL"], special: null },
    { name: { en: "Mirror Shard", zh: "镜子碎片", th: "Mirror Shard" }, rarity: "common", category: "mirror", desc: { en: "Piece of a broken reality.", zh: "破碎现实的碎片。", th: "ชิ้นส่วนของความจริงที่แตก" }, abilities: [], special: null },
    { name: { en: "Cosmic Dust", zh: "宇宙尘埃", th: "Cosmic Dust" }, rarity: "common", category: "void", desc: { en: "Remnants of collapsed universes.", zh: "崩溃宇宙的残余。", th: "เศษซากของจักรวาลที่ล่มสลาย" }, abilities: [], special: null }
  ]
};

// ============================================
// SEASON 10: FINAL DAWN
// ============================================
const SEASON_10 = {
  id: 10,
  name: "Final Dawn",
  subtitle: "The Last Stand",
  theme: "apocalypse",
  icon: "🌅",
  color: "#ff4500",
  bgGradient: "linear-gradient(135deg, #ff4500, #8b0000)",
  lore: {
    title: "Server Shutdown",
    leader: "RegginA, The Immortal",
    setting: "The servers will shut down forever. But RegginA refuses to accept the end. In one desperate final stand, the guild must defeat the God of the Server itself."
  },
  mechanics: {
    FINAL: { desc: "Can only be played once per game" },
    ETERNAL: { desc: "Cannot be destroyed" },
    APOCALYPSE: { desc: "Destroy all cards on board" },
    SALVATION: { desc: "Prevent game loss once" },
    LEGACY_FINAL: { desc: "Effects persist after game ends" }
  },
  categories: ["immortal", "final", "divine", "eternal", "savior", "legend"],
  cards: [
    // MYTHICS
    { name: { en: "RegginA, The Immortal", zh: "永生的RegginA", th: "RegginA ผู้อมตะ" }, rarity: "mythic", category: "immortal", desc: { en: "They said the servers would end. She said no.", zh: "他们说服务器会结束。她说不。", th: "พวกเขาบอกว่าเซิร์ฟเวอร์จะปิด เธอบอกไม่" }, abilities: ["ETERNAL", "FINAL"], special: { name: "IMMORTALITY", desc: "Cannot lose. Ever. The game continues until you win." } },
    { name: { en: "God of the Server", zh: "服务器之神", th: "เทพเจ้าแห่งเซิร์ฟเวอร์" }, rarity: "mythic", category: "divine", desc: { en: "Controls everything. Decides who lives, who dies, who is forgotten.", zh: "控制一切。决定谁生，谁死，谁被遗忘。", th: "ควบคุมทุกอย่าง ตัดสินใจว่าใครมีชีวิต ใครตาย ใครถูกลืม" }, abilities: ["APOCALYPSE", "ETERNAL"], special: { name: "ADMIN POWER", desc: "Delete any card from existence permanently" } },
    
    // LEGENDARIES
    { name: { en: "Last Login", zh: "最后一次登录", th: "เข้าสู่ระบบครั้งสุดท้าย" }, rarity: "legendary", category: "final", desc: { en: "One more time. For old times' sake.", zh: "再一次。为了往日时光。", th: "อีกครั้ง เพื่อความหลังเก่าๆ" }, abilities: ["FINAL", "LEGACY_FINAL"], special: { name: "FAREWELL", desc: "All your cards gain +10/+10 for the final battle" } },
    { name: { en: "Server Guardian", zh: "服务器守护者", th: "ผู้พิทักษ์เซิร์ฟเวอร์" }, rarity: "legendary", category: "divine", desc: { en: "Protected the servers for 10 seasons. Won't stop now.", zh: "保护服务器10个赛季。现在不会停止。", th: "ปกป้องเซิร์ฟเวอร์ 10 ซีซั่น จะไม่หยุดตอนนี้" }, abilities: ["ETERNAL", "SALVATION"], special: { name: "FIREWALL", desc: "Prevent the next 3 game-ending effects" } },
    { name: { en: "Final Message", zh: "最后的消息", th: "ข้อความสุดท้าย" }, rarity: "legendary", category: "final", desc: { en: "To all players: Thank you for the memories.", zh: "致所有玩家：感谢这些回忆。", th: "ถึงผู้เล่นทุกคน: ขอบคุณสำหรับความทรงจำ" }, abilities: ["FINAL", "SALVATION"], special: { name: "GRATITUDE", desc: "All cards on both sides become allies" } },
    { name: { en: "Eternal Memory", zh: "永恒记忆", th: "ความทรงจำนิรันดร์" }, rarity: "legendary", category: "eternal", desc: { en: "Even when the servers die, the memories live on.", zh: "即使服务器死亡，回忆也会继续存在。", th: "แม้เซิร์ฟเวอร์ตาย ความทรงจำยังคงอยู่" }, abilities: ["ETERNAL", "LEGACY_FINAL"], special: { name: "NEVER FORGOTTEN", desc: "This card exists in all future games" } },
    { name: { en: "The Great Uninstaller", zh: "伟大的卸载者", th: "ผู้ถอนการติดตั้งผู้ยิ่งใหญ่" }, rarity: "legendary", category: "divine", desc: { en: "The final boss of all games. Deletes everything.", zh: "所有游戏的最终boss。删除一切。", th: "บอสสุดท้ายของทุกเกม ลบทุกอย่าง" }, abilities: ["APOCALYPSE", "FINAL"], special: { name: "GAME OVER", desc: "End the game. Winner determined by current HP." } },
    { name: { en: "Hope Eternal", zh: "永恒希望", th: "ความหวังนิรันดร์" }, rarity: "legendary", category: "savior", desc: { en: "As long as one player believes, the game continues.", zh: "只要有一个玩家相信，游戏就会继续。", th: "ตราบใดที่มีผู้เล่นหนึ่งคนเชื่อ เกมยังคงดำเนินต่อไป" }, abilities: ["SALVATION", "ETERNAL"], special: { name: "FAITH", desc: "Prevent server shutdown. The game continues." } },
    
    // EPICS
    { name: { en: "Shutdown Timer", zh: "关机计时器", th: "ตัวจับเวลาปิดเครื่อง" }, rarity: "epic", category: "final", desc: { en: "10... 9... 8...", zh: "10... 9... 8...", th: "10... 9... 8..." }, abilities: ["FINAL"], special: { name: "COUNTDOWN", desc: "In 10 turns, the game ends" } },
    { name: { en: "Data Backup", zh: "数据备份", th: "สำรองข้อมูล" }, rarity: "epic", category: "eternal", desc: { en: "Saving everything before it's too late.", zh: "在为时已晚之前保存一切。", th: "บันทึกทุกอย่างก่อนสาย" }, abilities: ["SALVATION", "LEGACY_FINAL"], special: { name: "SAVE STATE", desc: "Restore board to beginning of turn" } },
    { name: { en: "Phoenix Protocol", zh: "凤凰协议", th: "โปรโตคอลฟีนิกซ์" }, rarity: "epic", category: "savior", desc: { en: "From the ashes, we rise.", zh: "从灰烬中，我们崛起。", th: "จากขี้เถ้า เราลุกขึ้นมา" }, abilities: ["SALVATION"], special: { name: "REBIRTH", desc: "When destroyed, revive all friendly cards" } },
    { name: { en: "Last Stand Harlay", zh: "最后一战哈雷", th: "Harlay ยืนหยัดครั้งสุดท้าย" }, rarity: "epic", category: "final", desc: { en: "Good boy until the end. The very end.", zh: "直到最后都是好孩子。真正的最后。", th: "น้องหมาดีจนถึงที่สุด ที่สุดจริงๆ" }, abilities: ["FINAL", "ETERNAL"], special: { name: "LOYAL TO THE END", desc: "Cannot be destroyed while RegginA is alive" } },
    { name: { en: "Apocalypse Button", zh: "末日按钮", th: "ปุ่มวันสิ้นโลก" }, rarity: "epic", category: "divine", desc: { en: "Do not press. (You know you want to)", zh: "不要按。（你知道你想按）", th: "อย่ากด (คุณรู้ว่าอยากกด)" }, abilities: ["APOCALYPSE"], special: { name: "NUCLEAR OPTION", desc: "Destroy ALL cards. Both sides. Everything." } },
    { name: { en: "Guild Monument", zh: "公会纪念碑", th: "อนุสาวรีย์กิลด์" }, rarity: "epic", category: "eternal", desc: { en: "NumbahWan was here. 2026-Forever.", zh: "NumbahWan曾在这里。2026-永远。", th: "NumbahWan อยู่ที่นี่ 2026-ตลอดกาล" }, abilities: ["ETERNAL", "LEGACY_FINAL"], special: { name: "IMMORTALIZED", desc: "This card can never be removed from the game" } },
    { name: { en: "Farewell Tour", zh: "告别巡演", th: "ทัวร์อำลา" }, rarity: "epic", category: "legend", desc: { en: "One last adventure with all our friends.", zh: "与所有朋友最后一次冒险。", th: "การผจญภัยครั้งสุดท้ายกับเพื่อนทุกคน" }, abilities: ["FINAL", "SALVATION"], special: { name: "REUNION", desc: "Summon 1 card from each previous season" } },
    { name: { en: "Developer's Note", zh: "开发者的话", th: "บันทึกของนักพัฒนา" }, rarity: "epic", category: "divine", desc: { en: "Thank you for playing. We made this for you.", zh: "感谢您的游玩。我们为您制作了这个。", th: "ขอบคุณที่เล่น เราทำสิ่งนี้เพื่อคุณ" }, abilities: ["LEGACY_FINAL"], special: { name: "HEARTFELT", desc: "All cards become Legendary for the rest of the game" } },
    { name: { en: "Time Capsule 2026", zh: "2026时间胶囊", th: "แคปซูลเวลา 2026" }, rarity: "epic", category: "eternal", desc: { en: "To be opened: Never. To be remembered: Always.", zh: "打开时间：永不。记住时间：永远。", th: "เปิดเมื่อ: ไม่เคย จดจำ: ตลอดเวลา" }, abilities: ["ETERNAL", "LEGACY_FINAL"], special: { name: "SEALED FOREVER", desc: "Contents unknown but infinitely valuable" } },
    { name: { en: "Last Whale Standing", zh: "最后站着的鲸鱼", th: "วาฬตัวสุดท้ายที่ยืนอยู่" }, rarity: "epic", category: "legend", desc: { en: "Spent to the very end. No regrets.", zh: "一直氪到最后。无怨无悔。", th: "ใช้จ่ายจนถึงที่สุด ไม่เสียใจ" }, abilities: ["FINAL", "ETERNAL"], special: { name: "FINAL PURCHASE", desc: "Double all your stats. One time only." } },
    
    // RARES + UNCOMMONS + COMMONS abbreviated
    { name: { en: "Final Quest", zh: "最终任务", th: "Final Quest" }, rarity: "rare", category: "final", desc: { en: "One last objective.", zh: "最后一个目标。", th: "วัตถุประสงค์สุดท้าย" }, abilities: ["FINAL"], special: null },
    { name: { en: "Goodbye Message", zh: "再见消息", th: "Goodbye Message" }, rarity: "rare", category: "final", desc: { en: "See you in the next game.", zh: "下个游戏见。", th: "เจอกันในเกมหน้า" }, abilities: ["LEGACY_FINAL"], special: null },
    { name: { en: "Saved Progress", zh: "保存的进度", th: "Saved Progress" }, rarity: "uncommon", category: "eternal", desc: { en: "Everything you accomplished.", zh: "你完成的一切。", th: "ทุกอย่างที่คุณทำสำเร็จ" }, abilities: ["SALVATION"], special: null },
    { name: { en: "End Credits", zh: "片尾字幕", th: "End Credits" }, rarity: "common", category: "final", desc: { en: "Thank you for watching.", zh: "感谢观看。", th: "ขอบคุณที่รับชม" }, abilities: [], special: null },
    { name: { en: "Server Light", zh: "服务器灯", th: "Server Light" }, rarity: "common", category: "divine", desc: { en: "Still blinking. Still alive.", zh: "仍在闪烁。仍然活着。", th: "ยังกะพริบ ยังมีชีวิต" }, abilities: [], special: null },
    { name: { en: "Last Screenshot", zh: "最后的截图", th: "Last Screenshot" }, rarity: "common", category: "eternal", desc: { en: "Capturing the moment.", zh: "捕捉这一刻。", th: "จับภาพช่วงเวลา" }, abilities: [], special: null }
  ]
};

// Export
module.exports = { SEASON_7, SEASON_8, SEASON_9, SEASON_10 };
