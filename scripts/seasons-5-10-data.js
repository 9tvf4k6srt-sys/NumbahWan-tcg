/**
 * NumbahWan TCG - Seasons 5-10 Card Data
 * Fun, compelling content that makes people NEED to collect
 */

const SEASONS_5_TO_10 = {
  5: {
    name: "Tournament of Champions",
    subtitle: "The Grand Arena",
    theme: "esports",
    icon: "🏆",
    color: "#ffd700",
    lore: {
      title: "World Championship",
      leader: "World Champion RegginA",
      setting: "The biggest esports tournament in history. NumbahWan faces rival guilds from every server in a battle for ultimate glory."
    },
    mechanics: {
      COMBO: { name: "Chain Attack", desc: "Chain attacks for bonus damage", color: "#ffd700" },
      TOURNAMENT: { name: "Bracket Climb", desc: "Gains power each round", color: "#ff8c00" },
      RANKED: { name: "Skill Gap", desc: "Stronger against higher rarity", color: "#00ff00" },
      MVP: { name: "Most Valuable", desc: "Bonus if this wins the game", color: "#ff69b4" },
      CLUTCH: { name: "Under Pressure", desc: "Powerful when HP is low", color: "#ff0000" }
    },
    categories: {
      pro: { icon: "🎮", name: "Pro Player" },
      coach: { icon: "📋", name: "Coach" },
      caster: { icon: "🎙️", name: "Caster" },
      sponsor: { icon: "💰", name: "Sponsor" },
      fan: { icon: "📣", name: "Fan" },
      rival: { icon: "⚔️", name: "Rival" }
    },
    cards: [
      // MYTHICS
      { name: { en: "World Champion RegginA", zh: "世界冠军RegginA", th: "แชมป์โลก RegginA" }, rarity: "mythic", category: "pro", desc: { en: "Three-time world champion. Her APM is literally unmeasurable.", zh: "三届世界冠军。她的APM字面上无法测量。", th: "แชมป์โลกสามสมัย APM วัดไม่ได้" }, abilities: ["COMBO", "MVP"], special: { name: "PERFECT GAME", desc: "If you win without losing HP, deal double damage" } },
      { name: { en: "The Final Boss", zh: "最终Boss", th: "บอสสุดท้าย" }, rarity: "mythic", category: "rival", desc: { en: "The undefeated champion of champions. No one has seen his face.", zh: "无败的冠军中的冠军。没人见过他的脸。", th: "แชมป์ไร้พ่าย ไม่มีใครเห็นหน้า" }, abilities: ["TOURNAMENT", "CLUTCH"], special: { name: "FINAL FORM", desc: "Gain +1/+1 for every turn this game has lasted" } },
      
      // LEGENDARIES
      { name: { en: "Esports Caster Extraordinaire", zh: "电竞解说大师", th: "นักพากย์อีสปอร์ตระดับตำนาน" }, rarity: "legendary", category: "caster", desc: { en: "AND THE CROWD GOES WILD! His voice breaks records.", zh: "观众沸腾了！他的声音打破纪录。", th: "และฝูงชนก็คลั่ง! เสียงของเขาทำลายสถิติ" }, abilities: ["COMBO"], special: { name: "HYPE", desc: "All allies gain +2 ATK this turn" } },
      { name: { en: "Pro Gamer Elite (420_N0SC0P3)", zh: "职业玩家精英 (420_N0SC0P3)", th: "Pro Gamer Elite (420_N0SC0P3)" }, rarity: "legendary", category: "pro", desc: { en: "Sponsored by 7 energy drink brands. Hasn't slept in 3 days.", zh: "被7个能量饮料品牌赞助。3天没睡了。", th: "ได้รับการสนับสนุนจาก 7 แบรนด์เครื่องดื่มชูกำลัง ไม่ได้นอน 3 วัน" }, abilities: ["COMBO", "RANKED"], special: { name: "360 NO SCOPE", desc: "100% crit chance on first attack" } },
      { name: { en: "Team Captain (IGL)", zh: "队长 (IGL)", th: "กัปตันทีม (IGL)" }, rarity: "legendary", category: "pro", desc: { en: "His calls are law. The team moves as one under his command.", zh: "他的指令就是法律。团队在他指挥下行动如一。", th: "คำสั่งของเขาคือกฎหมาย ทีมเคลื่อนไหวเป็นหนึ่งเดียว" }, abilities: ["TOURNAMENT"], special: { name: "SHOT CALLER", desc: "Choose which enemy card attacks next" } },
      { name: { en: "Underdog Hero", zh: "黑马英雄", th: "ฮีโร่ม้ามืด" }, rarity: "legendary", category: "pro", desc: { en: "Nobody expected them. Now everybody fears them.", zh: "没人预料到他们。现在所有人都怕他们。", th: "ไม่มีใครคาดคิด ตอนนี้ทุกคนกลัว" }, abilities: ["CLUTCH", "MVP"], special: { name: "UPSET", desc: "Deal triple damage to cards of higher rarity" } },
      { name: { en: "Gamer Girl Bathwater", zh: "游戏女孩洗澡水", th: "Gamer Girl Bathwater" }, rarity: "legendary", category: "sponsor", desc: { en: "Limited edition. Sold out in 0.3 seconds. Worth $10,000.", zh: "限量版。0.3秒售罄。价值10,000美元。", th: "Limited edition ขายหมดใน 0.3 วินาที มูลค่า $10,000" }, abilities: ["MVP"], special: { name: "THIRST TRAP", desc: "Enemy cards target this instead of allies" } },
      { name: { en: "Keyboard God", zh: "键盘之神", th: "เทพคีย์บอร์ด" }, rarity: "legendary", category: "pro", desc: { en: "Types so fast the keyboard catches fire. Literally.", zh: "打字快到键盘着火。真的。", th: "พิมพ์เร็วจนคีย์บอร์ดติดไฟ จริงๆ" }, abilities: ["COMBO", "COMBO"], special: { name: "APM OVERFLOW", desc: "Attack twice per turn" } },
      
      // EPICS
      { name: { en: "Energy Drink Elemental", zh: "能量饮料元素", th: "Energy Drink Elemental" }, rarity: "epic", category: "sponsor", desc: { en: "IS THIS EVEN LEGAL?! Yes. Barely.", zh: "这合法吗？！是的。勉强。", th: "นี่ถูกกฎหมายไหม?! ใช่ เฉียดฉิว" }, abilities: ["COMBO"], special: { name: "CAFFEINATED", desc: "+5 SPD permanently" } },
      { name: { en: "Toxic Teammate", zh: "毒队友", th: "เพื่อนร่วมทีมพิษ" }, rarity: "epic", category: "rival", desc: { en: "GG EZ. Uninstall. Trash team. (Is the worst player)", zh: "GG EZ。卸载吧。垃圾队。（是最差的玩家）", th: "GG EZ ถอนการติดตั้ง ทีมห่วย (เป็นผู้เล่นที่แย่ที่สุด)" }, abilities: ["RANKED"], special: { name: "FLAME", desc: "Reduce ALL cards' ATK by 1 (including yours)" } },
      { name: { en: "Stream Sniper", zh: "蹲直播", th: "Stream Sniper" }, rarity: "epic", category: "rival", desc: { en: "Knows your every move. Because they're watching your stream.", zh: "知道你的每一步。因为他们在看你直播。", th: "รู้ทุกการเคลื่อนไหว เพราะดูสตรีมคุณ" }, abilities: ["RANKED"], special: { name: "GHOSTING", desc: "See enemy's hand permanently" } },
      { name: { en: "One Trick Pony", zh: "一招鲜", th: "One Trick Pony" }, rarity: "epic", category: "pro", desc: { en: "Only plays one character. Is terrifyingly good at it.", zh: "只玩一个角色。玩得可怕地好。", th: "เล่นแค่ตัวเดียว เก่งน่ากลัว" }, abilities: ["TOURNAMENT"], special: { name: "MASTERY", desc: "+4/+4 but can only attack one enemy type" } },
      { name: { en: "Smurfer Supreme", zh: "小号大师", th: "สมูร์ฟเฟอร์สูงสุด" }, rarity: "epic", category: "rival", desc: { en: "Bronze rank. Diamond skills. Ruining games for fun.", zh: "青铜段位。钻石技术。为了乐趣毁掉比赛。", th: "แรงค์บรอนซ์ ทักษะไดมอนด์ ทำลายเกมเพื่อความสนุก" }, abilities: ["RANKED", "CLUTCH"], special: { name: "STOMP", desc: "Deal double damage to lower rarity cards" } },
      { name: { en: "Macro Master", zh: "宏观大师", th: "Macro Master" }, rarity: "epic", category: "coach", desc: { en: "Sees the whole board. Plans 10 moves ahead.", zh: "看到整个棋盘。提前计划10步。", th: "เห็นทั้งกระดาน วางแผนล่วงหน้า 10 ขั้นตอน" }, abilities: ["TOURNAMENT"], special: { name: "BIG BRAIN", desc: "Look at top 3 cards of enemy deck" } },
      { name: { en: "Micro Monster", zh: "微操怪物", th: "Micro Monster" }, rarity: "epic", category: "pro", desc: { en: "Perfect mechanics. Zero game sense. Still wins.", zh: "完美的机制。零游戏意识。仍然赢。", th: "กลศาสตร์สมบูรณ์แบบ ไม่มีเกมเซนส์ ยังชนะ" }, abilities: ["COMBO", "COMBO"], special: { name: "OUTPLAY", desc: "Dodge next attack, counter for equal damage" } },
      { name: { en: "Analyst Andy", zh: "分析师安迪", th: "Analyst Andy" }, rarity: "epic", category: "caster", desc: { en: "Has a spreadsheet for everything. EVERYTHING.", zh: "什么都有电子表格。什么都有。", th: "มีสเปรดชีตสำหรับทุกอย่าง ทุกอย่าง" }, abilities: ["TOURNAMENT"], special: { name: "STATS", desc: "Know exact HP of all enemy cards" } },
      { name: { en: "Hype Man", zh: "气氛担当", th: "Hype Man" }, rarity: "epic", category: "fan", desc: { en: "LET'S GOOOOOO! POGCHAMP! SHEEEESH!", zh: "冲啊！！！POGCHAMP！SHEEEESH！", th: "ไปกันเลย! POGCHAMP! SHEEEESH!" }, abilities: ["COMBO"], special: { name: "MOMENTUM", desc: "Gain +1 ATK for each attack this turn" } },
      { name: { en: "Content Creator", zh: "内容创作者", th: "Content Creator" }, rarity: "epic", category: "sponsor", desc: { en: "Like and subscribe! Don't forget to hit that bell!", zh: "点赞订阅！别忘了按那个铃铛！", th: "ไลค์และซับสคริบ! อย่าลืมกดกระดิ่ง!" }, abilities: ["MVP"], special: { name: "CLICKBAIT", desc: "Draw 2 cards if this kills an enemy" } },
      
      // RARES (15)
      { name: { en: "Rage Quitter", zh: "退游狂人", th: "Rage Quitter" }, rarity: "rare", category: "rival", desc: { en: "Can't lose if you quit first. *taps forehead*", zh: "先退出就不会输。*敲敲脑门*", th: "แพ้ไม่ได้ถ้าออกก่อน *แตะหน้าผาก*" }, abilities: ["CLUTCH"], special: { name: "DISCONNECT", desc: "Remove this card instead of being destroyed" } },
      { name: { en: "Hardstuck Player", zh: "卡段位玩家", th: "Hardstuck Player" }, rarity: "rare", category: "pro", desc: { en: "Been Diamond for 5 seasons. Team's fault.", zh: "在钻石5个赛季了。是队友的错。", th: "ติดไดมอนด์ 5 ซีซั่นแล้ว โทษทีม" }, abilities: ["RANKED"], special: { name: "TILT", desc: "Gains ATK when losing, loses ATK when winning" } },
      { name: { en: "Backseat Gamer", zh: "云玩家", th: "Backseat Gamer" }, rarity: "rare", category: "fan", desc: { en: "You should have done X! (Has never played the game)", zh: "你应该做X！（从没玩过这游戏）", th: "คุณควรทำ X! (ไม่เคยเล่นเกมนี้)" }, abilities: ["TOURNAMENT"], special: { name: "ADVICE", desc: "Tell ally which card to attack" } },
      { name: { en: "Meta Slave", zh: "版本答案奴隶", th: "Meta Slave" }, rarity: "rare", category: "pro", desc: { en: "Only plays what streamers play. No original thoughts.", zh: "只玩主播玩的。没有原创想法。", th: "เล่นแค่ที่สตรีมเมอร์เล่น ไม่มีความคิดเป็นของตัวเอง" }, abilities: ["RANKED"], special: { name: "COPY BUILD", desc: "Copy enemy's highest ATK card's abilities" } },
      { name: { en: "Washed Up Pro", zh: "过气职业选手", th: "Washed Up Pro" }, rarity: "rare", category: "pro", desc: { en: "Was the best. Five years ago. Still talks about it.", zh: "曾经最强。五年前。还在说这事。", th: "เคยเก่งที่สุด ห้าปีก่อน ยังพูดอยู่" }, abilities: ["CLUTCH"], special: { name: "GLORY DAYS", desc: "First attack does double damage, then -2 ATK" } },
      { name: { en: "Sponsor Money", zh: "赞助商金钱", th: "Sponsor Money" }, rarity: "rare", category: "sponsor", desc: { en: "Money doesn't buy skill. But it buys everything else.", zh: "钱买不到技术。但能买其他一切。", th: "เงินซื้อทักษะไม่ได้ แต่ซื้ออย่างอื่นได้ทุกอย่าง" }, abilities: [], special: { name: "FUNDING", desc: "Pay HP to increase ATK" } },
      { name: { en: "Tournament Jitters", zh: "比赛紧张", th: "Tournament Jitters" }, rarity: "rare", category: "pro", desc: { en: "Rank 1 in practice. Rank last on stage.", zh: "练习第一名。比赛倒数第一。", th: "อันดับ 1 ในการซ้อม อันดับสุดท้ายบนเวที" }, abilities: ["TOURNAMENT"], special: { name: "CHOKE", desc: "50% to miss attack when HP > 10" } },
      { name: { en: "LAN Champion", zh: "LAN冠军", th: "LAN Champion" }, rarity: "rare", category: "pro", desc: { en: "Unbeatable on LAN. Mediocre online. It's different!", zh: "LAN上无敌。线上一般。不一样的！", th: "เอาชนะไม่ได้บน LAN ออนไลน์ธรรมดา มันต่างกัน!" }, abilities: ["TOURNAMENT", "CLUTCH"], special: { name: "NO LAG", desc: "+3 SPD in tournament mode" } },
      { name: { en: "Throwing for Content", zh: "为了内容故意输", th: "Throwing for Content" }, rarity: "rare", category: "sponsor", desc: { en: "Chat wanted me to do it! *loses tournament*", zh: "聊天室让我这么做的！*输掉比赛*", th: "แชทอยากให้ทำ! *แพ้ทัวร์นาเมนต์*" }, abilities: ["MVP"], special: { name: "FOR THE VIEWS", desc: "Lose on purpose to draw 3 cards" } },
      { name: { en: "Boosted Account", zh: "被代练的账号", th: "Boosted Account" }, rarity: "rare", category: "rival", desc: { en: "How did they get to this rank? We know.", zh: "他们怎么到这个段位的？我们知道。", th: "พวกเขาขึ้นมาถึงแรงค์นี้ได้ยังไง? เรารู้" }, abilities: ["RANKED"], special: { name: "CARRIED", desc: "Strong with allies, weak alone" } },
      { name: { en: "Warm Up Game", zh: "热身赛", th: "Warm Up Game" }, rarity: "rare", category: "pro", desc: { en: "Just warming up! (Has been playing for 8 hours)", zh: "只是在热身！（已经玩了8小时）", th: "แค่อุ่นเครื่อง! (เล่นมา 8 ชั่วโมงแล้ว)" }, abilities: ["TOURNAMENT"], special: { name: "GETTING STARTED", desc: "Gains +1/+1 each turn until turn 5" } },
      { name: { en: "Bronze to Challenger Speedrun", zh: "青铜到王者速通", th: "Bronze to Challenger Speedrun" }, rarity: "rare", category: "pro", desc: { en: "On an alt account. For the third time today.", zh: "用小号。今天第三次了。", th: "บนบัญชีรอง เป็นครั้งที่สามในวันนี้" }, abilities: ["RANKED", "COMBO"], special: { name: "SPEEDRUN", desc: "First 3 turns: +3 ATK" } },
      { name: { en: "Highlight Reel", zh: "精彩集锦", th: "Highlight Reel" }, rarity: "rare", category: "caster", desc: { en: "The best moments. The worst cuts.", zh: "最好的时刻。最差的剪辑。", th: "ช่วงเวลาที่ดีที่สุด การตัดที่แย่ที่สุด" }, abilities: ["MVP"], special: { name: "SICK PLAY", desc: "On kill, +2/+2 permanently" } },
      { name: { en: "Patch Notes Reader", zh: "补丁说明读者", th: "ผู้อ่าน Patch Notes" }, rarity: "rare", category: "coach", desc: { en: "Actually reads the patch notes. Revolutionary.", zh: "真的读补丁说明。革命性的。", th: "อ่าน patch notes จริงๆ ปฏิวัติวงการ" }, abilities: ["TOURNAMENT"], special: { name: "INFORMED", desc: "Know all enemy abilities before combat" } },
      { name: { en: "Tilted Tower", zh: "倾斜塔", th: "Tilted Tower" }, rarity: "rare", category: "rival", desc: { en: "One loss becomes ten. Can't stop the spiral.", zh: "输一场变成输十场。停不下来的螺旋。", th: "แพ้หนึ่งกลายเป็นสิบ หยุดไม่ได้" }, abilities: ["CLUTCH"], special: { name: "SPIRAL", desc: "Each loss this game: +2 ATK, -1 HP" } },
      
      // UNCOMMONS (15) + COMMONS (20) abbreviated for space
      { name: { en: "Filler Pick", zh: "补位选择", th: "Filler Pick" }, rarity: "uncommon", category: "pro", desc: { en: "Someone had to do it.", zh: "总得有人做。", th: "ใครสักคนต้องทำ" }, abilities: ["TOURNAMENT"], special: null },
      { name: { en: "Timebank Manager", zh: "时间管理者", th: "Timebank Manager" }, rarity: "uncommon", category: "coach", desc: { en: "Uses every second of the timer.", zh: "用尽计时器的每一秒。", th: "ใช้ทุกวินาทีของตัวจับเวลา" }, abilities: [], special: { name: "STALL", desc: "Delay enemy's next action" } },
      { name: { en: "Early GG", zh: "提前GG", th: "Early GG" }, rarity: "uncommon", category: "rival", desc: { en: "GG at minute 5. Game lasted 45 minutes.", zh: "第5分钟GG。比赛打了45分钟。", th: "GG นาทีที่ 5 เกมยาว 45 นาที" }, abilities: [], special: { name: "PREMATURE", desc: "If you say GG and don't win, take 5 damage" } },
      { name: { en: "Donation TTS", zh: "打赏语音", th: "Donation TTS" }, rarity: "uncommon", category: "fan", desc: { en: "Hi chat! Just wanted to say...", zh: "大家好！只想说...", th: "สวัสดีแชท! แค่อยากจะบอก..." }, abilities: [], special: { name: "MESSAGE", desc: "Play a sound that does nothing" } },
      { name: { en: "Pause Abuser", zh: "暂停滥用者", th: "Pause Abuser" }, rarity: "uncommon", category: "rival", desc: { en: "Technical issues! (Has perfect connection)", zh: "技术问题！（连接完美）", th: "ปัญหาทางเทคนิค! (เน็ตดีมาก)" }, abilities: [], special: { name: "TACTICAL PAUSE", desc: "Skip one enemy turn (once per game)" } },
      { name: { en: "GG WP Bot", zh: "GG WP机器人", th: "GG WP Bot" }, rarity: "common", category: "fan", desc: { en: "Good game, well played!", zh: "打得好，玩得好！", th: "เกมดี เล่นเก่ง!" }, abilities: [], special: null },
      { name: { en: "Salty Loser", zh: "输不起的人", th: "Salty Loser" }, rarity: "common", category: "rival", desc: { en: "Reports everyone after every loss.", zh: "每次输了都举报所有人。", th: "รายงานทุกคนหลังแพ้ทุกครั้ง" }, abilities: [], special: null },
      { name: { en: "Noob", zh: "菜鸟", th: "Noob" }, rarity: "common", category: "fan", desc: { en: "We all started somewhere.", zh: "我们都是从某处开始的。", th: "เราทุกคนเริ่มต้นจากที่ไหนสักแห่ง" }, abilities: [], special: null },
      { name: { en: "AFK Player", zh: "AFK玩家", th: "AFK Player" }, rarity: "common", category: "rival", desc: { en: "BRB, mom called.", zh: "我去一下，妈妈叫我。", th: "เดี๋ยวกลับมา แม่เรียก" }, abilities: [], special: { name: "AFK", desc: "Does nothing for 2 turns" } },
      { name: { en: "Tutorial Bot", zh: "教程机器人", th: "Tutorial Bot" }, rarity: "common", category: "pro", desc: { en: "Press A to attack!", zh: "按A攻击！", th: "กด A เพื่อโจมตี!" }, abilities: [], special: null },
      { name: { en: "Queue Dodge", zh: "躲排位", th: "Queue Dodge" }, rarity: "common", category: "rival", desc: { en: "Saw your name. Nope.", zh: "看到你的名字了。算了。", th: "เห็นชื่อคุณ ไม่เอา" }, abilities: [], special: null },
      { name: { en: "Participation Trophy", zh: "参与奖", th: "Participation Trophy" }, rarity: "common", category: "fan", desc: { en: "You tried!", zh: "你尝试了！", th: "คุณพยายามแล้ว!" }, abilities: [], special: null },
      { name: { en: "Loading Screen Tip", zh: "加载屏幕提示", th: "Loading Screen Tip" }, rarity: "common", category: "coach", desc: { en: "Did you know? You can attack enemies!", zh: "你知道吗？你可以攻击敌人！", th: "รู้ไหม? คุณสามารถโจมตีศัตรูได้!" }, abilities: [], special: null },
      { name: { en: "One More Game", zh: "再来一局", th: "One More Game" }, rarity: "common", category: "fan", desc: { en: "It's 4 AM. Just one more.", zh: "凌晨4点了。就再来一局。", th: "ตี 4 แล้ว อีกแค่เกมเดียว" }, abilities: [], special: null },
      { name: { en: "Practice Tool", zh: "练习工具", th: "Practice Tool" }, rarity: "common", category: "coach", desc: { en: "Infinite mana. Infinite cooldowns. Infinite time.", zh: "无限法力。无限冷却。无限时间。", th: "มานาไม่จำกัด คูลดาวน์ไม่จำกัด เวลาไม่จำกัด" }, abilities: [], special: null }
    ]
  },

  6: {
    name: "Whale Wars",
    subtitle: "Money Talks",
    theme: "economy",
    icon: "🐋",
    color: "#00d4aa",
    lore: {
      title: "The Platinum Club",
      leader: "Mega Whale Supreme",
      setting: "The richest players in the game have united. They have unlimited resources, exclusive skins, and the devs on speed dial."
    },
    mechanics: {
      PREMIUM: { name: "VIP Access", desc: "Costs gold instead of mana", color: "#ffd700" },
      WHALE: { name: "Deep Pockets", desc: "Power scales with money spent", color: "#00d4aa" },
      P2W: { name: "Pay to Win", desc: "Automatically win ties", color: "#ff69b4" },
      GACHA_LUCK: { name: "Whale Luck", desc: "Better pull rates", color: "#ff0000" },
      REFUND: { name: "Chargeback", desc: "Return to hand, gain gold", color: "#00ff00" }
    },
    categories: {
      whale: { icon: "🐋", name: "Whale" },
      dolphin: { icon: "🐬", name: "Dolphin" },
      minnow: { icon: "🐟", name: "Minnow" },
      f2p: { icon: "🆓", name: "F2P" },
      dev: { icon: "💻", name: "Dev" },
      shop: { icon: "🛒", name: "Shop" }
    },
    cards: [
      // MYTHICS
      { name: { en: "Mega Whale Supreme", zh: "超级氪金巨鲸", th: "วาฬยักษ์สูงสุด" }, rarity: "mythic", category: "whale", desc: { en: "Has spent $500,000. Still doesn't have the rare skin. Worth it.", zh: "花了50万美元。仍然没有稀有皮肤。值得。", th: "ใช้ไป $500,000 ยังไม่มีสกินหายาก คุ้ม" }, abilities: ["WHALE", "P2W"], special: { name: "INFINITE MONEY", desc: "Can play any card for free once per turn" } },
      { name: { en: "Golden RegginA", zh: "黄金RegginA", th: "RegginA ทอง" }, rarity: "mythic", category: "whale", desc: { en: "24 karat gold plating. Limited to 1 copy. This is it.", zh: "24克拉金镀层。限量1张。就是这张。", th: "ชุบทอง 24 กะรัต จำกัด 1 ใบ นี่แหละ" }, abilities: ["PREMIUM", "WHALE"], special: { name: "EXCLUSIVE", desc: "Cannot be countered or negated by any card" } },
      
      // LEGENDARIES  
      { name: { en: "Credit Card Warrior", zh: "信用卡战士", th: "นักรบบัตรเครดิต" }, rarity: "legendary", category: "whale", desc: { en: "Swipe. Swipe. Swipe. Declined. Calls bank. Swipe.", zh: "刷。刷。刷。被拒。打银行电话。刷。", th: "รูด รูด รูด ถูกปฏิเสธ โทรธนาคาร รูด" }, abilities: ["PREMIUM", "P2W"], special: { name: "UNLIMITED", desc: "No card costs for 3 turns" } },
      { name: { en: "VIP Exclusive Member", zh: "VIP专属会员", th: "สมาชิก VIP Exclusive" }, rarity: "legendary", category: "whale", desc: { en: "$99.99/month. Access to slightly different color schemes.", zh: "每月$99.99。可使用略微不同的配色方案。", th: "$99.99/เดือน เข้าถึงสีที่แตกต่างเล็กน้อย" }, abilities: ["PREMIUM", "GACHA_LUCK"], special: { name: "MEMBERS ONLY", desc: "Draw an extra card each turn" } },
      { name: { en: "Cash Shop King", zh: "商城之王", th: "ราชาร้านค้าเงินสด" }, rarity: "legendary", category: "shop", desc: { en: "Owns every skin, mount, and pet. Still feels empty inside.", zh: "拥有每个皮肤、坐骑和宠物。内心仍然空虚。", th: "มีทุกสกิน พาหนะ และสัตว์เลี้ยง ยังรู้สึกว่างเปล่าภายใน" }, abilities: ["WHALE", "PREMIUM"], special: { name: "COMPLETIONIST", desc: "+1/+1 for each card type you own" } },
      { name: { en: "Gacha God", zh: "抽卡之神", th: "เทพกาชา" }, rarity: "legendary", category: "whale", desc: { en: "0.001% drop rate? First try. Every time.", zh: "0.001%掉率？第一次就中。每次都是。", th: "อัตราดรอป 0.001%? ได้ครั้งแรก ทุกครั้ง" }, abilities: ["GACHA_LUCK", "GACHA_LUCK"], special: { name: "DIVINE PULL", desc: "Draw cards until you get a Legendary" } },
      { name: { en: "Dolphin Diplomat", zh: "海豚外交官", th: "ทูตโลมา" }, rarity: "legendary", category: "dolphin", desc: { en: "Spends responsibly. Just $200 a month. That's responsible, right?", zh: "理性消费。每月只花200美元。那是理性的，对吧？", th: "ใช้จ่ายอย่างมีความรับผิดชอบ แค่ $200/เดือน นั่นมีความรับผิดชอบใช่ไหม?" }, abilities: ["PREMIUM", "REFUND"], special: { name: "BUDGETED", desc: "Gain 1 gold per turn" } },
      { name: { en: "Predatory Monetization", zh: "掠夺性货币化", th: "Predatory Monetization" }, rarity: "legendary", category: "dev", desc: { en: "It's not gambling if we call it surprise mechanics!", zh: "如果我们叫它惊喜机制，那就不是赌博！", th: "ไม่ใช่การพนันถ้าเราเรียกมันว่ากลไกเซอร์ไพรส์!" }, abilities: ["P2W"], special: { name: "SURPRISE", desc: "Force enemy to pay costs twice" } },
      
      // EPICS
      { name: { en: "Battle Pass Baron", zh: "战斗通行证男爵", th: "บารอน Battle Pass" }, rarity: "epic", category: "whale", desc: { en: "Tier 100 on day one. Worth the $150.", zh: "第一天就100级。值150美元。", th: "เทียร์ 100 วันแรก คุ้มค่า $150" }, abilities: ["PREMIUM"], special: { name: "TIER SKIP", desc: "Skip enemy's next turn" } },
      { name: { en: "Loot Box Addict", zh: "宝箱成瘾者", th: "Loot Box Addict" }, rarity: "epic", category: "whale", desc: { en: "Just one more box. One more. One more. One more.", zh: "再开一个箱子。再一个。再一个。再一个。", th: "อีกแค่กล่องเดียว อีก อีก อีก" }, abilities: ["GACHA_LUCK"], special: { name: "GAMBLER", desc: "Open a random card (could be any rarity)" } },
      { name: { en: "Founder's Pack Owner", zh: "创始人包拥有者", th: "เจ้าของ Founder's Pack" }, rarity: "epic", category: "whale", desc: { en: "Backed the Kickstarter. Game released 5 years late.", zh: "支持了众筹。游戏晚了5年发布。", th: "สนับสนุน Kickstarter เกมออกช้า 5 ปี" }, abilities: ["PREMIUM", "REFUND"], special: { name: "EARLY ACCESS", desc: "Play cards 1 turn earlier" } },
      { name: { en: "Cosmetic Collector", zh: "外观收集者", th: "Cosmetic Collector" }, rarity: "epic", category: "whale", desc: { en: "1,847 skins. Uses the default one.", zh: "1,847个皮肤。用默认的。", th: "1,847 สกิน ใช้ค่าเริ่มต้น" }, abilities: ["WHALE"], special: { name: "FASHIONABLE", desc: "+2/+2 if you have more card types than enemy" } },
      { name: { en: "Minnow Martyr", zh: "小鱼烈士", th: "Minnow Martyr" }, rarity: "epic", category: "minnow", desc: { en: "Just $5. That's nothing! $5 more won't hurt...", zh: "只有5美元。那不算什么！再花5美元也没关系...", th: "แค่ $5 นั่นไม่มีอะไร! อีก $5 ไม่เจ็บ..." }, abilities: ["PREMIUM"], special: { name: "SLIPPERY SLOPE", desc: "After playing this, must play another PREMIUM card" } },
      { name: { en: "Bundle Buyer", zh: "捆绑购买者", th: "Bundle Buyer" }, rarity: "epic", category: "shop", desc: { en: "70% off! Only $49.99! (Contains $3 worth of items)", zh: "七折！仅$49.99！（包含价值$3的物品）", th: "ลด 70%! เพียง $49.99! (มีของมูลค่า $3)" }, abilities: ["REFUND"], special: { name: "DEAL", desc: "Play 2 cards for the cost of 1" } },
      { name: { en: "F2P BTW", zh: "我是免费玩家", th: "F2P BTW" }, rarity: "epic", category: "f2p", desc: { en: "Completely free to play! (800 hours grinding)", zh: "完全免费！（肝了800小时）", th: "เล่นฟรีทั้งหมด! (ฟาร์ม 800 ชั่วโมง)" }, abilities: [], special: { name: "GRINDER", desc: "Gains +1/+1 each turn you don't spend gold" } },
      { name: { en: "Pay Pig", zh: "付费猪", th: "Pay Pig" }, rarity: "epic", category: "whale", desc: { en: "Exists to fund the game for everyone else.", zh: "存在是为了给其他人资助游戏。", th: "มีอยู่เพื่อให้ทุนเกมสำหรับคนอื่น" }, abilities: ["WHALE", "P2W"], special: { name: "FUNDING", desc: "Pay 5 HP to draw 3 cards" } },
      { name: { en: "Microtransaction Monster", zh: "微交易怪物", th: "Microtransaction Monster" }, rarity: "epic", category: "shop", desc: { en: "$0.99 here, $1.99 there... total: $3,847", zh: "这里$0.99，那里$1.99...总计：$3,847", th: "$0.99 ที่นี่ $1.99 ที่นั่น... รวม: $3,847" }, abilities: ["PREMIUM"], special: { name: "NICKEL AND DIME", desc: "Deal 1 damage 10 times" } },
      { name: { en: "Flash Sale Panic", zh: "限时抢购恐慌", th: "Flash Sale Panic" }, rarity: "epic", category: "shop", desc: { en: "Only 2 hours left! (Comes back every week)", zh: "只剩2小时了！（每周都会再来）", th: "เหลืออีก 2 ชั่วโมง! (กลับมาทุกสัปดาห์)" }, abilities: ["PREMIUM"], special: { name: "FOMO", desc: "Force enemy to play their next card immediately" } },
      
      // RARES + UNCOMMONS + COMMONS abbreviated
      { name: { en: "Discount Hunter", zh: "折扣猎手", th: "Discount Hunter" }, rarity: "rare", category: "minnow", desc: { en: "Never pays full price. Waits for sales.", zh: "从不付全价。等打折。", th: "ไม่เคยจ่ายเต็ม รอลดราคา" }, abilities: ["REFUND"], special: { name: "SALE", desc: "Play cards for 1 less cost" } },
      { name: { en: "Currency Converter", zh: "货币转换器", th: "Currency Converter" }, rarity: "rare", category: "shop", desc: { en: "1000 gems = 100 coins = 10 tokens = 1 actual dollar", zh: "1000宝石 = 100金币 = 10代币 = 1实际美元", th: "1000 gems = 100 coins = 10 tokens = 1 ดอลลาร์จริง" }, abilities: [], special: { name: "EXCHANGE", desc: "Convert damage to healing or vice versa" } },
      { name: { en: "Regret Purchase", zh: "后悔购买", th: "Regret Purchase" }, rarity: "rare", category: "whale", desc: { en: "Why did I buy this? Oh well.", zh: "我为什么买这个？算了。", th: "ทำไมฉันถึงซื้ออันนี้? ช่างมัน" }, abilities: ["REFUND"], special: { name: "BUYER'S REMORSE", desc: "Return to hand, enemy discards a card" } },
      { name: { en: "Limited Time Offer", zh: "限时优惠", th: "Limited Time Offer" }, rarity: "uncommon", category: "shop", desc: { en: "ACT NOW! (Available indefinitely)", zh: "现在行动！（无限期可用）", th: "ซื้อเลย! (มีให้ตลอด)" }, abilities: [], special: null },
      { name: { en: "In-Game Currency", zh: "游戏内货币", th: "In-Game Currency" }, rarity: "common", category: "shop", desc: { en: "Worth exactly nothing in real life.", zh: "在现实中一文不值。", th: "ไม่มีค่าในชีวิตจริง" }, abilities: [], special: null },
      { name: { en: "Sunk Cost", zh: "沉没成本", th: "Sunk Cost" }, rarity: "common", category: "whale", desc: { en: "Can't quit now. Already spent too much.", zh: "现在不能退出了。已经花太多了。", th: "เลิกไม่ได้แล้ว ใช้ไปเยอะแล้ว" }, abilities: [], special: null }
    ]
  }
};

// Export for main generator
module.exports = SEASONS_5_TO_10;
