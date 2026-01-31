/**
 * NumbahWan TCG - Season Templates 5-10
 * The Epic Saga Continues!
 */

// ============================================
// SEASON 5: TOURNAMENT OF CHAMPIONS
// ============================================
const SEASON_5 = {
  id: 5,
  name: "Tournament of Champions",
  subtitle: "The Grand Arena",
  theme: "esports",
  icon: "🏆",
  color: "#ffd700",
  bgGradient: "linear-gradient(135deg, #ffd700, #ff8c00)",
  lore: {
    title: "World Championship",
    leader: "World Champion RegginA",
    setting: "The biggest esports tournament in history. NumbahWan faces rival guilds from every server in a battle for ultimate glory."
  },
  mechanics: {
    COMBO: { desc: "Chain attacks for bonus damage" },
    TOURNAMENT: { desc: "Gains power each round" },
    RANKED: { desc: "Stronger against higher rarity" },
    MVP: { desc: "Bonus if this wins the game" },
    CLUTCH: { desc: "Powerful when HP is low" }
  },
  categories: ["pro", "coach", "caster", "sponsor", "fan", "rival"],
  cards: [
    // MYTHICS
    { name: { en: "World Champion RegginA", zh: "世界冠军RegginA", th: "แชมป์โลก RegginA" }, rarity: "mythic", category: "pro", desc: { en: "Three-time world champion. Her APM is literally unmeasurable.", zh: "三届世界冠军。她的APM字面上无法测量。", th: "แชมป์โลกสามสมัย APM วัดไม่ได้" }, abilities: ["COMBO", "MVP"], special: { name: "PERFECT GAME", desc: "If you win without losing HP, deal double damage" } },
    { name: { en: "The Final Boss", zh: "最终Boss", th: "บอสสุดท้าย" }, rarity: "mythic", category: "rival", desc: { en: "The undefeated champion of champions. No one has seen his face.", zh: "无败的冠军中的冠军。没人见过他的脸。", th: "แชมป์ไร้พ่าย ไม่มีใครเห็นหน้า" }, abilities: ["TOURNAMENT", "CLUTCH"], special: { name: "FINAL FORM", desc: "Gain +1/+1 for every turn this game has lasted" } },
    
    // LEGENDARIES
    { name: { en: "Esports Caster (HYPE GOD)", zh: "电竞解说 (HYPE GOD)", th: "นักพากย์อีสปอร์ต (HYPE GOD)" }, rarity: "legendary", category: "caster", desc: { en: "AND THE CROWD GOES WILD! His voice shatters eardrums.", zh: "观众沸腾了！他的声音震碎耳膜。", th: "และฝูงชนก็คลั่ง! เสียงเขาทะลุแก้วหู" }, abilities: ["COMBO"], special: { name: "HYPE TRAIN", desc: "All allies gain +2 ATK this turn" } },
    { name: { en: "Pro Gamer Elite (420_N0SC0P3)", zh: "职业选手 (420_N0SC0P3)", th: "โปรเกมเมอร์ (420_N0SC0P3)" }, rarity: "legendary", category: "pro", desc: { en: "Sponsored by 7 energy drinks. Hasn't slept in 4 days.", zh: "被7个能量饮料品牌赞助。4天没睡了。", th: "7 แบรนด์สปอนเซอร์ ไม่ได้นอน 4 วัน" }, abilities: ["COMBO", "RANKED"], special: { name: "360 NO SCOPE", desc: "100% crit chance on first attack" } },
    { name: { en: "Team Captain IGL", zh: "队长 IGL", th: "กัปตันทีม IGL" }, rarity: "legendary", category: "pro", desc: { en: "His calls are law. The team moves as one.", zh: "他的指令就是法律。团队行动如一。", th: "คำสั่งของเขาคือกฎหมาย ทีมเคลื่อนไหวเป็นหนึ่งเดียว" }, abilities: ["TOURNAMENT"], special: { name: "SHOT CALLER", desc: "Choose which enemy card must attack next" } },
    { name: { en: "Underdog Hero", zh: "黑马英雄", th: "ฮีโร่ม้ามืด" }, rarity: "legendary", category: "pro", desc: { en: "Nobody expected them. Now everybody fears them.", zh: "没人预料到他们。现在所有人都怕他们。", th: "ไม่มีใครคาดคิด ตอนนี้ทุกคนกลัว" }, abilities: ["CLUTCH", "MVP"], special: { name: "UPSET", desc: "Deal triple damage to higher rarity cards" } },
    { name: { en: "Keyboard God", zh: "键盘之神", th: "เทพคีย์บอร์ด" }, rarity: "legendary", category: "pro", desc: { en: "Types so fast the keyboard catches fire. Literally.", zh: "打字快到键盘着火。真的。", th: "พิมพ์เร็วจนคีย์บอร์ดติดไฟ จริงๆ" }, abilities: ["COMBO", "COMBO"], special: { name: "APM OVERFLOW", desc: "Attack twice per turn" } },
    { name: { en: "Gamer Girl Bathwater", zh: "游戏女孩洗澡水", th: "Gamer Girl Bathwater" }, rarity: "legendary", category: "sponsor", desc: { en: "Sold out in 0.3 seconds. Worth $10,000.", zh: "0.3秒售罄。价值$10,000。", th: "ขายหมดใน 0.3 วินาที มูลค่า $10,000" }, abilities: ["MVP"], special: { name: "THIRST TRAP", desc: "Enemy cards must target this first" } },
    
    // EPICS
    { name: { en: "Energy Drink Elemental", zh: "能量饮料元素", th: "Energy Drink Elemental" }, rarity: "epic", category: "sponsor", desc: { en: "IS THIS EVEN LEGAL?! Yes. Barely.", zh: "这合法吗？！是的。勉强。", th: "นี่ถูกกฎหมายไหม?! ใช่ เฉียดฉิว" }, abilities: ["COMBO"], special: { name: "CAFFEINATED", desc: "+5 SPD permanently" } },
    { name: { en: "Toxic Teammate", zh: "毒队友", th: "เพื่อนร่วมทีมพิษ" }, rarity: "epic", category: "rival", desc: { en: "GG EZ. Uninstall. (Is the worst player)", zh: "GG EZ。卸载吧。（是最差的玩家）", th: "GG EZ ถอนการติดตั้ง (เป็นผู้เล่นที่แย่ที่สุด)" }, abilities: ["RANKED"], special: { name: "FLAME", desc: "Reduce ALL cards' ATK by 1" } },
    { name: { en: "Stream Sniper", zh: "蹲直播", th: "Stream Sniper" }, rarity: "epic", category: "rival", desc: { en: "Knows your every move. Because they're watching your stream.", zh: "知道你的每一步。因为他们在看你直播。", th: "รู้ทุกการเคลื่อนไหว เพราะดูสตรีมคุณ" }, abilities: ["RANKED"], special: { name: "GHOSTING", desc: "See enemy's hand permanently" } },
    { name: { en: "One Trick Pony", zh: "一招鲜", th: "One Trick Pony" }, rarity: "epic", category: "pro", desc: { en: "Only plays one character. Is terrifyingly good at it.", zh: "只玩一个角色。玩得可怕地好。", th: "เล่นแค่ตัวเดียว เก่งน่ากลัว" }, abilities: ["TOURNAMENT"], special: { name: "MASTERY", desc: "+4/+4 but can only attack one type" } },
    { name: { en: "Smurfer Supreme", zh: "小号大师", th: "สมูร์ฟเฟอร์สูงสุด" }, rarity: "epic", category: "rival", desc: { en: "Bronze rank. Diamond skills. Ruining games for fun.", zh: "青铜段位。钻石技术。为乐趣毁掉比赛。", th: "แรงค์บรอนซ์ ทักษะไดมอนด์" }, abilities: ["RANKED", "CLUTCH"], special: { name: "STOMP", desc: "Deal double damage to lower rarity" } },
    { name: { en: "Macro Master", zh: "宏观大师", th: "Macro Master" }, rarity: "epic", category: "coach", desc: { en: "Sees the whole board. Plans 10 moves ahead.", zh: "看到整个棋盘。提前计划10步。", th: "เห็นทั้งกระดาน วางแผนล่วงหน้า 10 ขั้นตอน" }, abilities: ["TOURNAMENT"], special: { name: "BIG BRAIN", desc: "Look at top 3 cards of enemy deck" } },
    { name: { en: "Micro Monster", zh: "微操怪物", th: "Micro Monster" }, rarity: "epic", category: "pro", desc: { en: "Perfect mechanics. Zero game sense. Still wins.", zh: "完美的机制。零游戏意识。仍然赢。", th: "กลศาสตร์สมบูรณ์แบบ ไม่มีเกมเซนส์ ยังชนะ" }, abilities: ["COMBO", "COMBO"], special: { name: "OUTPLAY", desc: "Dodge next attack, counter for equal damage" } },
    { name: { en: "Analyst Andy", zh: "分析师安迪", th: "Analyst Andy" }, rarity: "epic", category: "caster", desc: { en: "Has a spreadsheet for everything. EVERYTHING.", zh: "什么都有电子表格。什么都有。", th: "มีสเปรดชีตสำหรับทุกอย่าง ทุกอย่าง" }, abilities: ["TOURNAMENT"], special: { name: "STATS", desc: "Know exact HP of all enemy cards" } },
    { name: { en: "Content Creator", zh: "内容创作者", th: "Content Creator" }, rarity: "epic", category: "sponsor", desc: { en: "Like and subscribe! Don't forget the bell!", zh: "点赞订阅！别忘了铃铛！", th: "ไลค์และซับสคริบ! อย่าลืมกดกระดิ่ง!" }, abilities: ["MVP"], special: { name: "CLICKBAIT", desc: "Draw 2 cards if this kills an enemy" } },
    
    // RARES (15)
    { name: { en: "Rage Quitter", zh: "退游狂人", th: "Rage Quitter" }, rarity: "rare", category: "rival", desc: { en: "Can't lose if you quit first. *taps forehead*", zh: "先退出就不会输。*敲敲脑门*", th: "แพ้ไม่ได้ถ้าออกก่อน" }, abilities: ["CLUTCH"], special: { name: "DISCONNECT", desc: "Remove this card instead of being destroyed" } },
    { name: { en: "Hardstuck Player", zh: "卡段位玩家", th: "Hardstuck Player" }, rarity: "rare", category: "pro", desc: { en: "Been Diamond for 5 seasons. Team's fault.", zh: "在钻石5个赛季了。是队友的错。", th: "ติดไดมอนด์ 5 ซีซั่นแล้ว โทษทีม" }, abilities: ["RANKED"], special: { name: "TILT", desc: "Gains ATK when losing, loses ATK when winning" } },
    { name: { en: "Backseat Gamer", zh: "云玩家", th: "Backseat Gamer" }, rarity: "rare", category: "fan", desc: { en: "You should have done X! (Has never played)", zh: "你应该做X！（从没玩过）", th: "คุณควรทำ X! (ไม่เคยเล่น)" }, abilities: ["TOURNAMENT"], special: { name: "ADVICE", desc: "Tell ally which card to attack" } },
    { name: { en: "Meta Slave", zh: "版本答案奴隶", th: "Meta Slave" }, rarity: "rare", category: "pro", desc: { en: "Only plays what streamers play. No original thoughts.", zh: "只玩主播玩的。没有原创想法。", th: "เล่นแค่ที่สตรีมเมอร์เล่น" }, abilities: ["RANKED"], special: { name: "COPY BUILD", desc: "Copy enemy's highest ATK card's abilities" } },
    { name: { en: "Washed Up Pro", zh: "过气职业选手", th: "Washed Up Pro" }, rarity: "rare", category: "pro", desc: { en: "Was the best. Five years ago. Still talks about it.", zh: "曾经最强。五年前。还在说这事。", th: "เคยเก่งที่สุด ห้าปีก่อน ยังพูดอยู่" }, abilities: ["CLUTCH"], special: { name: "GLORY DAYS", desc: "First attack double damage, then -2 ATK" } },
    { name: { en: "Tournament Jitters", zh: "比赛紧张", th: "Tournament Jitters" }, rarity: "rare", category: "pro", desc: { en: "Rank 1 in practice. Rank last on stage.", zh: "练习第一名。比赛倒数第一。", th: "อันดับ 1 ในการซ้อม อันดับสุดท้ายบนเวที" }, abilities: ["TOURNAMENT"], special: { name: "CHOKE", desc: "50% miss when HP > 10" } },
    { name: { en: "LAN Champion", zh: "LAN冠军", th: "LAN Champion" }, rarity: "rare", category: "pro", desc: { en: "Unbeatable on LAN. Mediocre online. It's different!", zh: "LAN上无敌。线上一般。不一样的！", th: "เอาชนะไม่ได้บน LAN ออนไลน์ธรรมดา" }, abilities: ["TOURNAMENT", "CLUTCH"], special: { name: "NO LAG", desc: "+3 SPD in tournament mode" } },
    { name: { en: "Boosted Account", zh: "被代练的账号", th: "Boosted Account" }, rarity: "rare", category: "rival", desc: { en: "How did they get to this rank? We know.", zh: "他们怎么到这个段位的？我们知道。", th: "พวกเขาขึ้นมาถึงแรงค์นี้ได้ยังไง? เรารู้" }, abilities: ["RANKED"], special: { name: "CARRIED", desc: "Strong with allies, weak alone" } },
    { name: { en: "Highlight Reel", zh: "精彩集锦", th: "Highlight Reel" }, rarity: "rare", category: "caster", desc: { en: "The best moments. The worst cuts.", zh: "最好的时刻。最差的剪辑。", th: "ช่วงเวลาที่ดีที่สุด การตัดที่แย่ที่สุด" }, abilities: ["MVP"], special: { name: "SICK PLAY", desc: "On kill, +2/+2 permanently" } },
    { name: { en: "Patch Notes Reader", zh: "补丁说明读者", th: "Patch Notes Reader" }, rarity: "rare", category: "coach", desc: { en: "Actually reads the patch notes. Revolutionary.", zh: "真的读补丁说明。革命性的。", th: "อ่าน patch notes จริงๆ ปฏิวัติวงการ" }, abilities: ["TOURNAMENT"], special: { name: "INFORMED", desc: "Know all enemy abilities before combat" } },
    { name: { en: "Tilted Tower", zh: "倾斜塔", th: "Tilted Tower" }, rarity: "rare", category: "rival", desc: { en: "One loss becomes ten. Can't stop the spiral.", zh: "输一场变成输十场。停不下来的螺旋。", th: "แพ้หนึ่งกลายเป็นสิบ หยุดไม่ได้" }, abilities: ["CLUTCH"], special: { name: "SPIRAL", desc: "Each loss: +2 ATK, -1 HP" } },
    { name: { en: "Bronze to Challenger", zh: "青铜到王者", th: "Bronze to Challenger" }, rarity: "rare", category: "pro", desc: { en: "On an alt account. For the third time today.", zh: "用小号。今天第三次了。", th: "บนบัญชีรอง เป็นครั้งที่สามในวันนี้" }, abilities: ["RANKED", "COMBO"], special: { name: "SPEEDRUN", desc: "First 3 turns: +3 ATK" } },
    { name: { en: "Sponsor Money", zh: "赞助商金钱", th: "Sponsor Money" }, rarity: "rare", category: "sponsor", desc: { en: "Money doesn't buy skill. But it buys everything else.", zh: "钱买不到技术。但能买其他一切。", th: "เงินซื้อทักษะไม่ได้ แต่ซื้ออย่างอื่นได้" }, abilities: [], special: { name: "FUNDING", desc: "Pay HP to increase ATK" } },
    { name: { en: "Hype Man", zh: "气氛担当", th: "Hype Man" }, rarity: "rare", category: "fan", desc: { en: "LET'S GOOOO! POGCHAMP! SHEEEESH!", zh: "冲啊！POGCHAMP！SHEEEESH！", th: "ไปกันเลย! POGCHAMP! SHEEEESH!" }, abilities: ["COMBO"], special: { name: "MOMENTUM", desc: "Gain +1 ATK for each attack this turn" } },
    { name: { en: "Throwing for Content", zh: "为内容故意输", th: "Throwing for Content" }, rarity: "rare", category: "sponsor", desc: { en: "Chat wanted me to do it! *loses tournament*", zh: "聊天室让我做的！*输掉比赛*", th: "แชทอยากให้ทำ! *แพ้ทัวร์นาเมนต์*" }, abilities: ["MVP"], special: { name: "FOR THE VIEWS", desc: "Lose on purpose to draw 3 cards" } },
    
    // UNCOMMONS (15)
    { name: { en: "Filler Pick", zh: "补位选择", th: "Filler Pick" }, rarity: "uncommon", category: "pro", desc: { en: "Someone had to do it.", zh: "总得有人做。", th: "ใครสักคนต้องทำ" }, abilities: ["TOURNAMENT"], special: null },
    { name: { en: "Timebank Manager", zh: "时间管理者", th: "Timebank Manager" }, rarity: "uncommon", category: "coach", desc: { en: "Uses every second of the timer.", zh: "用尽计时器的每一秒。", th: "ใช้ทุกวินาทีของตัวจับเวลา" }, abilities: [], special: { name: "STALL", desc: "Delay enemy's next action" } },
    { name: { en: "Early GG", zh: "提前GG", th: "Early GG" }, rarity: "uncommon", category: "rival", desc: { en: "GG at minute 5. Game lasted 45 minutes.", zh: "第5分钟GG。比赛打了45分钟。", th: "GG นาทีที่ 5 เกมยาว 45 นาที" }, abilities: [], special: null },
    { name: { en: "Donation TTS", zh: "打赏语音", th: "Donation TTS" }, rarity: "uncommon", category: "fan", desc: { en: "Hi chat! Just wanted to say...", zh: "大家好！只想说...", th: "สวัสดีแชท! แค่อยากจะบอก..." }, abilities: [], special: null },
    { name: { en: "Pause Abuser", zh: "暂停滥用者", th: "Pause Abuser" }, rarity: "uncommon", category: "rival", desc: { en: "Technical issues! (Has perfect connection)", zh: "技术问题！（连接完美）", th: "ปัญหาทางเทคนิค! (เน็ตดีมาก)" }, abilities: [], special: { name: "TACTICAL PAUSE", desc: "Skip one enemy turn (once per game)" } },
    { name: { en: "Warm Up Game", zh: "热身赛", th: "Warm Up Game" }, rarity: "uncommon", category: "pro", desc: { en: "Just warming up! (Played for 8 hours)", zh: "只是在热身！（已经玩了8小时）", th: "แค่อุ่นเครื่อง! (เล่นมา 8 ชั่วโมงแล้ว)" }, abilities: ["TOURNAMENT"], special: null },
    { name: { en: "Rank Anxiety", zh: "排位焦虑", th: "Rank Anxiety" }, rarity: "uncommon", category: "pro", desc: { en: "One game from promo. Can't click the button.", zh: "距离晋级一场。不敢点按钮。", th: "อีกเกมเดียวถึงโปรโมต กดปุ่มไม่ลง" }, abilities: ["CLUTCH"], special: null },
    { name: { en: "Queue Snacks", zh: "排队零食", th: "Queue Snacks" }, rarity: "uncommon", category: "fan", desc: { en: "5 minute queue time? Time for a meal.", zh: "5分钟排队时间？吃顿饭的时间。", th: "คิว 5 นาที? ถึงเวลากินข้าว" }, abilities: [], special: null },
    { name: { en: "Gaming Chair Upgrade", zh: "电竞椅升级", th: "Gaming Chair Upgrade" }, rarity: "uncommon", category: "sponsor", desc: { en: "Adds +50 skill points. Guaranteed.", zh: "增加50技能点。保证。", th: "เพิ่ม +50 สกิลพอยต์ รับประกัน" }, abilities: [], special: null },
    { name: { en: "Mute All Chat", zh: "屏蔽所有聊天", th: "Mute All Chat" }, rarity: "uncommon", category: "pro", desc: { en: "Peace at last. Until you unmute.", zh: "终于安静了。直到你取消屏蔽。", th: "สงบสุขในที่สุด จนกว่าจะ unmute" }, abilities: [], special: null },
    { name: { en: "Bracket Reset", zh: "重置赛程", th: "Bracket Reset" }, rarity: "uncommon", category: "coach", desc: { en: "Back to square one. Again.", zh: "回到起点。又一次。", th: "กลับสู่จุดเริ่มต้น อีกครั้ง" }, abilities: ["TOURNAMENT"], special: null },
    { name: { en: "Replay Review", zh: "回放复盘", th: "Replay Review" }, rarity: "uncommon", category: "coach", desc: { en: "Here's where you made 847 mistakes.", zh: "这是你犯的847个错误。", th: "นี่คือที่คุณทำผิด 847 ครั้ง" }, abilities: [], special: null },
    { name: { en: "Discord Pings", zh: "Discord提醒", th: "Discord Pings" }, rarity: "uncommon", category: "fan", desc: { en: "@everyone @everyone @everyone", zh: "@everyone @everyone @everyone", th: "@everyone @everyone @everyone" }, abilities: [], special: null },
    { name: { en: "Scrim Results", zh: "训练赛结果", th: "Scrim Results" }, rarity: "uncommon", category: "coach", desc: { en: "Won 5 scrims. Lost the tournament.", zh: "赢了5场训练赛。输了正赛。", th: "ชนะ 5 scrim แพ้ทัวร์นาเมนต์" }, abilities: ["TOURNAMENT"], special: null },
    { name: { en: "Post-Match Interview", zh: "赛后采访", th: "Post-Match Interview" }, rarity: "uncommon", category: "caster", desc: { en: "Thanks to my sponsors. And water.", zh: "感谢我的赞助商。和水。", th: "ขอบคุณสปอนเซอร์ และน้ำ" }, abilities: ["MVP"], special: null },
    
    // COMMONS (20)
    { name: { en: "GG WP Bot", zh: "GG WP机器人", th: "GG WP Bot" }, rarity: "common", category: "fan", desc: { en: "Good game, well played!", zh: "打得好，玩得好！", th: "เกมดี เล่นเก่ง!" }, abilities: [], special: null },
    { name: { en: "Salty Loser", zh: "输不起的人", th: "Salty Loser" }, rarity: "common", category: "rival", desc: { en: "Reports everyone after every loss.", zh: "每次输了都举报所有人。", th: "รายงานทุกคนหลังแพ้" }, abilities: [], special: null },
    { name: { en: "Noob", zh: "菜鸟", th: "Noob" }, rarity: "common", category: "fan", desc: { en: "We all started somewhere.", zh: "我们都是从某处开始的。", th: "เราทุกคนเริ่มต้นจากที่ไหนสักแห่ง" }, abilities: [], special: null },
    { name: { en: "AFK Player", zh: "AFK玩家", th: "AFK Player" }, rarity: "common", category: "rival", desc: { en: "BRB, mom called.", zh: "我去一下，妈妈叫我。", th: "เดี๋ยวกลับมา แม่เรียก" }, abilities: [], special: null },
    { name: { en: "Tutorial Bot", zh: "教程机器人", th: "Tutorial Bot" }, rarity: "common", category: "coach", desc: { en: "Press A to attack!", zh: "按A攻击！", th: "กด A เพื่อโจมตี!" }, abilities: [], special: null },
    { name: { en: "Queue Dodge", zh: "躲排位", th: "Queue Dodge" }, rarity: "common", category: "rival", desc: { en: "Saw your name. Nope.", zh: "看到你的名字了。算了。", th: "เห็นชื่อคุณ ไม่เอา" }, abilities: [], special: null },
    { name: { en: "Participation Trophy", zh: "参与奖", th: "Participation Trophy" }, rarity: "common", category: "fan", desc: { en: "You tried!", zh: "你尝试了！", th: "คุณพยายามแล้ว!" }, abilities: [], special: null },
    { name: { en: "Loading Screen Tip", zh: "加载屏幕提示", th: "Loading Screen Tip" }, rarity: "common", category: "coach", desc: { en: "Did you know? You can attack enemies!", zh: "你知道吗？你可以攻击敌人！", th: "รู้ไหม? คุณสามารถโจมตีศัตรูได้!" }, abilities: [], special: null },
    { name: { en: "One More Game", zh: "再来一局", th: "One More Game" }, rarity: "common", category: "fan", desc: { en: "It's 4 AM. Just one more.", zh: "凌晨4点了。就再来一局。", th: "ตี 4 แล้ว อีกแค่เกมเดียว" }, abilities: [], special: null },
    { name: { en: "Practice Tool", zh: "练习工具", th: "Practice Tool" }, rarity: "common", category: "coach", desc: { en: "Infinite mana. Infinite time.", zh: "无限法力。无限时间。", th: "มานาไม่จำกัด เวลาไม่จำกัด" }, abilities: [], special: null },
    { name: { en: "Lost Promo", zh: "输掉晋级赛", th: "Lost Promo" }, rarity: "common", category: "pro", desc: { en: "0-3. Back to grinding.", zh: "0-3。继续肝。", th: "0-3 กลับไปฟาร์มใหม่" }, abilities: [], special: null },
    { name: { en: "Win Streak", zh: "连胜", th: "Win Streak" }, rarity: "common", category: "pro", desc: { en: "5 wins. Queue again? Lose 6 in a row.", zh: "5连胜。再排？连输6场。", th: "ชนะ 5 จัดอีกไหม? แพ้ 6 ติด" }, abilities: [], special: null },
    { name: { en: "Ping Spam", zh: "疯狂Ping", th: "Ping Spam" }, rarity: "common", category: "rival", desc: { en: "? ? ? ? ? ? ?", zh: "? ? ? ? ? ? ?", th: "? ? ? ? ? ? ?" }, abilities: [], special: null },
    { name: { en: "Emote Spam", zh: "表情包刷屏", th: "Emote Spam" }, rarity: "common", category: "rival", desc: { en: "BM at its finest.", zh: "BM的最高境界。", th: "BM ระดับสูงสุด" }, abilities: [], special: null },
    { name: { en: "Lucky Crit", zh: "幸运暴击", th: "Lucky Crit" }, rarity: "common", category: "pro", desc: { en: "0.01% chance? First try.", zh: "0.01%几率？第一次就中。", th: "โอกาส 0.01%? ครั้งแรกโดน" }, abilities: [], special: null },
    { name: { en: "Missed Skillshot", zh: "失误技能", th: "Missed Skillshot" }, rarity: "common", category: "pro", desc: { en: "It happens. 17 times in a row.", zh: "会发生的。连续17次。", th: "มันเกิดขึ้น 17 ครั้งติดกัน" }, abilities: [], special: null },
    { name: { en: "Connection Issues", zh: "连接问题", th: "Connection Issues" }, rarity: "common", category: "rival", desc: { en: "Lag! (Has perfect ping)", zh: "卡！（Ping完美）", th: "แลค! (Ping สมบูรณ์แบบ)" }, abilities: [], special: null },
    { name: { en: "Team Diff", zh: "队伍差距", th: "Team Diff" }, rarity: "common", category: "rival", desc: { en: "GG jungle diff.", zh: "GG打野差距。", th: "GG jungle diff" }, abilities: [], special: null },
    { name: { en: "Rank Reset", zh: "段位重置", th: "Rank Reset" }, rarity: "common", category: "pro", desc: { en: "New season. Back to bronze.", zh: "新赛季。回到青铜。", th: "ซีซั่นใหม่ กลับไปบรอนซ์" }, abilities: [], special: null },
    { name: { en: "Warm Hands", zh: "热手", th: "Warm Hands" }, rarity: "common", category: "pro", desc: { en: "Hands finally warmed up. Queue ends.", zh: "手终于热了。排队结束了。", th: "มือร้อนแล้ว คิวหมด" }, abilities: [], special: null }
  ]
};

// ============================================
// SEASON 6: WHALE WARS
// ============================================
const SEASON_6 = {
  id: 6,
  name: "Whale Wars",
  subtitle: "Money Talks",
  theme: "economy",
  icon: "🐋",
  color: "#00d4aa",
  bgGradient: "linear-gradient(135deg, #00d4aa, #0077b6)",
  lore: {
    title: "The Platinum Club",
    leader: "Mega Whale Supreme",
    setting: "The richest players unite. They have unlimited resources, exclusive skins, and the devs on speed dial."
  },
  mechanics: {
    PREMIUM: { desc: "Costs gold instead of mana" },
    WHALE: { desc: "Power scales with money spent" },
    P2W: { desc: "Automatically win ties" },
    GACHA_LUCK: { desc: "Better pull rates" },
    REFUND: { desc: "Return to hand, gain gold" }
  },
  categories: ["whale", "dolphin", "minnow", "f2p", "dev", "shop"],
  cards: [
    // MYTHICS
    { name: { en: "Mega Whale Supreme", zh: "超级氪金巨鲸", th: "วาฬยักษ์สูงสุด" }, rarity: "mythic", category: "whale", desc: { en: "Spent $500,000. Still doesn't have the rare skin.", zh: "花了50万美元。仍然没有稀有皮肤。", th: "ใช้ไป $500,000 ยังไม่มีสกินหายาก" }, abilities: ["WHALE", "P2W"], special: { name: "INFINITE MONEY", desc: "Play any card for free once per turn" } },
    { name: { en: "Golden RegginA", zh: "黄金RegginA", th: "RegginA ทอง" }, rarity: "mythic", category: "whale", desc: { en: "24 karat gold plating. Limited to 1 copy.", zh: "24克拉金镀层。限量1张。", th: "ชุบทอง 24 กะรัต จำกัด 1 ใบ" }, abilities: ["PREMIUM", "WHALE"], special: { name: "EXCLUSIVE", desc: "Cannot be countered or negated" } },
    
    // LEGENDARIES
    { name: { en: "Credit Card Warrior", zh: "信用卡战士", th: "นักรบบัตรเครดิต" }, rarity: "legendary", category: "whale", desc: { en: "Swipe. Swipe. Swipe. Declined. Calls bank. Swipe.", zh: "刷。刷。刷。被拒。打银行电话。刷。", th: "รูด รูด รูด ถูกปฏิเสธ โทรธนาคาร รูด" }, abilities: ["PREMIUM", "P2W"], special: { name: "UNLIMITED", desc: "No card costs for 3 turns" } },
    { name: { en: "VIP Exclusive Member", zh: "VIP专属会员", th: "สมาชิก VIP Exclusive" }, rarity: "legendary", category: "whale", desc: { en: "$99.99/month. Access to slightly different colors.", zh: "每月$99.99。可使用略微不同的配色。", th: "$99.99/เดือน เข้าถึงสีที่ต่างนิดหน่อย" }, abilities: ["PREMIUM", "GACHA_LUCK"], special: { name: "MEMBERS ONLY", desc: "Draw an extra card each turn" } },
    { name: { en: "Gacha God", zh: "抽卡之神", th: "เทพกาชา" }, rarity: "legendary", category: "whale", desc: { en: "0.001% drop rate? First try. Every time.", zh: "0.001%掉率？第一次就中。每次都是。", th: "อัตราดรอป 0.001%? ได้ครั้งแรก ทุกครั้ง" }, abilities: ["GACHA_LUCK", "GACHA_LUCK"], special: { name: "DIVINE PULL", desc: "Draw cards until you get a Legendary" } },
    { name: { en: "Cash Shop King", zh: "商城之王", th: "ราชาร้านค้าเงินสด" }, rarity: "legendary", category: "shop", desc: { en: "Owns every skin, mount, and pet. Still feels empty.", zh: "拥有每个皮肤、坐骑和宠物。内心仍然空虚。", th: "มีทุกสกิน พาหนะ และสัตว์เลี้ยง ยังรู้สึกว่างเปล่าภายใน" }, abilities: ["WHALE", "PREMIUM"], special: { name: "COMPLETIONIST", desc: "+1/+1 for each card type you own" } },
    { name: { en: "Dolphin Diplomat", zh: "海豚外交官", th: "ทูตโลมา" }, rarity: "legendary", category: "dolphin", desc: { en: "Spends responsibly. Just $200 a month.", zh: "理性消费。每月只花200美元。", th: "ใช้จ่ายอย่างมีความรับผิดชอบ แค่ $200/เดือน" }, abilities: ["PREMIUM", "REFUND"], special: { name: "BUDGETED", desc: "Gain 1 gold per turn" } },
    { name: { en: "Predatory Monetization", zh: "掠夺性货币化", th: "Predatory Monetization" }, rarity: "legendary", category: "dev", desc: { en: "It's not gambling if we call it surprise mechanics!", zh: "如果我们叫它惊喜机制，那就不是赌博！", th: "ไม่ใช่การพนันถ้าเราเรียกมันว่ากลไกเซอร์ไพรส์!" }, abilities: ["P2W"], special: { name: "SURPRISE", desc: "Force enemy to pay costs twice" } },
    
    // EPICS
    { name: { en: "Battle Pass Baron", zh: "战斗通行证男爵", th: "บารอน Battle Pass" }, rarity: "epic", category: "whale", desc: { en: "Tier 100 on day one. Worth the $150.", zh: "第一天就100级。值150美元。", th: "เทียร์ 100 วันแรก คุ้มค่า $150" }, abilities: ["PREMIUM"], special: { name: "TIER SKIP", desc: "Skip enemy's next turn" } },
    { name: { en: "Loot Box Addict", zh: "宝箱成瘾者", th: "Loot Box Addict" }, rarity: "epic", category: "whale", desc: { en: "Just one more box. One more. One more.", zh: "再开一个箱子。再一个。再一个。", th: "อีกแค่กล่องเดียว อีก อีก" }, abilities: ["GACHA_LUCK"], special: { name: "GAMBLER", desc: "Open a random rarity card" } },
    { name: { en: "Founder's Pack Owner", zh: "创始人包拥有者", th: "เจ้าของ Founder's Pack" }, rarity: "epic", category: "whale", desc: { en: "Backed the Kickstarter. Game 5 years late.", zh: "支持了众筹。游戏晚了5年发布。", th: "สนับสนุน Kickstarter เกมออกช้า 5 ปี" }, abilities: ["PREMIUM", "REFUND"], special: { name: "EARLY ACCESS", desc: "Play cards 1 turn earlier" } },
    { name: { en: "Cosmetic Collector", zh: "外观收集者", th: "Cosmetic Collector" }, rarity: "epic", category: "whale", desc: { en: "1,847 skins. Uses the default one.", zh: "1,847个皮肤。用默认的。", th: "1,847 สกิน ใช้ค่าเริ่มต้น" }, abilities: ["WHALE"], special: { name: "FASHIONABLE", desc: "+2/+2 if more card types than enemy" } },
    { name: { en: "F2P BTW", zh: "我是免费玩家", th: "F2P BTW" }, rarity: "epic", category: "f2p", desc: { en: "Completely free to play! (800 hours grinding)", zh: "完全免费！（肝了800小时）", th: "เล่นฟรีทั้งหมด! (ฟาร์ม 800 ชั่วโมง)" }, abilities: [], special: { name: "GRINDER", desc: "+1/+1 each turn you don't spend gold" } },
    { name: { en: "Minnow Martyr", zh: "小鱼烈士", th: "Minnow Martyr" }, rarity: "epic", category: "minnow", desc: { en: "Just $5. That's nothing! $5 more won't hurt...", zh: "只有5美元。那不算什么！再花5美元也没关系...", th: "แค่ $5 นั่นไม่มีอะไร! อีก $5 ไม่เจ็บ..." }, abilities: ["PREMIUM"], special: { name: "SLIPPERY SLOPE", desc: "Must play another PREMIUM card after this" } },
    { name: { en: "Bundle Buyer", zh: "捆绑购买者", th: "Bundle Buyer" }, rarity: "epic", category: "shop", desc: { en: "70% off! Only $49.99! (Contains $3 of items)", zh: "七折！仅$49.99！（包含$3的物品）", th: "ลด 70%! เพียง $49.99! (มีของมูลค่า $3)" }, abilities: ["REFUND"], special: { name: "DEAL", desc: "Play 2 cards for cost of 1" } },
    { name: { en: "Pay Pig", zh: "付费猪", th: "Pay Pig" }, rarity: "epic", category: "whale", desc: { en: "Exists to fund the game for everyone else.", zh: "存在是为了给其他人资助游戏。", th: "มีอยู่เพื่อให้ทุนเกมสำหรับคนอื่น" }, abilities: ["WHALE", "P2W"], special: { name: "FUNDING", desc: "Pay 5 HP to draw 3 cards" } },
    { name: { en: "Microtransaction Monster", zh: "微交易怪物", th: "Microtransaction Monster" }, rarity: "epic", category: "shop", desc: { en: "$0.99 here, $1.99 there... total: $3,847", zh: "这里$0.99，那里$1.99...总计：$3,847", th: "$0.99 ที่นี่ $1.99 ที่นั่น... รวม: $3,847" }, abilities: ["PREMIUM"], special: { name: "NICKEL AND DIME", desc: "Deal 1 damage 10 times" } },
    { name: { en: "Flash Sale Panic", zh: "限时抢购恐慌", th: "Flash Sale Panic" }, rarity: "epic", category: "shop", desc: { en: "Only 2 hours left! (Comes back every week)", zh: "只剩2小时！（每周都会来）", th: "เหลืออีก 2 ชั่วโมง! (กลับมาทุกสัปดาห์)" }, abilities: ["PREMIUM"], special: { name: "FOMO", desc: "Enemy must play next card immediately" } },
    
    // RARES (15)
    { name: { en: "Discount Hunter", zh: "折扣猎手", th: "Discount Hunter" }, rarity: "rare", category: "minnow", desc: { en: "Never pays full price. Waits for sales.", zh: "从不付全价。等打折。", th: "ไม่เคยจ่ายเต็ม รอลดราคา" }, abilities: ["REFUND"], special: { name: "SALE", desc: "Cards cost 1 less" } },
    { name: { en: "Currency Converter", zh: "货币转换器", th: "Currency Converter" }, rarity: "rare", category: "shop", desc: { en: "1000 gems = 100 coins = 10 tokens = $1", zh: "1000宝石 = 100金币 = 10代币 = $1", th: "1000 gems = 100 coins = 10 tokens = $1" }, abilities: [], special: { name: "EXCHANGE", desc: "Convert damage to healing" } },
    { name: { en: "Regret Purchase", zh: "后悔购买", th: "Regret Purchase" }, rarity: "rare", category: "whale", desc: { en: "Why did I buy this? Oh well.", zh: "我为什么买这个？算了。", th: "ทำไมฉันถึงซื้ออันนี้? ช่างมัน" }, abilities: ["REFUND"], special: { name: "BUYER'S REMORSE", desc: "Return to hand, enemy discards" } },
    { name: { en: "Free Trial Expired", zh: "免费试用已过期", th: "Free Trial Expired" }, rarity: "rare", category: "dev", desc: { en: "PLEASE SUBSCRIBE TO CONTINUE", zh: "请订阅以继续", th: "กรุณาสมัครสมาชิกเพื่อดำเนินการต่อ" }, abilities: ["PREMIUM"], special: { name: "PAYWALL", desc: "Enemy must pay to attack" } },
    { name: { en: "Whale Hunter", zh: "猎鲸者", th: "Whale Hunter" }, rarity: "rare", category: "f2p", desc: { en: "Targets whales specifically. For honor.", zh: "专门针对大R。为了荣誉。", th: "ล่าวาฬโดยเฉพาะ เพื่อเกียรติยศ" }, abilities: [], special: { name: "ANTI-WHALE", desc: "Deal double damage to PREMIUM cards" } },
    { name: { en: "Budget Gamer", zh: "预算玩家", th: "Budget Gamer" }, rarity: "rare", category: "minnow", desc: { en: "Max $10/month. No exceptions. (Except sales.)", zh: "每月最多$10。没有例外。（除了打折。）", th: "สูงสุด $10/เดือน ไม่มีข้อยกเว้น (ยกเว้นลดราคา)" }, abilities: ["PREMIUM"], special: { name: "FRUGAL", desc: "Draw 2 if you spent no gold last turn" } },
    { name: { en: "Pity Pull", zh: "保底抽", th: "Pity Pull" }, rarity: "rare", category: "whale", desc: { en: "90 pulls for guaranteed 5-star. Worth it?", zh: "90抽保底5星。值吗？", th: "90 ครั้งได้ 5 ดาวแน่นอน คุ้มไหม?" }, abilities: ["GACHA_LUCK"], special: { name: "GUARANTEED", desc: "After 5 draws, next draw is Legendary" } },
    { name: { en: "Daily Login Reward", zh: "每日登录奖励", th: "Daily Login Reward" }, rarity: "rare", category: "shop", desc: { en: "Day 1: 100 gold. Day 365: 101 gold.", zh: "第1天：100金。第365天：101金。", th: "วันที่ 1: 100 gold วันที่ 365: 101 gold" }, abilities: [], special: { name: "STREAK", desc: "+1/+1 each consecutive turn played" } },
    { name: { en: "Refund Request", zh: "退款申请", th: "Refund Request" }, rarity: "rare", category: "dolphin", desc: { en: "It's not what I expected. I want my money back.", zh: "这不是我期望的。我要退款。", th: "มันไม่ใช่สิ่งที่ฉันคาดหวัง ฉันต้องการเงินคืน" }, abilities: ["REFUND"], special: { name: "CHARGEBACK", desc: "Destroy this, gain 5 gold" } },
    { name: { en: "Limited Edition", zh: "限定版", th: "Limited Edition" }, rarity: "rare", category: "shop", desc: { en: "Never coming back! (Comes back every month)", zh: "绝不返场！（每个月都返场）", th: "ไม่กลับมาอีก! (กลับมาทุกเดือน)" }, abilities: ["PREMIUM"], special: { name: "EXCLUSIVE?", desc: "+3/+3 first time played this game" } },
    { name: { en: "Starter Pack", zh: "新手礼包", th: "Starter Pack" }, rarity: "rare", category: "shop", desc: { en: "Best value! Buy now before it's too late!", zh: "超值！趁现在还来得及赶紧买！", th: "คุ้มค่าที่สุด! ซื้อเลยก่อนสาย!" }, abilities: ["PREMIUM"], special: { name: "BEGINNER BONUS", desc: "Costs half on first play" } },
    { name: { en: "Anniversary Sale", zh: "周年庆特卖", th: "Anniversary Sale" }, rarity: "rare", category: "shop", desc: { en: "Celebrating by taking your money!", zh: "用你的钱来庆祝！", th: "ฉลองด้วยการเอาเงินคุณ!" }, abilities: ["PREMIUM", "GACHA_LUCK"], special: { name: "CELEBRATION", desc: "All cards cost 2 less this turn" } },
    { name: { en: "Subscription Model", zh: "订阅模式", th: "Subscription Model" }, rarity: "rare", category: "dev", desc: { en: "Monthly fee for things that used to be free.", zh: "为曾经免费的东西付月费。", th: "ค่าธรรมเนียมรายเดือนสำหรับสิ่งที่เคยฟรี" }, abilities: ["PREMIUM"], special: { name: "RECURRING", desc: "Pay 1 HP each turn, gain +1/+1" } },
    { name: { en: "Investor Board", zh: "投资者董事会", th: "Investor Board" }, rarity: "rare", category: "dev", desc: { en: "Players are not customers, they're the product.", zh: "玩家不是客户，他们是产品。", th: "ผู้เล่นไม่ใช่ลูกค้า พวกเขาคือสินค้า" }, abilities: ["P2W"], special: { name: "MONETIZE", desc: "Gain 1 gold for each damage dealt" } },
    { name: { en: "Sunk Cost Fallacy", zh: "沉没成本谬误", th: "Sunk Cost Fallacy" }, rarity: "rare", category: "whale", desc: { en: "Can't quit now. Already spent too much.", zh: "现在不能退出了。已经花太多了。", th: "เลิกไม่ได้แล้ว ใช้ไปเยอะแล้ว" }, abilities: ["WHALE"], special: { name: "TOO DEEP", desc: "The more you spend, the stronger this gets" } },
    
    // UNCOMMONS (15)
    { name: { en: "Limited Time Offer", zh: "限时优惠", th: "Limited Time Offer" }, rarity: "uncommon", category: "shop", desc: { en: "ACT NOW! (Available indefinitely)", zh: "现在行动！（无限期可用）", th: "ซื้อเลย! (มีให้ตลอด)" }, abilities: [], special: null },
    { name: { en: "Premium Currency", zh: "高级货币", th: "Premium Currency" }, rarity: "uncommon", category: "shop", desc: { en: "Can only be bought with real money.", zh: "只能用真钱购买。", th: "ซื้อได้ด้วยเงินจริงเท่านั้น" }, abilities: ["PREMIUM"], special: null },
    { name: { en: "Ad Watcher", zh: "看广告的人", th: "Ad Watcher" }, rarity: "uncommon", category: "f2p", desc: { en: "Watch 50 ads for 1 gold. Worth it!", zh: "看50个广告换1金币。值得！", th: "ดูโฆษณา 50 ครั้งได้ 1 gold คุ้ม!" }, abilities: [], special: null },
    { name: { en: "Special Offer Pop-up", zh: "特惠弹窗", th: "Special Offer Pop-up" }, rarity: "uncommon", category: "shop", desc: { en: "70% OFF! (Of 10x the normal price)", zh: "七折！（原价的10倍）", th: "ลด 70%! (ของราคาปกติ 10 เท่า)" }, abilities: [], special: null },
    { name: { en: "Energy System", zh: "体力系统", th: "Energy System" }, rarity: "uncommon", category: "dev", desc: { en: "Play 5 games, then wait 4 hours. Or pay.", zh: "玩5局，然后等4小时。或者付钱。", th: "เล่น 5 เกม แล้วรอ 4 ชั่วโมง หรือจ่ายเงิน" }, abilities: [], special: null },
    { name: { en: "Loot Box", zh: "宝箱", th: "Loot Box" }, rarity: "uncommon", category: "shop", desc: { en: "Contains random items! (Mostly commons)", zh: "包含随机物品！（大部分是白色）", th: "มีของสุ่ม! (ส่วนใหญ่ common)" }, abilities: ["GACHA_LUCK"], special: null },
    { name: { en: "Seasonal Pass", zh: "赛季通行证", th: "Seasonal Pass" }, rarity: "uncommon", category: "shop", desc: { en: "New season, new pass, new $30.", zh: "新赛季，新通行证，新的$30。", th: "ซีซั่นใหม่ pass ใหม่ $30 ใหม่" }, abilities: ["PREMIUM"], special: null },
    { name: { en: "Inventory Expander", zh: "背包扩展", th: "Inventory Expander" }, rarity: "uncommon", category: "shop", desc: { en: "+10 slots for just $9.99!", zh: "+10格只要$9.99！", th: "+10 ช่องเพียง $9.99!" }, abilities: [], special: null },
    { name: { en: "Name Change", zh: "改名卡", th: "Name Change" }, rarity: "uncommon", category: "shop", desc: { en: "$10 to change your name. Letters extra.", zh: "$10改名。字母另算。", th: "$10 เปลี่ยนชื่อ ตัวอักษรจ่ายเพิ่ม" }, abilities: [], special: null },
    { name: { en: "Skin Fragment", zh: "皮肤碎片", th: "Skin Fragment" }, rarity: "uncommon", category: "shop", desc: { en: "Collect 1000 for one skin!", zh: "收集1000个换一个皮肤！", th: "สะสม 1000 ได้สกินหนึ่ง!" }, abilities: [], special: null },
    { name: { en: "Double Gold Booster", zh: "双倍金币加成", th: "Double Gold Booster" }, rarity: "uncommon", category: "shop", desc: { en: "Double gold for 3 hours! Only $4.99!", zh: "双倍金币3小时！只要$4.99！", th: "gold สองเท่า 3 ชั่วโมง! เพียง $4.99!" }, abilities: [], special: null },
    { name: { en: "XP Boost", zh: "经验加成", th: "XP Boost" }, rarity: "uncommon", category: "shop", desc: { en: "Level faster! For a price.", zh: "升级更快！要付钱。", th: "เลเวลเร็วขึ้น! แต่ต้องจ่ายเงิน" }, abilities: [], special: null },
    { name: { en: "Lucky Spinner", zh: "幸运转盘", th: "Lucky Spinner" }, rarity: "uncommon", category: "shop", desc: { en: "Spin to win! (Always lands on smallest prize)", zh: "转动赢大奖！（总是转到最小的奖品）", th: "หมุนเพื่อชนะ! (ลงรางวัลเล็กสุดเสมอ)" }, abilities: ["GACHA_LUCK"], special: null },
    { name: { en: "Event Currency", zh: "活动货币", th: "Event Currency" }, rarity: "uncommon", category: "shop", desc: { en: "Expires in 7 days. Better use it fast.", zh: "7天后过期。最好快点用。", th: "หมดอายุใน 7 วัน ใช้ให้เร็วดีกว่า" }, abilities: [], special: null },
    { name: { en: "Cosmetic Bundle", zh: "外观礼包", th: "Cosmetic Bundle" }, rarity: "uncommon", category: "shop", desc: { en: "Hat, cape, and dance for only $29.99!", zh: "帽子、披风和舞蹈只要$29.99！", th: "หมวก เสื้อคลุม และท่าเต้นเพียง $29.99!" }, abilities: [], special: null },
    
    // COMMONS (20)
    { name: { en: "In-Game Currency", zh: "游戏内货币", th: "In-Game Currency" }, rarity: "common", category: "shop", desc: { en: "Worth nothing in real life.", zh: "在现实中一文不值。", th: "ไม่มีค่าในชีวิตจริง" }, abilities: [], special: null },
    { name: { en: "Free Chest", zh: "免费宝箱", th: "Free Chest" }, rarity: "common", category: "shop", desc: { en: "Contains: disappointment.", zh: "包含：失望。", th: "มี: ความผิดหวัง" }, abilities: [], special: null },
    { name: { en: "Daily Quest", zh: "每日任务", th: "Daily Quest" }, rarity: "common", category: "f2p", desc: { en: "Win 10 games for 5 gold.", zh: "赢10场得5金币。", th: "ชนะ 10 เกมได้ 5 gold" }, abilities: [], special: null },
    { name: { en: "Weekly Bonus", zh: "每周奖励", th: "Weekly Bonus" }, rarity: "common", category: "f2p", desc: { en: "Log in for 7 days straight!", zh: "连续登录7天！", th: "ล็อกอิน 7 วันติดกัน!" }, abilities: [], special: null },
    { name: { en: "Bronze Pack", zh: "青铜礼包", th: "Bronze Pack" }, rarity: "common", category: "shop", desc: { en: "The cheapest option. For a reason.", zh: "最便宜的选择。有原因的。", th: "ตัวเลือกที่ถูกที่สุด มีเหตุผล" }, abilities: [], special: null },
    { name: { en: "Dust", zh: "尘埃", th: "Dust" }, rarity: "common", category: "shop", desc: { en: "Salvaged from unwanted cards.", zh: "从不想要的卡牌中回收。", th: "กู้คืนจากการ์ดที่ไม่ต้องการ" }, abilities: [], special: null },
    { name: { en: "Common Drop", zh: "普通掉落", th: "Common Drop" }, rarity: "common", category: "shop", desc: { en: "What you always get. Always.", zh: "你总是得到的。总是。", th: "สิ่งที่คุณได้เสมอ เสมอ" }, abilities: [], special: null },
    { name: { en: "Gacha Salt", zh: "抽卡怨气", th: "Gacha Salt" }, rarity: "common", category: "whale", desc: { en: "10 pulls. 10 commons. Rage.", zh: "10抽。10个白色。愤怒。", th: "10 ครั้ง 10 common โมโห" }, abilities: [], special: null },
    { name: { en: "Loading Screen Ad", zh: "加载广告", th: "Loading Screen Ad" }, rarity: "common", category: "dev", desc: { en: "Watch this 30 second unskippable ad!", zh: "观看这个30秒不可跳过的广告！", th: "ดูโฆษณา 30 วินาทีข้ามไม่ได้!" }, abilities: [], special: null },
    { name: { en: "Cooldown Timer", zh: "冷却计时器", th: "Cooldown Timer" }, rarity: "common", category: "dev", desc: { en: "Wait 4 hours. Or pay to skip.", zh: "等4小时。或者付钱跳过。", th: "รอ 4 ชั่วโมง หรือจ่ายเพื่อข้าม" }, abilities: [], special: null },
    { name: { en: "Duplicate Card", zh: "重复卡牌", th: "Duplicate Card" }, rarity: "common", category: "shop", desc: { en: "You already have 47 of these.", zh: "你已经有47张这个了。", th: "คุณมี 47 ใบแล้ว" }, abilities: [], special: null },
    { name: { en: "Tutorial Skip", zh: "跳过教程", th: "Tutorial Skip" }, rarity: "common", category: "dev", desc: { en: "Skip tutorial for $0.99!", zh: "跳过教程只要$0.99！", th: "ข้ามทิวทอเรียลเพียง $0.99!" }, abilities: [], special: null },
    { name: { en: "Base Skin", zh: "基础皮肤", th: "Base Skin" }, rarity: "common", category: "shop", desc: { en: "The ugly free one everyone starts with.", zh: "每个人开始时都有的丑免费皮肤。", th: "สกินฟรีที่น่าเกลียดที่ทุกคนเริ่มต้นด้วย" }, abilities: [], special: null },
    { name: { en: "F2P Pain", zh: "免费玩家的痛", th: "F2P Pain" }, rarity: "common", category: "f2p", desc: { en: "1000 hours of grinding. Still behind.", zh: "肝了1000小时。仍然落后。", th: "ฟาร์ม 1000 ชั่วโมง ยังตามหลัง" }, abilities: [], special: null },
    { name: { en: "Wallet Status", zh: "钱包状态", th: "Wallet Status" }, rarity: "common", category: "whale", desc: { en: "Current balance: regret.", zh: "当前余额：后悔。", th: "ยอดเงินคงเหลือ: ความเสียใจ" }, abilities: [], special: null },
    { name: { en: "Price Increase", zh: "涨价", th: "Price Increase" }, rarity: "common", category: "dev", desc: { en: "Inflation hits the game too.", zh: "通货膨胀也影响了游戏。", th: "เงินเฟ้อกระทบเกมด้วย" }, abilities: [], special: null },
    { name: { en: "Missed Sale", zh: "错过特卖", th: "Missed Sale" }, rarity: "common", category: "minnow", desc: { en: "It was 50% off yesterday.", zh: "昨天还五折呢。", th: "เมื่อวานลด 50%" }, abilities: [], special: null },
    { name: { en: "Payment Failed", zh: "支付失败", th: "Payment Failed" }, rarity: "common", category: "whale", desc: { en: "Card declined. Panic mode.", zh: "卡被拒。恐慌模式。", th: "บัตรถูกปฏิเสธ โหมดตื่นตระหนก" }, abilities: [], special: null },
    { name: { en: "Dopamine Hit", zh: "多巴胺刺激", th: "Dopamine Hit" }, rarity: "common", category: "whale", desc: { en: "That rush from buying. Gone in seconds.", zh: "购买带来的快感。几秒钟后消失。", th: "ความตื่นเต้นจากการซื้อ หายไปในไม่กี่วินาที" }, abilities: [], special: null },
    { name: { en: "Store Refresh", zh: "商店刷新", th: "Store Refresh" }, rarity: "common", category: "shop", desc: { en: "New items! (Same items, new prices)", zh: "新物品！（同样的物品，新价格）", th: "ของใหม่! (ของเดิม ราคาใหม่)" }, abilities: [], special: null }
  ]
};

// Export
module.exports = { SEASON_5, SEASON_6 };
