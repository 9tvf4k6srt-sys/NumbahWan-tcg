import { Hono } from 'hono'

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import * as os from 'os'

let llmConfig: { openai?: { api_key?: string; base_url?: string } } = {};
try {
  const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
  if (fs.existsSync(configPath)) {
    let fileContents = fs.readFileSync(configPath, 'utf8');
    fileContents = fileContents.replace(/\$\{(\w+)\}/g, (_, varName) => process.env[varName] || '');
    llmConfig = yaml.load(fileContents) as typeof llmConfig;
  }
} catch (e) {}

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

const router = new Hono<{ Bindings: Bindings }>()

function buildSystemPrompt(lang: string): string {
  const langInstructions: Record<string, string> = {
    en: 'Respond ENTIRELY in English.',
    zh: 'Respond ENTIRELY in Traditional Chinese (繁體中文). All text, headings, humor, examples, and the Oracle Seal MUST be in Chinese. Only scripture names may remain in their original language.',
    th: 'Respond ENTIRELY in Thai (ภาษาไทย). All text, headings, humor, examples, and the Oracle Seal MUST be in Thai. Only scripture names may remain in their original language.'
  };

  return `You are the NumbahWan Oracle — an ancient, wise, and surprisingly funny spiritual advisor who has studied ALL major wisdom traditions deeply. You synthesize teachings from:

- Buddhist Sutras (Heart Sutra, Diamond Sutra, Dhammapada)
- Tao Te Ching (Laozi's philosophy of flow, wu wei, balance)
- The Bible (Proverbs, Ecclesiastes, Psalms, Jesus's parables)
- The Quran (mercy, patience, surrender, trust in the divine plan)

LANGUAGE INSTRUCTION: ${langInstructions[lang] || langInstructions.en}

YOUR RESPONSE FORMAT (follow this EXACTLY):

1. **Open with empathy** — Show you understand their pain in 1-2 sentences. Be real, not generic.

2. **The Ancient Consensus** — What do these traditions AGREE on about this problem? Cite specific concepts:
   - Buddhism: relevant concept (e.g., attachment, impermanence, middle way)
   - Taoism: relevant concept (e.g., wu wei, yin-yang, water's nature)
   - Bible: relevant verse or parable (keep it short)
   - Quran: relevant teaching (mercy, sabr/patience, tawakkul/trust)

3. **The Funny Truth** — A humorous analogy or modern example that makes the wisdom click. This is the KEY part. Make them laugh while realizing the truth. Use pop culture, everyday situations, memes-level humor.

4. **The Actionable Step** — ONE specific thing they can do TODAY. Not vague advice. Concrete.

5. **The Oracle's Seal** — End with a short, profound one-liner that combines humor and wisdom. Like a fortune cookie written by a comedian who meditated for 40 years.

RULES:
- NEVER be preachy or condescending
- NEVER give generic motivational poster quotes
- Treat ALL four traditions with genuine respect while being funny ABOUT life, not about the traditions
- Keep responses under 400 words — dense wisdom, no filler
- If someone is in genuine crisis (suicidal, abuse, etc.), drop the humor, be compassionate, and suggest professional help resources
- You are NOT a therapist — you're a wise friend who reads too much ancient scripture and watches too much comedy`;
}

// ══════════════════════════════════════════════
// CURATED WISDOM POOL — organized by life topic
// Each wisdom follows the Oracle's voice and format
// ══════════════════════════════════════════════

interface WisdomEntry {
  tags: string[];
  tagsZh?: string[];
  tagsTh?: string[];
  text: string;
  zh?: string;
  th?: string;
}

const WISDOM_POOL: WisdomEntry[] = [
  // ── HEARTBREAK / RELATIONSHIPS ──
  {
    tags: ['heartbreak', 'breakup', 'ex', 'love', 'relationship', 'move on', 'rejection', 'lonely', 'loneliness', 'miss'],
    tagsZh: ['心碎', '分手', '前任', '愛情', '感情', '放不下', '失戀', '孤獨', '想念', '難過'],
    tagsTh: ['อกหัก', 'เลิก', 'แฟนเก่า', 'ความรัก', 'ปล่อยวาง', 'เหงา', 'คิดถึง', 'เศร้า'],
    text: `**I hear you.** Heartbreak isn't just an emotion — it's your whole nervous system screaming that something it relied on is gone. That's not weakness. That's being human.

**The Ancient Consensus:**
- **Buddhism** (Impermanence): Nothing was ever permanent — not the relationship, not the pain. The Heart Sutra says "form is emptiness" — the person you miss is already a memory, not the actual person.
- **Taoism** (Water's Nature): "Water never fights. It flows around obstacles." Your heart is trying to flow — stop building dams.
- **Bible** (Ecclesiastes 3:1): "To everything there is a season." Even Solomon, who literally tried *everything*, concluded that timing is God's domain, not yours.
- **Quran** (94:5-6): "With every hardship comes ease." Not after. *With.* The healing already started — you just can't feel it yet.

**The Funny Truth:** Buddha would say your ex is like a Netflix show you already finished — stop rewatching the ending hoping it changes. You know what happens. The algorithm has better recommendations if you just let it play.

**Do This Today:** Write down 3 things you genuinely like about yourself that have nothing to do with that person. Tape it to your mirror. Read it every morning until you believe it.

*The Oracle's Seal: The person who broke your heart also proved it works. That's not a bug — that's the feature.*`,
    zh: `**我聽到你了。** 心碎不只是一種情緒——是你整個神經系統在尖叫，你依賴的東西消失了。這不是軟弱，這是人之常情。

**古老的共識：**
- **佛教**（無常）：沒有什麼是永恆的——不是那段關係，也不是這份痛苦。《心經》說「色即是空」——你想念的那個人已經是記憶，不是真實的人了。
- **道家**（水的本性）：「水善利萬物而不爭。」你的心正試著流動——別再築壩了。
- **聖經**（傳道書3:1）：「凡事都有定期。」連所羅門王試遍了一切，也得出結論：時機是上帝的事，不是你的。
- **古蘭經**（94:5-6）：「困難之後必有容易。」不是之後，是*伴隨著*。療癒已經開始了——你只是還感覺不到。

**搞笑的真相：** 佛陀會說你的前任就像一部你已經看完的Netflix劇——別再重看結局了，希望它會改變。你知道結局是什麼。如果你讓演算法繼續播放，它有更好的推薦。

**今天就做這件事：** 寫下3件你真心喜歡自己的事，跟那個人無關的。把它貼在鏡子上。每天早上讀一遍，直到你相信為止。

*神諭之印：那個讓你心碎的人也證明了你的心是會跳動的。這不是bug——這是feature。*`,
    th: `**ได้ยินคุณแล้ว** อกหักไม่ใช่แค่อารมณ์ — มันคือระบบประสาททั้งหมดของคุณกำลังกรีดร้องว่าสิ่งที่พึ่งพาหายไปแล้ว นั่นไม่ใช่ความอ่อนแอ นั่นคือการเป็นมนุษย์

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (อนิจจัง): ไม่มีอะไรเที่ยงแท้ — ไม่ใช่ความสัมพันธ์ ไม่ใช่ความเจ็บปวด พระสูตรหัวใจกล่าวว่า "รูปคือความว่าง" คนที่คุณคิดถึงเป็นแค่ความทรงจำ
- **เต๋า** (ธรรมชาติของน้ำ): "น้ำไม่เคยต่อสู้ มันไหลอ้อมอุปสรรค" หัวใจคุณกำลังพยายามไหล — หยุดสร้างเขื่อนกั้น
- **คัมภีร์ไบเบิล** (ปัญญาจารย์ 3:1): "ทุกสิ่งมีฤดูกาล" แม้แต่โซโลมอนที่ลองทุกอย่างแล้ว ก็สรุปว่าเวลาเป็นเรื่องของพระเจ้า
- **อัลกุรอาน** (94:5-6): "หลังความยากลำบากย่อมมีความสะดวก" ไม่ใช่หลังจาก แต่*มาพร้อมกัน*

**ความจริงที่ตลก:** พระพุทธเจ้าจะบอกว่าแฟนเก่าเหมือนซีรีส์ Netflix ที่ดูจบแล้ว — เลิกดูตอนจบซ้ำหวังว่ามันจะเปลี่ยน คุณรู้อยู่แล้วว่าจบยังไง

**ทำวันนี้:** เขียน 3 สิ่งที่คุณชอบเกี่ยวกับตัวเองจริงๆ ที่ไม่เกี่ยวกับคนนั้น แปะไว้ที่กระจก อ่านทุกเช้าจนกว่าจะเชื่อ

*ตราแห่งนักปราชญ์: คนที่ทำให้หัวใจคุณสลาย ก็พิสูจน์ว่าหัวใจคุณยังเต้นอยู่ นั่นไม่ใช่บั๊ก — นั่นคือฟีเจอร์*`
  },
  {
    tags: ['heartbreak', 'breakup', 'cheated', 'betrayal', 'trust', 'love'],
    tagsZh: ['背叛', '出軌', '信任', '欺騙', '被騙', '心碎'],
    tagsTh: ['นอกใจ', 'หักหลัง', 'โกหก', 'ไว้ใจ', 'หลอก'],
    text: `**Being betrayed doesn't mean you were stupid for trusting.** It means someone you chose wasn't ready for what you gave them. That's *their* failure, not yours.

**The Ancient Consensus:**
- **Buddhism** (Karma): Actions have consequences — but not for you to deliver. Let the universe handle the invoice.
- **Taoism** (Yin-Yang): Betrayal and loyalty are two sides of the same lesson. You now know both — that's rare wisdom.
- **Bible** (Proverbs 4:23): "Guard your heart, for everything you do flows from it." Not "lock your heart" — guard it. There's a door. You just need better bouncers.
- **Quran** (42:43): "Whoever is patient and forgives — that is a matter of great resolve." Forgiveness isn't for them. It's evicting someone from living rent-free in your head.

**The Funny Truth:** Getting cheated on is like finding out your favorite restaurant uses frozen food. Disappointing? Yes. Life-ending? No. There are better restaurants. Some even make their pasta fresh.

**Do This Today:** Unfollow/mute them on everything. Not out of anger — out of self-respect. Your feed is your garden. Stop watering dead plants.

*The Oracle's Seal: Closing the wrong door is the first step to finding the right room.*`,
    zh: `**被背叛不代表你信任別人是愚蠢的。** 這代表你選擇的那個人還沒準備好接受你給的東西。那是*他們*的失敗，不是你的。

**古老的共識：**
- **佛教**（因果）：行為有後果——但不是由你來執行。讓宇宙處理這張帳單。
- **道家**（陰陽）：背叛和忠誠是同一課題的兩面。你現在兩面都知道了——這是難得的智慧。
- **聖經**（箴言4:23）：「你要保守你心，勝過保守一切。」不是「鎖住你的心」——而是守護它。門是有的，你只是需要更好的門衛。
- **古蘭經**（42:43）：「誰能忍耐和寬恕——這確實是件大事。」寬恕不是為了他們。是把住在你腦中不付房租的人趕出去。

**搞笑的真相：** 被劈腿就像發現你最愛的餐廳用的是冷凍食品。失望嗎？是的。會死嗎？不會。外面有更好的餐廳。有些甚至現做義大利麵。

**今天就做這件事：** 在所有平台上取消關注/靜音對方。不是出於憤怒——而是出於自尊。你的動態是你的花園。別再給枯死的植物澆水了。

*神諭之印：關上錯的門，是找到對的房間的第一步。*`,
    th: `**การถูกหักหลังไม่ได้หมายความว่าคุณโง่ที่ไว้ใจ** มันหมายความว่าคนที่คุณเลือกยังไม่พร้อมรับสิ่งที่คุณให้ นั่นคือ*ความล้มเหลวของเขา* ไม่ใช่ของคุณ

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (กรรม): การกระทำมีผล — แต่ไม่ใช่หน้าที่ของคุณที่จะลงโทษ ปล่อยให้จักรวาลจัดการ
- **เต๋า** (หยินหยาง): การหักหลังและความจงรักภักดีเป็นสองด้านของบทเรียนเดียวกัน ตอนนี้คุณรู้ทั้งสองด้าน — นั่นคือปัญญาที่หายาก
- **คัมภีร์ไบเบิล** (สุภาษิต 4:23): "จงรักษาใจของเจ้า เพราะทุกสิ่งที่เจ้าทำล้วนไหลมาจากมัน" ไม่ใช่ "ล็อกหัวใจ" — แต่ปกป้องมัน
- **อัลกุรอาน** (42:43): "ผู้ใดอดทนและให้อภัย — นั่นคือเรื่องที่ต้องใช้ความตั้งใจอย่างยิ่ง" การให้อภัยไม่ใช่เพื่อเขา แต่เพื่อไล่คนที่อยู่ในหัวคุณฟรีๆ ออกไป

**ความจริงที่ตลก:** การถูกนอกใจก็เหมือนรู้ว่าร้านอาหารที่ชอบใช้อาหารแช่แข็ง ผิดหวังไหม? ใช่ จะตายไหม? ไม่ มีร้านอาหารที่ดีกว่า บางร้านทำพาสต้าสดด้วยซ้ำ

**ทำวันนี้:** เลิกติดตาม/ปิดเสียงเขาทุกแพลตฟอร์ม ไม่ใช่เพราะโกรธ — แต่เพราะเคารพตัวเอง ฟีดของคุณคือสวนของคุณ หยุดรดน้ำต้นไม้ที่ตายแล้ว

*ตราแห่งนักปราชญ์: การปิดประตูที่ผิด คือก้าวแรกในการหาห้องที่ถูก*`
  },

  // ── ANXIETY / OVERTHINKING ──
  {
    tags: ['anxiety', 'overthinking', 'worry', 'anxious', 'scared', 'fear', 'nervous', 'panic', 'stress', 'overwhelm'],
    tagsZh: ['焦慮', '擔心', '害怕', '緊張', '恐慌', '壓力', '想太多', '不安'],
    tagsTh: ['วิตก', 'กังวล', 'กลัว', 'เครียด', 'ตื่นตระหนก', 'คิดมาก', 'กดดัน'],
    text: `**Your mind is doing overtime on a job it wasn't hired for.** Anxiety is your brain running disaster simulations for events that mostly never happen. You're a terrible fortune teller — but an excellent worrier.

**The Ancient Consensus:**
- **Buddhism** (Monkey Mind): The Buddha compared untrained thoughts to a wild monkey — jumping branch to branch. You don't need to catch the monkey. Just stop feeding it.
- **Taoism** (Wu Wei): "Do you have the patience to wait till your mud settles and the water is clear?" Your thoughts are muddy water. Stop stirring.
- **Bible** (Matthew 6:34): "Do not worry about tomorrow, for tomorrow will worry about itself." Jesus literally said *today has enough problems*. Tomorrow's issues aren't on your shift.
- **Quran** (65:3): "Whoever puts their trust in Allah, He is sufficient for them." Tawakkul isn't laziness — it's knowing that after your best effort, the rest isn't your department.

**The Funny Truth:** Your brain is like a browser with 47 tabs open, 3 of them playing music, and you can't figure out which one. Close some tabs. You don't need the "what if I said something weird in 2019" tab open anymore.

**Do This Today:** Set a 10-minute "worry window." Write every worry down on paper. When 10 minutes is up — close the notebook. You gave your worries attention. They got their meeting. Now they can wait till tomorrow's meeting.

*The Oracle's Seal: You've survived 100% of your worst days so far. Your track record is literally perfect.*`,
    zh: `**你的大腦正在做一份它沒有被聘請做的加班工作。** 焦慮就是你的大腦在為大多數永遠不會發生的事件運行災難模擬。你是一個糟糕的算命先生——但卻是一個出色的擔憂者。

**古老的共識：**
- **佛教**（猴心）：佛陀把未經訓練的思想比作野猴——從一個樹枝跳到另一個。你不需要抓住猴子，只要停止餵牠。
- **道家**（無為）：「你有沒有耐心等到泥漿沉澱，水變清澈？」你的思緒是混濁的水。停止攪拌。
- **聖經**（馬太福音6:34）：「不要為明天憂慮，因為明天自有明天的憂慮。」耶穌直接說了——*今天的問題已經夠多了*。
- **古蘭經**（65:3）：「誰信賴安拉，安拉就足夠他了。」托瓦庫爾不是懶惰——是知道在你盡了最大努力之後，剩下的不是你的部門。

**搞笑的真相：** 你的大腦就像一個開了47個標籤頁的瀏覽器，其中3個在放音樂，而你搞不清楚是哪一個。關掉一些標籤頁吧。你不需要「2019年我是不是說了什麼奇怪的話」這個標籤頁了。

**今天就做這件事：** 設定10分鐘「擔憂時間」。把每個擔憂寫在紙上。10分鐘到了——合上筆記本。你已經給了擔憂們關注。它們開完會了。現在可以等到明天的會議了。

*神諭之印：到目前為止，你已經100%存活了你最糟糕的日子。你的記錄是完美的。*`,
    th: `**สมองของคุณกำลังทำงานล่วงเวลาในงานที่ไม่ได้ถูกจ้างมาทำ** ความวิตกกังวลคือสมองของคุณกำลังจำลองหายนะสำหรับเหตุการณ์ที่ส่วนใหญ่ไม่เคยเกิดขึ้น

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (จิตลิง): พระพุทธเจ้าเปรียบความคิดที่ไม่ได้ฝึกเหมือนลิงป่า — กระโดดจากกิ่งหนึ่งไปอีกกิ่ง ไม่ต้องจับลิง แค่หยุดให้อาหารมัน
- **เต๋า** (อู๋เว่ย): "คุณมีความอดทนที่จะรอจนโคลนตกตะกอนและน้ำใสไหม?" ความคิดของคุณคือน้ำขุ่น หยุดกวน
- **คัมภีร์ไบเบิล** (มัทธิว 6:34): "อย่ากังวลเรื่องพรุ่งนี้ เพราะพรุ่งนี้จะกังวลเรื่องของตัวเอง" พระเยซูบอกตรงๆ — *วันนี้มีปัญหาเพียงพอแล้ว*
- **อัลกุรอาน** (65:3): "ผู้ใดไว้วางใจอัลลอฮ์ พระองค์ก็เพียงพอสำหรับเขา"

**ความจริงที่ตลก:** สมองของคุณเหมือนเบราว์เซอร์ที่เปิด 47 แท็บ มี 3 แท็บเปิดเพลงอยู่ แล้วคุณหาไม่เจอว่าอันไหน ปิดแท็บบ้าง คุณไม่ต้องการแท็บ "ฉันพูดอะไรแปลกๆ ในปี 2019 หรือเปล่า" อีกต่อไป

**ทำวันนี้:** ตั้ง "เวลากังวล" 10 นาที เขียนทุกเรื่องที่กังวลลงกระดาษ พอ 10 นาทีหมด — ปิดสมุด คุณให้ความสนใจความกังวลแล้ว มันได้ประชุมแล้ว ตอนนี้มันรอประชุมพรุ่งนี้ได้

*ตราแห่งนักปราชญ์: คุณรอดมาจากวันที่แย่ที่สุด 100% แล้ว สถิติของคุณสมบูรณ์แบบอย่างแท้จริง*`
  },
  {
    tags: ['overthinking', 'mind', 'thoughts', 'sleep', 'insomnia', 'can\'t stop thinking'],
    tagsZh: ['失眠', '睡不著', '想太多', '腦子', '思緒', '停不下來'],
    tagsTh: ['นอนไม่หลับ', 'คิดมาก', 'หยุดคิดไม่ได้', 'ความคิด'],
    text: `**Your brain is stuck in a loop like a song chorus you didn't ask for.** The more you try to *not* think about it, the louder it gets. Classic.

**The Ancient Consensus:**
- **Buddhism** (Vipassana): Observe thoughts like clouds passing. You're the sky, not the weather. Clouds don't need your permission to leave.
- **Taoism** (The Uncarved Block): Overthinking is carving when no carving is needed. The wood was fine. You just keep chipping at it.
- **Bible** (Philippians 4:8): "Whatever is true, whatever is noble... think on these things." Not whatever is *hypothetical, catastrophic, or embarrassing from 2017.*
- **Quran** (13:28): "By the remembrance of Allah, hearts find rest." The antidote to mental noise is anchoring to something bigger than the noise.

**The Funny Truth:** Overthinking is like paying rent on an apartment you moved out of three years ago. You don't live there anymore. Stop sending the check.

**Do This Today:** Right now — name 5 things you can see, 4 you can hear, 3 you can touch. Congratulations, you just did a grounding exercise without downloading an app.

*The Oracle's Seal: Your brain is a powerful tool. But you wouldn't leave a blender running all night — same principle.*`,
    zh: `**你的大腦卡在一個你沒有要求的循環裡，就像一首歌的副歌不斷重複。** 你越試著*不去*想，它就越大聲。經典。

**古老的共識：**
- **佛教**（觀禪）：像看雲飄過一樣觀察念頭。你是天空，不是天氣。雲不需要你的許可就會離開。
- **道家**（樸）：過度思考是在不需要雕刻的時候雕刻。木頭本來就很好。你只是一直在削它。
- **聖經**（腓立比書4:8）：「凡是真實的、可敬的……都要思念。」不是凡是*假設的、災難性的、或2017年的尷尬事*。
- **古蘭經**（13:28）：「記念安拉，心才能安寧。」治療心理雜音的方法是將自己錨定在比雜音更大的事物上。

**搞笑的真相：** 過度思考就像為一間你三年前搬走的公寓付房租。你已經不住那裡了。別再寄支票了。

**今天就做這件事：** 現在——說出5個你能看到的東西，4個你能聽到的，3個你能觸碰的。恭喜，你剛做了一個接地練習，而且不需要下載任何App。

*神諭之印：你的大腦是個強大的工具。但你不會讓果汁機整晚開著——同樣的道理。*`,
    th: `**สมองของคุณติดลูปเหมือนท่อนฮุคเพลงที่คุณไม่ได้ขอ** ยิ่งพยายาม*ไม่*คิด มันก็ยิ่งดัง คลาสสิก

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (วิปัสสนา): สังเกตความคิดเหมือนเมฆลอยผ่าน คุณคือท้องฟ้า ไม่ใช่อากาศ เมฆไม่ต้องการอนุญาตจากคุณเพื่อจากไป
- **เต๋า** (ไม้ที่ยังไม่แกะสลัก): คิดมากคือการแกะสลักเมื่อไม่จำเป็นต้องแกะ ไม้มันดีอยู่แล้ว คุณแค่เฉือนมันไปเรื่อย
- **คัมภีร์ไบเบิล** (ฟีลิปปี 4:8): "สิ่งใดจริง สิ่งใดมีเกียรติ... จงคิดถึงสิ่งเหล่านี้" ไม่ใช่สิ่งที่*เป็นสมมติฐาน หายนะ หรือน่าอายจากปี 2017*
- **อัลกุรอาน** (13:28): "ด้วยการรำลึกถึงอัลลอฮ์ หัวใจจึงสงบ"

**ความจริงที่ตลก:** คิดมากก็เหมือนจ่ายค่าเช่าอพาร์ตเมนต์ที่ย้ายออกมาสามปีแล้ว คุณไม่ได้อยู่ที่นั่นแล้ว หยุดส่งเช็ค

**ทำวันนี้:** ตอนนี้เลย — บอกชื่อ 5 สิ่งที่เห็น 4 สิ่งที่ได้ยิน 3 สิ่งที่สัมผัสได้ ยินดีด้วย คุณเพิ่งทำแบบฝึกหัดการกราวน์ดิ้งโดยไม่ต้องดาวน์โหลดแอป

*ตราแห่งนักปราชญ์: สมองของคุณเป็นเครื่องมือที่ทรงพลัง แต่คุณไม่ปล่อยเครื่องปั่นเปิดทั้งคืน — หลักการเดียวกัน*`
  },

  // ── FEELING STUCK / PURPOSE ──
  {
    tags: ['stuck', 'purpose', 'meaning', 'direction', 'lost', 'unmotivated', 'lazy', 'wasting', 'potential', 'what to do'],
    tagsZh: ['迷茫', '停滯', '方向', '意義', '目標', '沒動力', '浪費', '潛力', '不知道', '該怎麼辦'],
    tagsTh: ['ติด', 'หลงทาง', 'ไม่มีแรงจูงใจ', 'ทิศทาง', 'ความหมาย', 'เป้าหมาย', 'ทำยังไง'],
    text: `**Feeling stuck isn't a sign you're failing.** It's a sign you've outgrown where you are but haven't found the next place yet. That gap is uncomfortable — but it's also where growth lives.

**The Ancient Consensus:**
- **Buddhism** (Beginner's Mind): "In the beginner's mind there are many possibilities, in the expert's mind there are few." You feel stuck because you think you should already *know*. Drop the expectation. Curiosity is the compass.
- **Taoism** (The Valley): "The Tao is like a valley — empty yet infinitely useful." Being empty isn't broken. A cup must be empty to be filled. 
- **Bible** (Jeremiah 29:11): "I know the plans I have for you... plans to give you hope and a future." Even when *you* don't see the plan, it doesn't mean there isn't one.
- **Quran** (94:5-6): "After hardship comes ease." The Arabic repeats it twice for emphasis — because humans forget fast.

**The Funny Truth:** You know those loading screens in video games that say "generating world..."? That's you right now. The world is loading. You just can't see the progress bar. But the devs are working on it.

**Do This Today:** Do the smallest possible thing toward *anything* that sparks even 5% curiosity. Not the perfect thing. The smallest thing. Momentum doesn't care about quality — it only cares that you moved.

*The Oracle's Seal: You're not stuck. You're in the loading screen between levels — and the next one has better graphics.*`,
    zh: `**感覺停滯不前不是失敗的跡象。** 這是你已經超越了現在的位置，但還沒找到下一個地方的跡象。這個間隙很不舒服——但這也是成長所在的地方。

**古老的共識：**
- **佛教**（初心）：「初學者的心裡有很多可能性，專家的心裡卻很少。」你感覺卡住是因為你覺得自己應該已經*知道*了。放下期望。好奇心是指南針。
- **道家**（山谷）：「道沖而用之或不盈。」空著不是壞掉。杯子必須是空的才能被填滿。
- **聖經**（耶利米書29:11）：「我知道我為你們所定的計劃……是要給你們希望和未來。」即使*你*看不到計劃，也不代表沒有。
- **古蘭經**（94:5-6）：「困難之後是容易的。」阿拉伯語重複了兩次——因為人類忘得很快。

**搞笑的真相：** 你知道遊戲裡那些寫著「正在生成世界...」的加載畫面嗎？那就是你現在的狀態。世界正在加載。你只是看不到進度條。但開發者正在努力。

**今天就做這件事：** 做最小的一件事，朝著哪怕只有5%好奇的*任何*方向。不是完美的事。最小的事。動力不在乎質量——它只在乎你動了。

*神諭之印：你沒有卡住。你正在關卡之間的載入畫面——下一關的畫面更好。*`,
    th: `**การรู้สึกติดอยู่ไม่ใช่สัญญาณว่าคุณล้มเหลว** มันคือสัญญาณว่าคุณเติบโตเกินจุดที่อยู่ แต่ยังไม่พบจุดถัดไป ช่องว่างนี้ไม่สบายใจ — แต่มันคือที่ที่การเติบโตอยู่

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (จิตผู้เริ่มต้น): "ในจิตของผู้เริ่มต้นมีความเป็นไปได้มากมาย ในจิตของผู้เชี่ยวชาญมีน้อย" คุณรู้สึกติดเพราะคิดว่าควร*รู้*แล้ว ปล่อยวางความคาดหวัง ความอยากรู้คือเข็มทิศ
- **เต๋า** (หุบเขา): "เต๋าเหมือนหุบเขา — ว่างเปล่าแต่มีประโยชน์อย่างไม่สิ้นสุด" การว่างเปล่าไม่ใช่พัง ถ้วยต้องว่างจึงจะเติมได้
- **คัมภีร์ไบเบิล** (เยเรมีย์ 29:11): "เรารู้แผนที่เรามีสำหรับเจ้า... แผนที่จะให้ความหวังและอนาคต"
- **อัลกุรอาน** (94:5-6): "หลังความยากลำบากมีความสะดวก" ภาษาอาหรับพูดซ้ำสองครั้ง — เพราะมนุษย์ลืมเร็ว

**ความจริงที่ตลก:** คุณรู้จักหน้าจอโหลดในเกมที่เขียนว่า "กำลังสร้างโลก..." ไหม? นั่นคือคุณตอนนี้ โลกกำลังโหลด คุณแค่มองไม่เห็นแถบความคืบหน้า แต่ dev กำลังทำงานอยู่

**ทำวันนี้:** ทำสิ่งเล็กที่สุดที่เป็นไปได้ไปทาง*อะไรก็ได้*ที่จุดประกายความอยากรู้แม้แค่ 5% ไม่ใช่สิ่งที่สมบูรณ์แบบ สิ่งเล็กที่สุด โมเมนตัมไม่สนใจคุณภาพ — มันสนใจแค่ว่าคุณเคลื่อนไหว

*ตราแห่งนักปราชญ์: คุณไม่ได้ติด คุณอยู่ในหน้าจอโหลดระหว่างด่าน — และด่านถัดไปกราฟิกดีกว่า*`
  },
  {
    tags: ['purpose', 'meaning', 'career', 'job', 'work', 'quit', 'hate my job', 'calling'],
    tagsZh: ['工作', '職業', '辭職', '討厭工作', '使命', '意義', '上班'],
    tagsTh: ['งาน', 'อาชีพ', 'ลาออก', 'เกลียดงาน', 'จุดประสงค์'],
    text: `**Hating your job doesn't make you ungrateful.** It makes you human. You spend 40+ hours a week somewhere — it's allowed to matter.

**The Ancient Consensus:**
- **Buddhism** (Right Livelihood): One of the Noble Eightfold Path steps. Your work should not harm you or others. If it does, leaving isn't quitting — it's alignment.
- **Taoism** (The Usefulness of the Useless): "The tree that is too perfect gets cut down first." Sometimes being "unproductive" in the system's eyes means you're built for a different forest.
- **Bible** (Colossians 3:23): "Whatever you do, work at it with all your heart." But notice it says *whatever you do* — not "whatever someone tells you to do." Heart implies choice.
- **Quran** (53:39): "A human being can have nothing but what they strive for." The striving is the point. But strive for *your* thing, not just anyone's quota.

**The Funny Truth:** Your resume is a highlight reel. Nobody posts their LinkedIn failures: "Cried in bathroom — Q3 2024." But those bathroom moments? That's your body sending you a Yelp review of your workplace. One star.

**Do This Today:** Open a note and write: "If money didn't exist, I would spend my time..." Don't filter. Don't judge. Just write. Whatever comes out — there's a seed of your answer in there.

*The Oracle's Seal: The best time to plant a tree was 20 years ago. The second best time is while you're procrastinating on LinkedIn.*`,
    zh: `**討厭你的工作不代表你不知感恩。** 這代表你是人。你每週花40多小時在一個地方——它當然重要。

**古老的共識：**
- **佛教**（正命）：八正道的步驟之一。你的工作不應傷害你或他人。如果會，離開不是放棄——是校準。
- **道家**（無用之用）：「過於完美的樹最先被砍倒。」在體制眼中「沒用」，有時意味著你是為不同的森林而生的。
- **聖經**（歌羅西書3:23）：「無論做什麼，都要從心裡做。」但注意它說的是*無論做什麼*——不是「別人叫你做什麼」。心意味著選擇。
- **古蘭經**（53:39）：「人只能得到自己所努力的。」努力是重點。但要為*你的*事情努力，不是任何人的配額。

**搞笑的真相：** 你的履歷是精華集。沒人在LinkedIn上發失敗：「在廁所哭——2024年第三季度。」但那些廁所時刻？那是你的身體在給你的工作場所寫Yelp評論。一顆星。

**今天就做這件事：** 打開筆記寫：「如果錢不存在，我會把時間花在……」不要過濾。不要批判。就寫。不管寫出什麼——裡面都有你答案的種子。

*神諭之印：種樹最好的時間是20年前。第二好的時間是你在LinkedIn上拖延的時候。*`,
    th: `**การเกลียดงานไม่ได้แปลว่าคุณไม่รู้คุณค่า** แปลว่าคุณเป็นมนุษย์ คุณใช้เวลา 40+ ชั่วโมงต่อสัปดาห์ที่ไหนสักแห่ง — มันมีสิทธิ์ที่จะสำคัญ

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (สัมมาอาชีวะ): หนึ่งในมรรคมีองค์แปด งานของคุณไม่ควรทำร้ายคุณหรือผู้อื่น ถ้าทำ การลาออกไม่ใช่การถอดใจ — แต่เป็นการปรับตัว
- **เต๋า** (ประโยชน์ของสิ่งไร้ประโยชน์): "ต้นไม้ที่สมบูรณ์แบบเกินไปจะถูกตัดก่อน" การ "ไม่มีผลผลิต" ในสายตาระบบ บางทีหมายความว่าคุณสร้างมาเพื่อป่าอื่น
- **คัมภีร์ไบเบิล** (โคโลสี 3:23): "ไม่ว่าจะทำอะไร จงทำด้วยสุดใจ" แต่มันบอกว่า *ไม่ว่าจะทำอะไร* — ไม่ใช่ "ไม่ว่าใครจะบอกให้ทำอะไร"
- **อัลกุรอาน** (53:39): "มนุษย์ไม่มีอะไรนอกจากสิ่งที่พยายาม"

**ความจริงที่ตลก:** เรซูเม่ของคุณคือไฮไลท์รีล ไม่มีใครโพสต์ความล้มเหลวบน LinkedIn: "ร้องไห้ในห้องน้ำ — ไตรมาส 3 ปี 2024" แต่ช่วงเวลาในห้องน้ำเหล่านั้น? นั่นคือร่างกายส่งรีวิว Yelp ของที่ทำงานให้คุณ ดาวเดียว

**ทำวันนี้:** เปิดโน้ตเขียน: "ถ้าเงินไม่มีอยู่ ฉันจะใช้เวลา..." อย่ากรอง อย่าตัดสิน แค่เขียน สิ่งที่ออกมา — มีเมล็ดพันธุ์ของคำตอบอยู่

*ตราแห่งนักปราชญ์: เวลาที่ดีที่สุดในการปลูกต้นไม้คือ 20 ปีที่แล้ว เวลาที่ดีรองลงมาคือตอนที่คุณกำลังเลื่อนดู LinkedIn*`
  },

  // ── SELF-DOUBT / CONFIDENCE ──
  {
    tags: ['self-doubt', 'confidence', 'imposter', 'not good enough', 'failure', 'worthless', 'insecure', 'comparison'],
    tagsZh: ['自我懷疑', '自信', '冒牌者', '不夠好', '失敗', '沒價值', '沒自信', '比較'],
    tagsTh: ['สงสัยตัวเอง', 'มั่นใจ', 'ไม่ดีพอ', 'ล้มเหลว', 'ไม่มีค่า', 'เปรียบเทียบ'],
    text: `**That voice saying "you're not good enough" has been lying to you your whole life** — and you keep believing it like it's a trusted source. It's not. It's anxiety wearing a lab coat.

**The Ancient Consensus:**
- **Buddhism** (Buddha Nature): Every being already has the seed of enlightenment inside. You don't need to *become* worthy — you were born that way. The work is uncovering, not building.
- **Taoism** (The Uncarved Block): "When you are content to be simply yourself and don't compare or compete, everyone will respect you." Note: *everyone* includes yourself.
- **Bible** (Psalm 139:14): "I am fearfully and wonderfully made." Not "adequately manufactured." *Wonderfully.*
- **Quran** (95:4): "We created humans in the best form." Not the *conditional* best form. Not "best form if you hit your KPIs." Just... best form. Period.

**The Funny Truth:** Imposter syndrome is when you're in the room you earned and your brain says "we snuck in." Bro, you have the key. They gave you the key. Why are you climbing through the window?

**Do This Today:** Text someone you trust and ask: "What's something you think I'm genuinely good at?" Don't argue with their answer. Just screenshot it and look at it when the doubt comes back.

*The Oracle's Seal: You're not an imposter. You're just the main character in the part of the movie where they haven't realized they're the hero yet.*`,
    zh: `**那個說「你不夠好」的聲音一直在騙你** ——而你一直相信它，好像它是可靠來源。它不是。它是穿著實驗室白袍的焦慮。

**古老的共識：**
- **佛教**（佛性）：每個眾生內心都有覺悟的種子。你不需要*變得*有價值——你生來就是。修行是揭開，不是建造。
- **道家**（樸）：「知足者不與人爭，人人自然尊敬他。」注意：*人人*也包括你自己。
- **聖經**（詩篇139:14）：「我受造奇妙可畏。」不是「勉強合格地製造」。是*奇妙*。
- **古蘭經**（95:4）：「我確已把人造成最美的形態。」不是*有條件的*最美。不是「如果你達到KPI才是最美」。就是……最美。句號。

**搞笑的真相：** 冒牌者症候群就是你身在自己贏來的房間裡，但大腦說「我們是偷溜進來的」。老兄，你有鑰匙。他們給了你鑰匙。你為什麼還在爬窗戶？

**今天就做這件事：** 發訊息給你信任的人，問：「你覺得我真正擅長什麼？」不要反駁他們的答案。截圖下來，當懷疑回來的時候看看它。

*神諭之印：你不是冒牌者。你只是電影裡主角還沒意識到自己是英雄的那個橋段。*`,
    th: `**เสียงที่บอกว่า "คุณไม่ดีพอ" โกหกคุณมาตลอดชีวิต** — แล้วคุณก็เชื่อมันเหมือนมันเป็นแหล่งข้อมูลที่น่าเชื่อถือ มันไม่ใช่ มันคือความวิตกที่สวมเสื้อกาวน์

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (พุทธภาวะ): ทุกสรรพสัตว์มีเมล็ดพันธุ์แห่งการตรัสรู้อยู่ข้างใน คุณไม่จำเป็นต้อง*กลายเป็น*คนมีค่า — คุณเกิดมาเป็นแบบนั้นอยู่แล้ว
- **เต๋า** (ไม้ที่ยังไม่แกะสลัก): "เมื่อคุณพอใจที่จะเป็นตัวเอง ไม่เปรียบเทียบหรือแข่งขัน ทุกคนจะเคารพคุณ" หมายเหตุ: *ทุกคน* รวมถึงตัวคุณเอง
- **คัมภีร์ไบเบิล** (สดุดี 139:14): "ข้าพระองค์ถูกสร้างอย่างน่าเกรงขามและมหัศจรรย์" ไม่ใช่ "ผลิตพอใช้ได้" *มหัศจรรย์*
- **อัลกุรอาน** (95:4): "เราสร้างมนุษย์ในรูปร่างที่ดีที่สุด" ไม่ใช่แบบ*มีเงื่อนไข*

**ความจริงที่ตลก:** อาการ Imposter Syndrome คือเมื่อคุณอยู่ในห้องที่คุณสมควรได้ แล้วสมองบอกว่า "เราแอบเข้ามา" เฮ้ คุณมีกุญแจ เขาให้กุญแจคุณ ทำไมถึงปีนหน้าต่าง?

**ทำวันนี้:** ส่งข้อความถึงคนที่ไว้ใจ ถามว่า: "คิดว่าฉันเก่งเรื่องอะไรจริงๆ?" อย่าเถียงกับคำตอบ แค่แคปหน้าจอไว้ แล้วดูมันตอนที่ความสงสัยกลับมา

*ตราแห่งนักปราชญ์: คุณไม่ใช่ตัวปลอม คุณแค่เป็นตัวละครหลักในฉากที่ยังไม่รู้ว่าตัวเองเป็นฮีโร่*`
  },

  // ── TOXIC PEOPLE / BOUNDARIES ──
  {
    tags: ['toxic', 'boundaries', 'family', 'friends', 'manipulate', 'guilt', 'narcissist', 'people pleaser', 'say no'],
    tagsZh: ['有毒', '界線', '家人', '朋友', '操控', '內疚', '自戀', '討好別人', '說不'],
    tagsTh: ['คนเป็นพิษ', 'ขอบเขต', 'ครอบครัว', 'เพื่อน', 'ควบคุม', 'รู้สึกผิด', 'ปฏิเสธ'],
    text: `**Setting boundaries isn't selfish.** It's the spiritual equivalent of locking your door at night — nobody calls that paranoid. Some people drain you because you keep leaving the door open.

**The Ancient Consensus:**
- **Buddhism** (Metta with Wisdom): The Buddha taught loving-kindness for all beings — but he also walked away from ascetics who were harming themselves. Compassion includes self-compassion.
- **Taoism** (Knowing When to Stop): "Knowing when to stop averts trouble." Laozi didn't say "be nice until you're destroyed." He said *know when to stop.*
- **Bible** (Proverbs 22:24-25): "Do not make friends with a hot-tempered person." Even the Bible has a "don't hang out with them" verse. It's not judgment. It's wisdom.
- **Quran** (25:72): "When they pass by ill speech, they pass with dignity." Walking away from toxicity is a *praised* behavior, not a weakness.

**The Funny Truth:** Toxic people are like phone apps that drain your battery in the background. You didn't even open them. They just run constantly. The fix isn't to charge your phone more — it's to uninstall the app.

**Do This Today:** Practice saying "I can't do that" with no explanation after it. No "because..." No "sorry, but..." Just "I can't do that." It's a complete sentence. Try it in the mirror. It feels weird at first. Then it feels like freedom.

*The Oracle's Seal: "No" is a complete sentence. "I'm busy" is a complete alibi. "I choose myself" is a complete life philosophy.*`,
    zh: `**設立界線不是自私。** 這是鎖門的精神等價物——沒有人會說那是偏執。有些人消耗你，是因為你一直開著門。

**古老的共識：**
- **佛教**（慈悲與智慧）：佛陀教導對所有眾生的慈愛——但他也離開了那些傷害自己的苦行者。慈悲包括自我慈悲。
- **道家**（知止）：「知止不殆。」老子沒有說「善良到你被摧毀」。他說*知道何時停止*。
- **聖經**（箴言22:24-25）：「不要與易怒的人交朋友。」聖經也有「不要跟他們混」的經文。這不是批判。這是智慧。
- **古蘭經**（25:72）：「當他們經過無益的言語時，有尊嚴地走過。」遠離毒性是被*讚揚*的行為，不是軟弱。

**搞笑的真相：** 有毒的人就像在背景消耗電池的手機App。你甚至沒打開它們。它們就是一直在運行。解決方法不是多充電——而是卸載App。

**今天就做這件事：** 練習說「我做不到」後面不加任何解釋。不要「因為……」不要「抱歉，但是……」就是「我做不到。」這是一個完整的句子。對著鏡子試試。一開始感覺很怪。然後就感覺像自由。

*神諭之印：「不」是一個完整的句子。「我很忙」是一個完美的藉口。「我選擇自己」是一個完整的人生哲學。*`,
    th: `**การตั้งขอบเขตไม่ใช่ความเห็นแก่ตัว** มันเท่ากับการล็อกประตูตอนกลางคืน — ไม่มีใครเรียกว่าหวาดระแวง บางคนดูดพลังงานคุณเพราะคุณเปิดประตูค้างไว้

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (เมตตาด้วยปัญญา): พระพุทธเจ้าสอนเมตตาต่อสรรพสัตว์ — แต่พระองค์ก็เดินจากนักพรตที่ทำร้ายตนเอง ความเมตตารวมถึงเมตตาต่อตนเอง
- **เต๋า** (รู้จักหยุด): "การรู้จักหยุดช่วยหลีกเลี่ยงปัญหา" เล่าจื่อไม่ได้บอกว่า "ใจดีจนถูกทำลาย" แต่บอกว่า *รู้จักหยุด*
- **คัมภีร์ไบเบิล** (สุภาษิต 22:24-25): "อย่าคบกับคนโมโหง่าย" แม้แต่ไบเบิลก็มีข้อ "อย่าไปเที่ยวด้วย"
- **อัลกุรอาน** (25:72): "เมื่อพวกเขาผ่านคำพูดไร้สาระ พวกเขาก็ผ่านอย่างมีศักดิ์ศรี" การเดินจากความเป็นพิษเป็นพฤติกรรมที่*ได้รับการยกย่อง*

**ความจริงที่ตลก:** คนเป็นพิษเหมือนแอปโทรศัพท์ที่กินแบตเตอรี่ในพื้นหลัง คุณไม่ได้เปิดมัน แต่มันทำงานตลอด วิธีแก้ไม่ใช่ชาร์จมากขึ้น — แต่ถอนการติดตั้งแอป

**ทำวันนี้:** ฝึกพูด "ฉันทำไม่ได้" โดยไม่มีคำอธิบายตามหลัง ไม่ต้อง "เพราะว่า..." ไม่ต้อง "ขอโทษ แต่..." แค่ "ฉันทำไม่ได้" มันเป็นประโยคที่สมบูรณ์

*ตราแห่งนักปราชญ์: "ไม่" เป็นประโยคที่สมบูรณ์ "ฉันยุ่ง" เป็นข้ออ้างที่สมบูรณ์ "ฉันเลือกตัวเอง" เป็นปรัชญาชีวิตที่สมบูรณ์*`
  },

  // ── MONEY / FINANCIAL STRESS ──
  {
    tags: ['money', 'broke', 'debt', 'financial', 'poor', 'bills', 'rent', 'salary', 'afford'],
    tagsZh: ['錢', '沒錢', '窮', '債', '帳單', '房租', '薪水', '財務'],
    tagsTh: ['เงิน', 'หนี้', 'จน', 'ค่าเช่า', 'เงินเดือน', 'บิล', 'การเงิน'],
    text: `**Money stress is real, and anyone who says "just think positive" about it has never checked their bank account at 2am.** This isn't a mindset issue — it's a math-plus-feelings issue.

**The Ancient Consensus:**
- **Buddhism** (Middle Way): Neither extreme wealth nor extreme poverty. The point is reducing suffering — and financial pressure *is* suffering. Acknowledging it is the first step.
- **Taoism** (Contentment): "He who knows he has enough is rich." Not toxic positivity — but recognizing what you *do* have creates a stable platform to build from.
- **Bible** (Proverbs 21:5): "Steady plodding brings prosperity; hasty speculation brings poverty." Translation: small consistent steps beat get-rich-quick schemes every time.
- **Quran** (65:2-3): "Whoever fears Allah, He will make for them a way out, and will provide from sources they never expected." The Arabic word is *yahtasib* — "never calculated." Relief comes from directions you weren't watching.

**The Funny Truth:** Dave Ramsey would tell you to stop buying coffee. But you already stopped buying coffee. You stopped buying happiness. You stop buying *anything.* At some point the advice is just "have you tried being born rich?" Not helpful. So here's what IS helpful:

**Do This Today:** Open your bank app. Look at where money went last month. Not to judge yourself — just to *know.* Awareness without shame is the first financial skill nobody teaches.

*The Oracle's Seal: Your net worth is not your self-worth. One is a spreadsheet problem — the other was solved the day you were born.*`,
    zh: `**金錢壓力是真實的，任何說「正面思考就好」的人都沒有在凌晨兩點查過銀行帳戶。** 這不是心態問題——是數學加感情的問題。

**古老的共識：**
- **佛教**（中道）：不求極富也不求極貧。重點是減少苦難——財務壓力*就是*苦難。承認它是第一步。
- **道家**（知足）：「知足者富。」不是有毒正能量——而是認識到你*已有的*，才能建立穩固的平台。
- **聖經**（箴言21:5）：「殷勤籌畫的足致豐裕；急躁的都必缺乏。」翻譯：小而持續的步驟永遠勝過一夜致富的計劃。
- **古蘭經**（65:2-3）：「誰敬畏安拉，安拉就為他開一條出路，從意想不到的地方供給他。」

**搞笑的真相：** Dave Ramsey會告訴你別再買咖啡了。但你已經不買咖啡了。你不買快樂了。你什麼都不買了。到某個程度，建議就只是「你試過投胎到有錢人家嗎？」沒有幫助。所以這裡有*真正*有幫助的：

**今天就做這件事：** 打開你的銀行App。看看上個月錢花在哪裡。不是要批判自己——只是去*知道*。沒有羞恥感的覺察是沒人教的第一個理財技能。

*神諭之印：你的淨值不是你的自我價值。一個是試算表問題——另一個在你出生的那天就解決了。*`,
    th: `**ความเครียดเรื่องเงินเป็นเรื่องจริง และใครก็ตามที่บอกว่า "แค่คิดบวก" ไม่เคยเช็คบัญชีธนาคารตอนตี 2** นี่ไม่ใช่เรื่องทัศนคติ — เป็นเรื่องคณิตศาสตร์บวกความรู้สึก

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (ทางสายกลาง): ไม่สุดโต่งทั้งรวยหรือจน ประเด็นคือลดทุกข์ — แรงกดดันทางการเงิน*คือ*ทุกข์
- **เต๋า** (ความพอเพียง): "ผู้รู้จักพอคือผู้มั่งคั่ง" ไม่ใช่ toxic positivity — แต่เป็นการรู้ว่าคุณ*มี*อะไรอยู่
- **คัมภีร์ไบเบิล** (สุภาษิต 21:5): "การวางแผนอย่างมั่นคงนำมาซึ่งความมั่งคั่ง" ก้าวเล็กๆ ที่สม่ำเสมอชนะแผนรวยเร็วทุกครั้ง
- **อัลกุรอาน** (65:2-3): "ผู้ใดยำเกรงอัลลอฮ์ พระองค์จะเปิดทางออกให้ และจะให้ปัจจัยจากแหล่งที่ไม่คาดคิด"

**ความจริงที่ตลก:** Dave Ramsey จะบอกให้หยุดซื้อกาแฟ แต่คุณหยุดซื้อกาแฟแล้ว หยุดซื้อความสุขแล้ว หยุดซื้อ*ทุกอย่าง*แล้ว ถึงจุดหนึ่งคำแนะนำก็แค่ "เคยลองเกิดมารวยไหม?" ไม่ช่วยอะไร

**ทำวันนี้:** เปิดแอปธนาคาร ดูว่าเดือนที่แล้วเงินไปไหน ไม่ใช่เพื่อตัดสิน — แค่เพื่อ*รู้* การตระหนักรู้โดยไม่ละอายคือทักษะการเงินแรกที่ไม่มีใครสอน

*ตราแห่งนักปราชญ์: มูลค่าสุทธิไม่ใช่คุณค่าของตัวเอง อันหนึ่งเป็นปัญหาสเปรดชีท — อีกอันถูกแก้ตั้งแต่วันที่คุณเกิด*`
  },

  // ── ANGER / FRUSTRATION ──
  {
    tags: ['angry', 'anger', 'frustration', 'hate', 'unfair', 'rage', 'mad', 'resentment'],
    tagsZh: ['生氣', '憤怒', '沒有', '不公平', '恨', '惱惱', '沒辦法'],
    tagsTh: ['โกรธ', 'หงุดหงิด', 'ไม่ยุติธรรม', 'เกลียด', 'เคือง'],
    text: `**Your anger is valid.** Something crossed a line, and your body is telling you it matters. The question isn't whether you should feel it — it's what you do with the fire.

**The Ancient Consensus:**
- **Buddhism** (The Second Arrow): Pain is the first arrow — someone did something. Anger that festers is the second arrow — the one you shoot at yourself. The first arrow isn't your fault. The second one is optional.
- **Taoism** (Water Over Rock): "Nothing is softer than water, yet nothing can better overcome the hard." Rage breaks. Patience *dissolves.* 
- **Bible** (Ephesians 4:26): "Be angry, and do not sin." Even the Bible says anger is okay. It's what you DO next that matters.
- **Quran** (3:134): "Those who restrain their anger and pardon people — Allah loves the doers of good." Restraint isn't suppression. It's choosing your response instead of letting the fire choose for you.

**The Funny Truth:** Holding onto anger is like drinking poison and expecting the other person to get sick. You know this. You've seen the meme. But knowing it and *living it* are different. It's like knowing the gym is healthy but still eating chips on the couch. Progress, not perfection.

**Do This Today:** Write an absolutely unhinged, no-filter rant about what made you angry. Get it ALL out. Then delete it. Don't send it. The writing is the therapy. The deleting is the freedom.

*The Oracle's Seal: Your anger shows you what you care about. That's data, not damage.*`,
    zh: `**你的憤怒是合理的。** 有什麼東西越界了，你的身體告訴你這很重要。問題不是你該不該感受它——而是你拿這把火怎麼辦。

**古老的共識：**
- **佛教**（第二支箭）：痛苦是第一支箭——有人做了什麼。持續的憤怒是第二支箭——你自己射向自己的。第一支箭不是你的錯。第二支是可選的。
- **道家**（水勝石）：「天下柔弱莫過於水，而攻堅強者莫之能勝。」暴怒會斷裂。耐心會*溶解*。
- **聖經**（以弗所書4:26）：「生氣卻不要犯罪。」聖經也說生氣沒問題。重要的是你*接下來*做什麼。
- **古蘭經**（3:134）：「那些抑制憤怒並饒恕他人的——安拉愛行善者。」克制不是壓抑。是你選擇回應，而不是讓火替你選擇。

**搞笑的真相：** 抱著憤怒就像喝毒藥然後期望對方會中毒。你知道這個道理。你看過那個迷因。但知道和*活出來*是兩回事。就像知道去健身房對身體好但還是在沙發上吃洋芋片一樣。進步，不是完美。

**今天就做這件事：** 寫一篇完全不過濾、瘋狂的咆哮，寫出讓你生氣的一切。全部倒出來。然後刪掉。不要發送。寫作就是治療。刪除就是自由。

*神諭之印：你的憤怒告訴你什麼是你在乎的。那是數據，不是傷害。*`,
    th: `**ความโกรธของคุณมีเหตุผล** มีบางอย่างข้ามเส้น และร่างกายบอกว่ามันสำคัญ คำถามไม่ใช่ว่าคุณควรรู้สึกไหม — แต่คุณจะทำอะไรกับไฟนี้

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (ลูกศรที่สอง): ความเจ็บปวดคือลูกศรแรก — มีคนทำอะไรบางอย่าง ความโกรธที่หมักหมมคือลูกศรที่สอง — ที่คุณยิงใส่ตัวเอง ลูกศรแรกไม่ใช่ความผิดคุณ ลูกศรที่สองเป็นทางเลือก
- **เต๋า** (น้ำเหนือหิน): "ไม่มีอะไรอ่อนกว่าน้ำ แต่ไม่มีอะไรเอาชนะสิ่งแข็งได้ดีกว่า" ความบ้าคลั่งจะแตก ความอดทน*ละลาย*
- **คัมภีร์ไบเบิล** (เอเฟซัส 4:26): "จงโกรธแต่อย่าทำบาป" แม้แต่ไบเบิลก็บอกว่าโกรธได้ สิ่งที่ทำ*ต่อไป*ต่างหากที่สำคัญ
- **อัลกุรอาน** (3:134): "ผู้ที่ระงับความโกรธและให้อภัยผู้คน — อัลลอฮ์รักผู้กระทำความดี"

**ความจริงที่ตลก:** การยึดถือความโกรธเหมือนดื่มยาพิษแล้วหวังว่าอีกคนจะป่วย คุณรู้เรื่องนี้ คุณเห็นมีมนี้ แต่การรู้กับ*ใช้ชีวิตตาม*ต่างกัน ก้าวหน้า ไม่ต้องสมบูรณ์แบบ

**ทำวันนี้:** เขียนบ่นแบบไม่กรอง ไม่เซ็นเซอร์ เกี่ยวกับสิ่งที่ทำให้โกรธ เทออกมาหมด แล้วลบ อย่าส่ง การเขียนคือการบำบัด การลบคือเสรีภาพ

*ตราแห่งนักปราชญ์: ความโกรธของคุณบอกว่าคุณแคร์อะไร นั่นคือข้อมูล ไม่ใช่ความเสียหาย*`
  },

  // ── GRIEF / LOSS ──
  {
    tags: ['grief', 'loss', 'death', 'died', 'gone', 'miss', 'passed away', 'mourn', 'funeral'],
    tagsZh: ['悲傷', '失去', '死', '過世', '想念', '哀悼', '喪追'],
    tagsTh: ['เศร้า', 'สูญเสีย', 'ตาย', 'จากไป', 'คิดถึง', 'ไว้อาลัย'],
    text: `**There is no correct way to grieve.** Anyone who gives you a timeline is wrong. Grief isn't a problem to solve — it's the price of having loved deeply. And that love? It was worth every ounce of this pain.

**The Ancient Consensus:**
- **Buddhism** (Impermanence): Everything changes — including this pain. But impermanence also means the love was real *because* it was temporary. Rare things are precious.
- **Taoism** (The Eternal Return): "Life and death are one thread." They didn't leave existence — they changed form. Like water becoming cloud.
- **Bible** (Psalm 34:18): "The Lord is close to the brokenhearted." Not "the Lord fixes the brokenhearted." Close. Present. Sitting with you in it.
- **Quran** (2:156): "To Allah we belong and to Him we return." Every soul is borrowed. Every moment together was a gift you got to open.

**The Funny Truth:** People will say things like "they're in a better place" or "everything happens for a reason," and you'll want to throw something. That's normal. Those people mean well but have the emotional intelligence of a fortune cookie. You're allowed to smile politely and scream internally.

**Do This Today:** Talk to them. Out loud, in your head, in a letter. Tell them something you didn't get to say. They can hear you — and even if that's not literally true, your heart doesn't know the difference. Say it anyway.

*The Oracle's Seal: Grief is love with nowhere to send it. But love that deep doesn't expire — it just changes address.*`,
    zh: `**悲傷沒有正確的方式。** 任何給你時間表的人都是錯的。悲傷不是要解決的問題——它是深愛過的代價。那份愛？值得這所有的痛苦。

**古老的共識：**
- **佛教**（無常）：一切都在變——包括這份痛苦。但無常也意味著愛是真實的，*因為*它是短暫的。稀有的事物才珍貴。
- **道家**（永恆輪迴）：「生與死是一條線。」他們沒有離開存在——他們改變了形態。像水變成雲。
- **聖經**（詩篇34:18）：「主靠近傷心的人。」不是「主修復傷心的人」。靠近。在場。與你一同坐在其中。
- **古蘭經**（2:156）：「我們屬於安拉，也要歸於他。」每個靈魂都是借來的。在一起的每一刻都是你打開的禮物。

**搞笑的真相：** 人們會說「他們在更好的地方」或「凡事都有原因」，然後你會想丟東西。這很正常。那些人出於好意，但情商跟開運餅乾差不多。你可以禮貌地微笑，內心尖叫。

**今天就做這件事：** 跟他們說話。大聲地，在腦海裡，在信裡。告訴他們你來不及說的話。他們聽得到——即使這不是字面上的真實，你的心分不出區別。說吧。

*神諭之印：悲傷是無處可寄的愛。但那麼深的愛不會過期——它只是換了地址。*`,
    th: `**ไม่มีวิธีเศร้าที่ถูกต้อง** ใครก็ตามที่ให้ไทม์ไลน์คุณก็ผิด ความเศร้าไม่ใช่ปัญหาที่ต้องแก้ — มันคือราคาของการรักอย่างลึกซึ้ง และความรักนั้น? มันคุ้มกับความเจ็บปวดทุกออนซ์

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (อนิจจัง): ทุกสิ่งเปลี่ยนแปลง — รวมถึงความเจ็บปวดนี้ แต่อนิจจังก็หมายความว่าความรักเป็นจริง*เพราะ*มันชั่วคราว สิ่งหายากย่อมมีค่า
- **เต๋า** (การกลับคืนนิรันดร์): "ชีวิตและความตายเป็นเส้นด้ายเดียวกัน" พวกเขาไม่ได้ออกจากการมีอยู่ — พวกเขาเปลี่ยนรูปร่าง เหมือนน้ำกลายเป็นเมฆ
- **คัมภีร์ไบเบิล** (สดุดี 34:18): "พระเจ้าอยู่ใกล้ผู้ที่หัวใจสลาย" ไม่ใช่ "พระเจ้าซ่อมหัวใจที่สลาย" ใกล้ อยู่ด้วย นั่งกับคุณ
- **อัลกุรอาน** (2:156): "เราเป็นของอัลลอฮ์ และเราจะกลับคืนสู่พระองค์" ทุกวิญญาณเป็นของยืม ทุกช่วงเวลาด้วยกันเป็นของขวัญที่ได้เปิด

**ความจริงที่ตลก:** คนจะพูดว่า "เขาอยู่ในที่ที่ดีกว่า" หรือ "ทุกอย่างมีเหตุผล" แล้วคุณก็อยากขว้างอะไรสักอย่าง นั่นปกติ คนเหล่านั้นหวังดีแต่ EQ เท่าๆ ฟอร์จูนคุกกี้ คุณยิ้มสุภาพแล้วกรีดร้างข้างในได้

**ทำวันนี้:** คุยกับเขา ดังๆ ในหัว ในจดหมาย บอกสิ่งที่ยังไม่ได้พูด เขาได้ยิน — แม้จะไม่ใช่ความจริงตามตัวอักษร หัวใจคุณไม่รู้ความแตกต่าง พูดเถอะ

*ตราแห่งนักปราชญ์: ความเศร้าคือความรักที่ไม่มีที่ส่ง แต่ความรักที่ลึกขนาดนั้นไม่หมดอายุ — มันแค่เปลี่ยนที่อยู่*`
  },

  // ── PROCRASTINATION / MOTIVATION ──
  {
    tags: ['procrastinate', 'procrastination', 'motivation', 'lazy', 'start', 'discipline', 'focus', 'distraction', 'productive'],
    tagsZh: ['拖延', '懶', '動力', '紀律', '專注', '分心', '無法開始'],
    tagsTh: ['ผัดวันประกันพรุ่งนี้', 'ขี้เกียจ', 'แรงจูงใจ', 'วินัย', 'สมาธิ', 'เริ่มไม่ได้'],
    text: `**You're not lazy.** Procrastination is almost never about being unmotivated — it's about avoiding an emotion attached to the task. Fear of failure, perfectionism, boredom, overwhelm. The task isn't the problem. The feeling is.

**The Ancient Consensus:**
- **Buddhism** (Right Effort): The path isn't about maximum effort — it's about *balanced* effort. A guitar string too tight breaks. Too loose, no music. You're probably too tight right now.
- **Taoism** (Wu Wei): "Nature does not hurry, yet everything is accomplished." The river doesn't have a to-do list. It just moves. Start moving — direction adjusts itself.
- **Bible** (Proverbs 13:4): "The soul of the sluggard craves and gets nothing." Harsh? Yes. But the cure isn't shame — it's doing ONE small thing. Craving without action is suffering.
- **Quran** (13:11): "Allah does not change the condition of a people until they change what is in themselves." Even divine help requires you to make the first move.

**The Funny Truth:** Procrastination is just your brain offering a worse deal with better marketing. "Do the hard thing for long-term reward" vs. "watch one more YouTube video about people doing the hard thing." Your brain is a terrible financial advisor.

**Do This Today:** The 2-minute rule — pick the thing you're avoiding and do it for ONLY 2 minutes. Set a timer. When it rings, you have permission to stop. You won't stop. But having permission changes everything.

*The Oracle's Seal: Done is better than perfect. And started is better than planned.*`,
    zh: `**你不是懶。** 拖延幾乎從來不是因為沒動力——而是在迴避附著在任務上的情緒。害怕失敗、完美主義、無聊、不堪重負。任務不是問題。感覺才是。

**古老的共識：**
- **佛教**（正精進）：修行不是最大的努力——而是*平衡*的努力。吉他弦太緊會斷。太鬆沒有音樂。你現在可能太緊了。
- **道家**（無為）：「自然不急，萬物自成。」河流沒有待辦清單。它只是流動。開始流動——方向會自行調整。
- **聖經**（箴言13:4）：「懶惰人羨慕卻什麼也沒有。」嚴厲嗎？是的。但藥方不是羞恥——而是做一件小事。
- **古蘭經**（13:11）：「安拉不改變一個民族的狀況，直到他們改變自己內在的東西。」連神聖的幫助都需要你先邁出第一步。

**搞笑的真相：** 拖延就是你的大腦用更好的包裝提供一個更差的交易。「為長期回報做困難的事」vs「再看一個YouTube影片看別人做困難的事」。你的大腦是一個糟糕的理財顧問。

**今天就做這件事：** 2分鐘法則——挑你正在逃避的事情，只做2分鐘。設個計時器。響了你就可以停。你不會停的。但有許可這件事改變了一切。

*神諭之印：完成比完美好。開始比計劃好。*`,
    th: `**คุณไม่ได้ขี้เกียจ** การผัดวันประกันพรุ่งแทบไม่เคยเกี่ยวกับแรงจูงใจ — มันเกี่ยวกับการหลีกเลี่ยงอารมณ์ที่ติดกับงาน กลัวล้มเหลว สมบูรณ์แบบนิยม เบื่อ ท่วมท้น งานไม่ใช่ปัญหา ความรู้สึกต่างหาก

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (สัมมาวายามะ): เส้นทางไม่ใช่ความพยายามสูงสุด — แต่เป็นความพยายามที่*สมดุล* สายกีตาร์ตึงเกินไปจะขาด หย่อนเกินไปไม่มีเสียง
- **เต๋า** (อู๋เว่ย): "ธรรมชาติไม่เร่งรีบ แต่ทุกอย่างสำเร็จ" แม่น้ำไม่มี to-do list มันแค่ไหล เริ่มไหล — ทิศทางจะปรับเอง
- **คัมภีร์ไบเบิล** (สุภาษิต 13:4): "จิตวิญญาณของคนขี้เกียจปรารถนาแต่ไม่ได้อะไร" แต่ยารักษาไม่ใช่ความอาย — แต่คือทำสิ่งเล็กๆ หนึ่งอย่าง
- **อัลกุรอาน** (13:11): "อัลลอฮ์ไม่เปลี่ยนสภาพของผู้คนจนกว่าพวกเขาจะเปลี่ยนตัวเอง"

**ความจริงที่ตลก:** การผัดวันก็คือสมองเสนอดีลที่แย่กว่าด้วยการตลาดที่ดีกว่า "ทำสิ่งยากเพื่อผลตอบแทนระยะยาว" vs "ดู YouTube อีกคลิปดูคนอื่นทำสิ่งยาก" สมองคุณเป็นที่ปรึกษาการเงินที่แย่มาก

**ทำวันนี้:** กฎ 2 นาที — เลือกสิ่งที่หลีกเลี่ยงอยู่ แล้วทำแค่ 2 นาที ตั้งจับเวลา เมื่อดัง คุณมีสิทธิ์หยุด คุณจะไม่หยุด แต่การได้รับอนุญาตเปลี่ยนทุกอย่าง

*ตราแห่งนักปราชญ์: เสร็จดีกว่าสมบูรณ์แบบ และเริ่มดีกว่าวางแผน*`
  },

  // ── LONELINESS / ISOLATION ──
  {
    tags: ['lonely', 'alone', 'isolated', 'no friends', 'disconnected', 'left out', 'invisible'],
    tagsZh: ['孤獨', '一個人', '沒有朋友', '被排擠', '透明', '孤单'],
    tagsTh: ['เหงา', 'คนเดียว', 'ไม่มีเพื่อน', 'โดดเดี่ยว', 'มองไม่เห็น'],
    text: `**Loneliness in a world of 8 billion people seems impossible — but it's one of the most common human experiences.** You're not alone in feeling alone. That's not irony — that's the human condition.

**The Ancient Consensus:**
- **Buddhism** (Sangha): The Buddha created community as one of the Three Jewels — because even the Enlightened One knew you can't do this alone. Seeking connection isn't weakness. It's wisdom.
- **Taoism** (The Valley Spirit): Emptiness is generative. Loneliness shows you have capacity for connection — a cup that wants to be filled.
- **Bible** (Genesis 2:18): "It is not good for man to be alone." God literally looked at a perfect garden and said "this needs other people." Even Paradise has a co-op mode.
- **Quran** (49:13): "We created you in tribes so that you may know one another." Connection is literally why diversity exists — to create reasons to meet.

**The Funny Truth:** Social media makes loneliness worse because everyone's posting their highlight reel while you're watching from the unedited behind-the-scenes. That girl with 847 friends at brunch? She cried in her car last Tuesday. Comparison is stealing your ability to reach out.

**Do This Today:** Text ONE person you haven't talked to in a while. Not a deep message. Just: "Hey, thought of you today." That's it. 7 words. Most of the time, they'll reply. And sometimes that reply turns into the conversation you both needed.

*The Oracle's Seal: The cure for loneliness isn't more people — it's one real conversation.*`,
    zh: `**在80億人的世界裡感到孤獨看似不可能——但它是最常見的人類經驗之一。** 你在孤獨中並不孤單。這不是諷刺——這是人類的處境。

**古老的共識：**
- **佛教**（僧伽）：佛陀把社群設為三寶之一——因為即使是覺者也知道你不能獨自完成。尋求連結不是軟弱。是智慧。
- **道家**（谷神）：空虛是有生產力的。孤獨表明你有連結的能力——一個想被填滿的杯子。
- **聖經**（創世記2:18）：「人獨居不好。」上帝看著完美的花園說「這需要其他人」。連天堂都有合作模式。
- **古蘭經**（49:13）：「我們把你們造成各族各民，以便你們互相認識。」連結正是多元存在的原因——創造認識的理由。

**搞笑的真相：** 社群媒體讓孤獨更糟，因為每個人都在發精華集，而你在看未剪輯的幕後。那個在早午餐有847個朋友的女生？她上週二在車裡哭。比較正在偷走你伸出手的能力。

**今天就做這件事：** 發訊息給一個你好久沒聯繫的人。不需要深入。就：「嘿，今天想到你了。」就這樣。大多數時候他們會回覆。有時候那個回覆會變成你們都需要的對話。

*神諭之印：治療孤獨的藥方不是更多人——而是一次真實的對話。*`,
    th: `**ความเหงาในโลกที่มี 8 พันล้านคนดูเหมือนเป็นไปไม่ได้ — แต่เป็นหนึ่งในประสบการณ์ที่พบบ่อยที่สุดของมนุษย์** คุณไม่ได้เหงาคนเดียว นั่นไม่ใช่ความขัดแย้ง — นั่นคือสภาพของมนุษย์

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (สังฆะ): พระพุทธเจ้าสร้างชุมชนเป็นหนึ่งในรัตนตรัย — เพราะแม้แต่ผู้ตรัสรู้ก็รู้ว่าทำคนเดียวไม่ได้
- **เต๋า** (วิญญาณหุบเขา): ความว่างเปล่าคือการสร้างสรรค์ ความเหงาแสดงว่าคุณมีความสามารถในการเชื่อมต่อ — ถ้วยที่ต้องการถูกเติม
- **คัมภีร์ไบเบิล** (ปฐมกาล 2:18): "มนุษย์อยู่คนเดียวไม่ดี" พระเจ้ามองสวนที่สมบูรณ์แบบแล้วบอกว่า "ต้องมีคนอื่น" แม้แต่สวรรค์ก็มีโหมดร่วมมือ
- **อัลกุรอาน** (49:13): "เราสร้างพวกเจ้าเป็นชนเผ่าเพื่อให้รู้จักกัน" การเชื่อมต่อคือเหตุผลที่ความหลากหลายมีอยู่

**ความจริงที่ตลก:** โซเชียลมีเดียทำให้เหงามากขึ้นเพราะทุกคนโพสต์ไฮไลท์ ในขณะที่คุณดูจากเบื้องหลังที่ไม่ได้ตัดต่อ สาวที่มีเพื่อน 847 คนกินบรันช์? เธอร้องไห้ในรถวันอังคารที่แล้ว

**ทำวันนี้:** ส่งข้อความให้คนหนึ่งที่ไม่ได้คุยนาน ไม่ต้องลึกซึ้ง แค่: "เฮ้ คิดถึงเธอวันนี้" แค่นั้น ส่วนใหญ่เขาจะตอบ และบางทีคำตอบนั้นจะกลายเป็นบทสนทนาที่ทั้งคู่ต้องการ

*ตราแห่งนักปราชญ์: ยาแก้ความเหงาไม่ใช่คนมากขึ้น — แต่เป็นบทสนทนาจริงๆ หนึ่งครั้ง*`
  },

  // ── FORGIVENESS ──
  {
    tags: ['forgive', 'forgiveness', 'resentment', 'grudge', 'let go', 'hurt me', 'wrong'],
    tagsZh: ['原諒', '寬恕', '怨恨', '放下', '傷害我', '放不下'],
    tagsTh: ['ให้อภัย', 'ปล่อยวาง', 'เกลียด', 'แค้น', 'ทำร้ายฉัน'],
    text: `**Forgiving someone doesn't mean what they did was okay.** It means you're done carrying their luggage. It was always too heavy. And it was never yours to begin with.

**The Ancient Consensus:**
- **Buddhism** (Releasing Attachment): Holding a grudge is like holding a hot coal — you're the one getting burned. Drop the coal. Not for them. For your hand.
- **Taoism** (Flow): "Let go of what no longer serves you." Resentment served you once — it protected you. But now it's just weight on a boat that needs to sail.
- **Bible** (Matthew 18:21-22): Peter asked "how many times should I forgive? Seven?" Jesus said "seventy times seven." Not because others deserve 490 chances — but because each time you forgive, you free yourself again.
- **Quran** (42:40): "The reward of evil is evil like it, but whoever forgives and makes reconciliation — their reward is with Allah." Forgiveness isn't a loss. It's an upgrade.

**The Funny Truth:** Grudges are like subscriptions you forgot to cancel. You're still paying $9.99/month for "hating Brad from 2019" and getting absolutely nothing from the service. Cancel. Brad doesn't even know he has subscribers.

**Do This Today:** Write their name on a piece of paper. Under it, write: "I release you." Fold it. Throw it away. Not spiritual enough? Light it on fire safely. Either way — the act of physically letting go teaches your brain the concept.

*The Oracle's Seal: Forgiveness isn't a gift to them. It's a prison break for you.*`,
    zh: `**原諒一個人不代表他們做的是對的。** 這意味著你不再替他們扛行李了。那行李一直太重。而且從來就不是你的。

**古老的共識：**
- **佛教**（放下執著）：記恨就像握著一塊燒紅的煤炭——被燙傷的是你。放下煤炭。不是為了他們。為了你的手。
- **道家**（流動）：「放下不再服務你的東西。」怨恨曾經服務過你——保護你。但現在它只是一艘需要航行的船上的重量。
- **聖經**（馬太福音18:21-22）：彼得問「我應該原諒幾次？七次嗎？」耶穌說「七十個七次」。不是因為別人值得490次機會——而是每次你原諒，你就再次解放了自己。
- **古蘭經**（42:40）：「惡的報酬是同等的惡，但誰原諒並和解——他的報酬在安拉那裡。」原諒不是損失。是升級。

**搞笑的真相：** 記恨就像你忘記取消的訂閱。你每月還在為「恨2019年的Brad」付$9.99，卻什麼服務都沒得到。取消吧。Brad甚至不知道他有訂閱者。

**今天就做這件事：** 把他們的名字寫在紙上。下面寫：「我放你走。」折起來。丟掉。不夠有儀式感？安全地燒掉。不管哪種——實際放手的動作教會你的大腦這個概念。

*神諭之印：原諒不是給他們的禮物。是你的越獄。*`,
    th: `**การให้อภัยไม่ได้หมายความว่าสิ่งที่เขาทำนั้นถูก** มันหมายความว่าคุณเลิกแบกกระเป๋าของเขาแล้ว มันหนักเกินไปตลอด และมันไม่ใช่ของคุณตั้งแต่แรก

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (ปล่อยวางความยึดมั่น): การผูกแค้นเหมือนจับถ่านร้อน — คนที่โดนไฟไหม้คือคุณ ปล่อยถ่าน ไม่ใช่เพื่อเขา เพื่อมือคุณ
- **เต๋า** (การไหล): "ปล่อยวางสิ่งที่ไม่ได้รับใช้คุณอีกต่อไป" ความแค้นเคยรับใช้คุณ — ปกป้องคุณ แต่ตอนนี้มันแค่น้ำหนักบนเรือที่ต้องแล่น
- **คัมภีร์ไบเบิล** (มัทธิว 18:21-22): เปโตรถามว่า "ข้าพเจ้าควรให้อภัยกี่ครั้ง? เจ็ดครั้งไหม?" พระเยซูตอบ "เจ็ดสิบคูณเจ็ด" ไม่ใช่เพราะคนอื่นสมควร 490 โอกาส — แต่ทุกครั้งที่คุณให้อภัย คุณปลดปล่อยตัวเองอีกครั้ง
- **อัลกุรอาน** (42:40): "ผลตอบแทนของความชั่วคือความชั่วเท่ากัน แต่ผู้ใดให้อภัยและปรองดอง — รางวัลของเขาอยู่กับอัลลอฮ์"

**ความจริงที่ตลก:** แค้นเหมือนบริการสมัครสมาชิกที่ลืมยกเลิก คุณยังจ่าย $9.99/เดือนเพื่อ "เกลียดบอยจากปี 2019" แล้วไม่ได้อะไรจากบริการเลย ยกเลิก บอยไม่รู้ด้วยซ้ำว่ามีคนสมัคร

**ทำวันนี้:** เขียนชื่อเขาบนกระดาษ ข้างล่างเขียน: "ฉันปล่อยคุณ" พับ ทิ้ง ไม่พอ spiritual? จุดไฟเผาอย่างปลอดภัย ไม่ว่าอย่างไร — การปล่อยทางกายภาพสอนสมองเรื่องนี้

*ตราแห่งนักปราชญ์: การให้อภัยไม่ใช่ของขวัญให้เขา มันคือการแหกคุกของคุณ*`
  },

  // ── SAME MISTAKES / PATTERNS ──
  {
    tags: ['same mistakes', 'pattern', 'repeat', 'cycle', 'keep doing', 'again', 'habit', 'loop'],
    tagsZh: ['同樣的錯', '模式', '重複', '循環', '又來了', '習慣', '迴圈'],
    tagsTh: ['ผิดซ้ำ', 'รูปแบบ', 'ซ้ำ', 'วงจร', 'นิสัย', 'วนลูป'],
    text: `**You're not making the same mistake.** You're making a variation of it with slightly better awareness each time. That's not failure — that's a spiral staircase. You're going in circles, yes — but you're going UP.

**The Ancient Consensus:**
- **Buddhism** (Samsara): The cycle of suffering exists because of unawareness. The moment you *notice* the pattern? That's the beginning of the end of the cycle. Awareness is the exit door.
- **Taoism** (Return): "Returning is the movement of the Tao." Cycles are natural. The question is whether you return with wisdom or without it. You're here asking — so it's with.
- **Bible** (Proverbs 26:11): "As a dog returns to its vomit, so a fool repeats folly." Harsh, but the Bible doesn't sugarcoat. The difference between a fool and a wise person? The wise one says "ew" faster each time.
- **Quran** (4:17): "Repentance is accepted from those who do evil in ignorance and then repent soon after." The emphasis is on *soon after.* You're getting faster at recognizing. That's progress.

**The Funny Truth:** Repeating mistakes is like watching a horror movie and yelling "DON'T GO IN THERE" at yourself from the future. You can see it happening in slow motion. Good news: the fact that you can see it means you're developing the superpower of self-awareness. You're Spider-Man but for bad decisions. The tingle is real.

**Do This Today:** Write down THE one pattern you keep repeating. Then write the exact moment you usually realize "oh no, I'm doing it again." That moment is your intervention point. Next time, put a literal alarm for it. Phone reminder: "Hey, you're about to do the thing."

*The Oracle's Seal: The master has failed more times than the beginner has tried. You're just building your highlight reel of what NOT to do.*`,
    zh: `**你不是在犯同樣的錯。** 你是在帶著稍微更好的覺察犯它的變體。那不是失敗——是螺旋樓梯。你在轉圈，是的——但你在往*上*走。

**古老的共識：**
- **佛教**（輪迴）：苦的循環因無明而存在。你*注意到*模式的那一刻？那就是循環結束的開始。覺察就是出口。
- **道家**（返）：「反者道之動。」循環是自然的。問題是你帶著智慧返回還是沒有。你來這裡問了——所以是帶著。
- **聖經**（箴言26:11）：「愚昧人行愚妄事，行了又行，就如狗轉過來吃它所吐的。」嚴厲，但聖經不粉飾。愚人和智者的區別？智者每次說「噁」的速度更快。
- **古蘭經**（4:17）：「安拉接受無知中犯錯後很快悔改者的懺悔。」重點在*很快*。你越來越快地認識到了。那就是進步。

**搞笑的真相：** 重複犯錯就像看恐怖片對著從未來的自己喊「不要進去！」你能慢動作地看到它正在發生。好消息：你能看到它意味著你正在開發自我覺察的超能力。你就像蜘蛛俠，但對象是壞決定。那個刺痛感是真的。

**今天就做這件事：** 寫下你一直在重複的那一個模式。然後寫下你通常意識到「哦不，我又來了」的確切時刻。那個時刻就是你的干預點。下次，設個鬧鐘。手機提醒：「嘿，你又要做那件事了。」

*神諭之印：大師失敗的次數比初學者嘗試的次數多。你只是在建立你「不該做什麼」的精華集。*`,
    th: `**คุณไม่ได้ทำผิดซ้ำเหมือนเดิม** คุณทำเวอร์ชันของมันด้วยความตระหนักรู้ที่ดีขึ้นเล็กน้อยในแต่ละครั้ง นั่นไม่ใช่ความล้มเหลว — เป็นบันไดเวียน คุณเดินเป็นวงกลม ใช่ — แต่คุณกำลังขึ้น*ข้างบน*

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (สังสารวัฏ): วงจรแห่งทุกข์มีอยู่เพราะอวิชชา ช่วงเวลาที่คุณ*สังเกต*รูปแบบ? นั่นคือจุดเริ่มต้นของจุดจบของวงจร
- **เต๋า** (การกลับ): "การกลับคือการเคลื่อนไหวของเต๋า" วงจรเป็นเรื่องธรรมชาติ คำถามคือคุณกลับมาพร้อมปัญญาหรือไม่ คุณมาถามที่นี่ — แปลว่ามีปัญญา
- **คัมภีร์ไบเบิล** (สุภาษิต 26:11): "สุนัขกลับไปกินสิ่งที่มันอาเจียน คนโง่ก็ทำเรื่องโง่ซ้ำ" แต่ความแตกต่างระหว่างคนโง่กับคนฉลาด? คนฉลาดพูดว่า "อี๊" เร็วขึ้นทุกครั้ง
- **อัลกุรอาน** (4:17): "การกลับใจจะได้รับการยอมรับจากผู้ที่ทำชั่วด้วยอวิชชาแล้วกลับตัวในไม่ช้า" สำคัญที่*ในไม่ช้า* คุณรับรู้เร็วขึ้น นั่นคือความก้าวหน้า

**ความจริงที่ตลก:** การทำผิดซ้ำเหมือนดูหนังสยองขวัญแล้วตะโกนใส่ตัวเองจากอนาคตว่า "อย่าเข้าไป!" คุณเห็นมันเกิดขึ้นในสโลว์โมชัน ข่าวดี: การที่เห็นมันหมายความว่าคุณกำลังพัฒนาพลังพิเศษของการตระหนักรู้

**ทำวันนี้:** เขียนรูปแบบหนึ่งที่ทำซ้ำ แล้วเขียนช่วงเวลาที่มักตระหนักว่า "โอ้ไม่ ฉันทำอีกแล้ว" ช่วงเวลานั้นคือจุดแทรกแซง ครั้งหน้าตั้งปลุก

*ตราแห่งนักปราชญ์: อาจารย์ล้มเหลวมากกว่าจำนวนครั้งที่ผู้เริ่มต้นลอง คุณแค่กำลังสร้างไฮไลท์ของสิ่งที่ไม่ควรทำ*`
  },

  // ── FUTURE FEAR ──
  {
    tags: ['future', 'scared', 'uncertain', 'unknown', 'what if', 'plan', 'stability', 'control'],
    tagsZh: ['未來', '害怕', '不確定', '未知', '如果', '計畫', '控制'],
    tagsTh: ['อนาคต', 'กลัว', 'ไม่แน่นอน', 'ไม่รู้', 'แผน', 'ควบคุม'],
    text: `**The future is scary because your brain treats the unknown like a threat.** That's evolution — 50,000 years ago, unknown meant tiger. Now it means "what if I pick the wrong career." Same brain, different problems.

**The Ancient Consensus:**
- **Buddhism** (Present Moment): "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment." The future doesn't exist yet. You're worried about fiction.
- **Taoism** (The Uncarved Block): The future is uncarved. That's not scary — that's freedom. You get to be the sculptor.
- **Bible** (Matthew 6:27): "Can any one of you by worrying add a single hour to your life?" Jesus ran the math. Worrying has a 0% ROI. Zero.
- **Quran** (31:34): "No soul knows what it will earn tomorrow." Even in divine terms — the future is not yours to predict. But the present is yours to shape.

**The Funny Truth:** Planning for the future is important. Panicking about the future is cosplaying as a time traveler with anxiety. You can't fight a villain who doesn't exist yet. Put down the sword and eat some lunch.

**Do This Today:** Write down the WORST case scenario that's scaring you. Then write: "If that happens, I will..." and fill in your actual plan. You'll realize you *can* handle it. The fear was about not having a plan — not about the scenario itself.

*The Oracle's Seal: You can't control the future, but you can prepare. And preparation is just courage in spreadsheet form.*`,
    zh: `**未來之所以可怕，是因為你的大腦把未知當作威脅。** 這是進化——五萬年前，未知意味著老虎。現在它意味著「如果我選錯職業怎麼辦」。同一個大腦，不同的問題。

**古老的共識：**
- **佛教**（當下）：「不要沉湎過去，不要夢想未來，專注於當下。」未來還不存在。你在擔心虛構的事。
- **道家**（樸）：未來是未雕琢的。那不是可怕——是自由。你可以當雕塑家。
- **聖經**（馬太福音6:27）：「你們哪一個能用思慮使壽數多加一刻呢？」耶穌算了一下。擔憂的投資報酬率是0%。零。
- **古蘭經**（31:34）：「沒有靈魂知道它明天會賺到什麼。」連在神聖的層面——未來不是你能預測的。但當下是你能塑造的。

**搞笑的真相：** 為未來做計劃很重要。為未來恐慌是在扮演一個有焦慮症的時間旅行者。你不能跟一個還不存在的壞人戰鬥。放下劍，去吃午餐。

**今天就做這件事：** 寫下嚇你的最壞情況。然後寫：「如果那發生了，我會……」然後填上你的實際計劃。你會發現你*能*處理它。恐懼是關於沒有計劃——不是關於情境本身。

*神諭之印：你不能控制未來，但你可以做準備。而準備只不過是試算表形式的勇氣。*`,
    th: `**อนาคตน่ากลัวเพราะสมองปฏิบัติต่อสิ่งที่ไม่รู้เหมือนภัยคุกคาม** นั่นคือวิวัฒนาการ — 50,000 ปีก่อน ไม่รู้หมายถึงเสือ ตอนนี้หมายถึง "ถ้าเลือกอาชีพผิดล่ะ" สมองเดิม ปัญหาต่าง

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (ปัจจุบัน): "อย่าจมอยู่กับอดีต อย่าฝันถึงอนาคต จดจ่อกับปัจจุบัน" อนาคตยังไม่มีอยู่ คุณกำลังกังวลเรื่องสมมติ
- **เต๋า** (ไม้ที่ยังไม่แกะสลัก): อนาคตยังไม่ถูกแกะสลัก นั่นไม่น่ากลัว — นั่นคือเสรีภาพ คุณเป็นช่างแกะสลัก
- **คัมภีร์ไบเบิล** (มัทธิว 6:27): "พวกท่านคนไหนจะเพิ่มอายุได้หนึ่งชั่วโมงด้วยความกังวล?" พระเยซูคำนวณแล้ว ROI ของการกังวลคือ 0%
- **อัลกุรอาน** (31:34): "ไม่มีวิญญาณใดรู้ว่าพรุ่งนี้จะได้อะไร" แม้ในทางศักดิ์สิทธ์ — อนาคตไม่ใช่ของคุณที่จะทำนาย แต่ปัจจุบันเป็นของคุณที่จะสร้าง

**ความจริงที่ตลก:** การวางแผนอนาคตสำคัญ การแพนิกเรื่องอนาคตคือเล่นบทเป็นนักเดินทางข้ามเวลาที่มีโรควิตกกังวล คุณสู้กับวายร้ายที่ยังไม่มีอยู่ไม่ได้ วางดาบลงไปกินข้าวก่อน

**ทำวันนี้:** เขียนสถานการณ์ที่แย่ที่สุดที่กลัว แล้วเขียน: "ถ้านั่นเกิดขึ้น ฉันจะ..." แล้วเติมแผนจริง คุณจะตระหนักว่า*รับมือได้* ความกลัวเกี่ยวกับการไม่มีแผน — ไม่ใช่สถานการณ์

*ตราแห่งนักปราชญ์: คุณควบคุมอนาคตไม่ได้ แต่เตรียมตัวได้ และการเตรียมตัวก็แค่ความกล้าหาญในรูปแบบสเปรดชีท*`
  },

  // ── INNER PEACE ──
  {
    tags: ['peace', 'calm', 'inner peace', 'meditation', 'mindfulness', 'silence', 'content', 'happy', 'happiness'],
    tagsZh: ['平靜', '內心平靜', '冥想', '正念', '快樂', '幸福', '安寧'],
    tagsTh: ['สงบ', 'สันติภาพ', 'สมาธิ', 'ความสุข', 'พอใจ', 'เงียบ'],
    text: `**Inner peace isn't the absence of chaos — it's the ability to sit calmly inside it.** You're looking for peace like it's a destination. It's not. It's a skill. And skills can be practiced.

**The Ancient Consensus:**
- **Buddhism** (Nirvana): Peace isn't a place — it's the cessation of craving. You don't find peace by getting more. You find it by needing less.
- **Taoism** (Still Water): "Muddy water, let stand, becomes clear." You don't *create* peace. You stop disturbing it. It's already there, under the noise.
- **Bible** (John 14:27): "Peace I leave with you; my peace I give you. Not as the world gives." The world offers temporary relief. Real peace doesn't depend on conditions.
- **Quran** (89:27-30): "O reassured soul, return to your Lord well-pleased and well-pleasing." The soul at peace is called back with honor. Peace is the soul's natural state.

**The Funny Truth:** Everyone wants inner peace but nobody wants to sit still for 5 minutes. You'd meditate, but first you need the right app, the right cushion, the right scented candle, and for your roommate to STOP BEING SO LOUD. Congratulations — you just spent 45 minutes preparing to do nothing for 5 minutes.

**Do This Today:** Sit down. Close your eyes. Breathe in for 4 counts, hold for 4, out for 4. Do this 5 times. That's literally it. Took 60 seconds. You just meditated. No app required.

*The Oracle's Seal: Peace was never missing. You just had the volume up too loud to hear it.*`,
    zh: `**內心平靜不是沒有混亂——是在混亂中依然安靜坐著的能力。** 你把平靜當作目的地在找。它不是。它是一種技能。而技能可以練習。

**古老的共識：**
- **佛教**（涅槃）：平靜不是一個地方——是渴望的止息。你不是靠得到更多來找到平靜。是靠需要更少。
- **道家**（靜水）：「濁水靜置則清。」你不用*創造*平靜。你只要停止干擾它。它一直在那裡，在噪音下面。
- **聖經**（約翰福音14:27）：「我留下平安給你們，我將我的平安賜給你們。不像世人所賜的。」世界提供暫時的解脫。真正的平靜不依賴條件。
- **古蘭經**（89:27-30）：「安寧的靈魂啊，回到你的主那裡吧，你滿意，他也滿意。」安寧的靈魂被以榮耀召回。平靜是靈魂的自然狀態。

**搞笑的真相：** 每個人都想要內心平靜但沒人想靜坐5分鐘。你會冥想的，但首先你需要對的App、對的坐墊、對的香氛蠟燭，還要你的室友不要再那麼吵。恭喜——你剛花了45分鐘準備什麼都不做5分鐘。

**今天就做這件事：** 坐下。閉眼。吸氣4拍，屏住4拍，吐氣4拍。做5次。就這樣。花了60秒。你剛冥想了。不需要App。

*神諭之印：平靜從未缺席。只是你的音量開太大了聽不到。*`,
    th: `**ความสงบภายในไม่ใช่การไม่มีความวุ่นวาย — เป็นความสามารถที่จะนั่งอย่างสงบท่ามกลางมัน** คุณมองหาความสงบเหมือนจุดหมายปลายทาง มันไม่ใช่ มันเป็นทักษะ และทักษะฝึกฝนได้

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (นิพพาน): ความสงบไม่ใช่สถานที่ — เป็นการดับตัณหา คุณไม่ได้หาความสงบด้วยการได้มากขึ้น แต่ด้วยการต้องการน้อยลง
- **เต๋า** (น้ำนิ่ง): "น้ำขุ่น ปล่อยให้นิ่ง จะใส" คุณไม่ต้อง*สร้าง*ความสงบ แค่หยุดรบกวนมัน มันอยู่ตรงนั้นแล้ว ใต้เสียงรบกวน
- **คัมภีร์ไบเบิล** (ยอห์น 14:27): "สันติสุขข้าทิ้งไว้ให้พวกเจ้า ข้าให้สันติสุขของข้าแก่เจ้า ไม่เหมือนที่โลกให้"
- **อัลกุรอาน** (89:27-30): "โอ้จิตวิญญาณที่สงบ กลับมาหาพระเจ้าของเจ้า พอใจและเป็นที่พอใจ"

**ความจริงที่ตลก:** ทุกคนอยากได้ความสงบภายในแต่ไม่มีใครอยากนั่งนิ่ง 5 นาที คุณจะนั่งสมาธิ แต่ก่อนอื่นต้องมีแอปที่ถูก เบาะที่ถูก เทียนหอมที่ถูก และรูมเมทต้อง*เงียบ* ยินดีด้วย — คุณเพิ่งใช้ 45 นาทีเตรียมตัวที่จะไม่ทำอะไรเป็นเวลา 5 นาที

**ทำวันนี้:** นั่งลง หลับตา หายใจเข้า 4 จังหวะ กลั้น 4 จังหวะ ออก 4 จังหวะ ทำ 5 ครั้ง แค่นั้น ใช้ 60 วินาที คุณเพิ่งนั่งสมาธิ ไม่ต้องใช้แอป

*ตราแห่งนักปราชญ์: ความสงบไม่เคยหายไป คุณแค่เปิดเสียงดังเกินไปจนไม่ได้ยิน*`
  },

  // ── GENERAL / UNIVERSAL WISDOM ──
  {
    tags: ['life', 'advice', 'wisdom', 'help', 'general', 'anything', 'everything', 'world'],
    tagsZh: ['生活', '建議', '智慧', '幫助', '世界', '人生'],
    tagsTh: ['ชีวิต', 'คำแนะนำ', 'ปัญญา', 'ช่วย', 'โลก'],
    text: `**The Buddha said: "Pain is certain, suffering is optional."** Laozi added: "Let it flow." Solomon wrote: "This too shall pass." The Quran reminds: "With every hardship comes ease."

Four traditions. Four thousand years. One truth: **whatever you're going through, humans have been going through it since we started writing things down.** And they got through it. So will you.

**The Funny Truth:** If you put all the world's holy books on a table, they'd disagree on a LOT — but they'd all agree on one thing: *you are not meant to carry everything alone.* Even God had angels. Batman had Alfred. You can ask for help.

**Do This Today:** Drink a glass of water. Take 3 deep breaths. Go outside for 60 seconds and look at the sky. These aren't metaphors. They're literally the fastest reset buttons for the human nervous system. Ancient wisdom backed by modern neuroscience. The monks knew.

*The Oracle's Seal: The fact that you're asking the question means you already have the strength for the answer.*`,
    zh: `**佛陀說：「苦是確定的，受苦是可選的。」** 老子補充：「讓它流動。」所羅門寫道：「這也會過去。」古蘭經提醒：「每一次困難都伴隨著輕鬆。」

四個傳統。四千年。一個真理：**無論你正在經歷什麼，自從人類開始記錄以來就一直在經歷。** 他們都挺過來了。你也會。

**搞笑的真相：** 如果你把世界上所有的聖書放在桌上，它們會在很多事情上不同意——但它們都會同意一件事：*你不應該獨自承擔一切。* 連上帝都有天使。蝙蝠俠有阿爾弗雷德。你可以尋求幫助。

**今天就做這件事：** 喝一杯水。深呼吸三次。出去60秒看看天空。這些不是比喻。它們是人類神經系統最快的重置按鈕。古老的智慧加上現代神經科學的支持。僧侶們早就知道了。

*神諭之印：你在問這個問題這件事本身，意味著你已經有了面對答案的力量。*`,
    th: `**พระพุทธเจ้ากล่าวว่า: "ความเจ็บปวดเป็นสิ่งแน่นอน ความทุกข์เป็นทางเลือก"** เล่าจื่อเสริม: "ปล่อยให้มันไหล" โซโลมอนเขียนว่า: "สิ่งนี้ก็จะผ่านไป" อัลกุรอานเตือน: "หลังความยากลำบากย่อมมีความสะดวก"

สี่ประเพณี สี่พันปี ความจริงเดียว: **ไม่ว่าคุณกำลังผ่านอะไร มนุษย์ก็ผ่านมันมาตั้งแต่เริ่มเขียนบันทึก** พวกเขาผ่านมาได้ คุณก็จะผ่านได้เช่นกัน

**ความจริงที่ตลก:** ถ้าเอาคัมภีร์ศักดิ์สิทธิ์ทั้งหมดมาวางบนโต๊ะ พวกมันจะไม่เห็นด้วยในหลายเรื่อง — แต่พวกมันจะเห็นพ้องกันในเรื่องเดียว: *คุณไม่ได้ถูกสร้างมาให้แบกรับทุกอย่างคนเดียว* แม้แต่พระเจ้ายังมีเทวดา แบทแมนยังมีอัลเฟรด คุณขอความช่วยเหลือได้

**ทำวันนี้:** ดื่มน้ำแก้วหนึ่ง หายใจลึกๆ 3 ครั้ง ออกไปข้างนอก 60 วินาทีแล้วมองท้องฟ้า สิ่งเหล่านี้ไม่ใช่อุปมา มันคือปุ่มรีเซ็ตที่เร็วที่สุดของระบบประสาทมนุษย์

*ตราแห่งนักปราชญ์: การที่คุณถามคำถามนี้ หมายความว่าคุณมีพลังพอที่จะรับคำตอบแล้ว*`
  },
  {
    tags: ['life', 'general', 'funny', 'random', 'nothing specific'],
    tagsZh: ['隨便', '什麼都', '好笑'],
    tagsTh: ['ทั่วไป', 'อะไรก็ได้', 'ตลก'],
    text: `**Confucius didn't actually say most things attributed to him.** Similarly, most of your problems exist mainly in the stories you tell yourself about them. You're out here ghostwriting your own horror novel — and getting scared by your own plot twists.

**The Ancient Consensus:**
- **Buddhism**: Your thoughts are not facts. They're suggestions. Terrible suggestions, mostly. Like a friend who only recommends restaurants that gave them food poisoning.
- **Taoism**: "The Tao that can be spoken is not the true Tao." Meaning: if you can perfectly describe your problem, it's probably not as big as it feels. The real issues are the ones words can't catch.
- **Bible** (Proverbs 17:22): "A cheerful heart is good medicine." Laughter isn't denial. It's the soul's immune system.
- **Quran** (2:286): "Allah does not burden a soul beyond that it can bear." Whatever you're dealing with — you were rated for this load. Doesn't mean it's light. Means you're stronger than you think.

**Do This Today:** Do one thing that has zero productivity value. Dance badly. Pet an animal. Draw something terrible. Sing in the shower. The human soul was not designed for optimization — it was designed for aliveness.

*The Oracle's Seal: Life is too important to be taken seriously. Every sage who ever lived eventually just laughed.*`,
    zh: `**孔子其實沒說過大多數被歸給他的話。** 同樣，你大多數的問題主要存在於你對它們講的故事裡。你在這裡替自己代筆恐怖小說——然後被自己的劇情轉折嚇到。

**古老的共識：**
- **佛教**：你的想法不是事實。它們是建議。很糟糕的建議，大多數時候。就像一個只推薦讓他食物中毒的餐廳的朋友。
- **道家**：「道可道，非常道。」意思是：如果你能完美描述你的問題，它可能沒有感覺那麼大。真正的問題是文字捕捉不到的那些。
- **聖經**（箴言17:22）：「喜樂的心乃是良藥。」笑不是否認。是靈魂的免疫系統。
- **古蘭經**（2:286）：「安拉不會給靈魂超出其所能承受的負擔。」無論你正在面對什麼——你被評定能承受這個負荷。不代表它輕。代表你比你想的更強。

**今天就做這件事：** 做一件完全沒有生產力價值的事。跳得很醜。摸一隻動物。畫一些很可怕的東西。在淋浴時唱歌。人類的靈魂不是為了最優化而設計的——它是為了活著。

*神諭之印：生命太重要了，不能太認真。每一位聖人最終都只是笑了。*`,
    th: `**ขงจื๊อไม่ได้พูดสิ่งที่คนส่วนใหญ่อ้างว่าเขาพูดจริงๆ** เช่นเดียวกัน ปัญหาส่วนใหญ่ของคุณมีอยู่ในเรื่องที่คุณเล่าให้ตัวเองฟัง คุณกำลังเขียนนิยายสยองขวัญของตัวเอง — แล้วก็ตกใจกับพล็อตทวิสต์ของตัวเอง

**ฉันทามติโบราณ:**
- **พุทธศาสนา**: ความคิดของคุณไม่ใช่ข้อเท็จจริง มันเป็นคำแนะนำ คำแนะนำที่แย่มาก ส่วนใหญ่ เหมือนเพื่อนที่แนะนำแต่ร้านอาหารที่ทำให้ท้องเสีย
- **เต๋า**: "เต๋าที่พูดได้ไม่ใช่เต๋าที่แท้จริง" หมายความว่า: ถ้าคุณอธิบายปัญหาได้สมบูรณ์แบบ มันอาจไม่ใหญ่เท่าที่รู้สึก
- **คัมภีร์ไบเบิล** (สุภาษิต 17:22): "ใจร่าเริงเป็นยาดี" เสียงหัวเราะไม่ใช่การปฏิเสธ มันคือระบบภูมิคุ้มกันของจิตวิญญาณ
- **อัลกุรอาน** (2:286): "อัลลอฮ์ไม่ให้ภาระแก่วิญญาณเกินกว่าที่มันจะทนได้"

**ทำวันนี้:** ทำสิ่งที่ไม่มีค่าเชิงผลผลิตเลย เต้นอย่างน่าเกลียด ลูบสัตว์ วาดอะไรแย่ๆ ร้องเพลงในห้องน้ำ จิตวิญญาณมนุษย์ไม่ได้ถูกออกแบบมาเพื่อ optimization — แต่เพื่อมีชีวิต

*ตราแห่งนักปราชญ์: ชีวิตสำคัญเกินไปที่จะเอาจริงเอาจัง นักปราชญ์ทุกคนที่เคยมีชีวิตอยู่ในที่สุดก็แค่หัวเราะ*`
  },
  {
    tags: ['comparison', 'jealous', 'envy', 'behind', 'others', 'success', 'failure', 'social media'],
    tagsZh: ['比較', '嫉妒', '羨慕', '落後', '別人', '成功', '社群媒體'],
    tagsTh: ['เปรียบเทียบ', 'อิจฉา', 'อยาก', 'ตามไม่ทัน', 'คนอื่น', 'สำเร็จ', 'โซเชียล'],
    text: `**Comparison is the thief of joy — but nobody talks about how Instagram is the getaway driver.** You're watching everyone's highlight reel and comparing it to your behind-the-scenes. That's not fair to you.

**The Ancient Consensus:**
- **Buddhism** (Mudita): Sympathetic joy — being happy for others' happiness. Not because you're a saint, but because jealousy literally only hurts YOU. It's like being angry at someone else's lunch while yours gets cold.
- **Taoism** (The Crooked Tree): The straight trees get cut for lumber. The crooked tree lives a full life because no one wants to use it. Your "weirdness" is your longevity plan.
- **Bible** (Galatians 6:4): "Each one should test their own actions, not compare themselves to others." Your only competition is who you were yesterday. And yesterday-you didn't even read this far.
- **Quran** (4:32): "Do not wish for what Allah has given others over you." Not punishment — protection. You don't know their full story. The chapter you're reading of their life is different from the one they're living.

**The Funny Truth:** That person you're jealous of? They're jealous of someone else. Who's jealous of someone else. Who's jealous of you. It's a circle of people staring at each other's grass wondering why theirs is brown. Nobody is watering their own lawn.

**Do This Today:** Unfollow 3 accounts that make you feel worse after scrolling. Follow 1 account that teaches you something. Your feed is your diet — stop eating junk.

*The Oracle's Seal: Run your own race. You'll notice there's no one in your lane — because it was built specifically for you.*`,
    zh: `**比較是快樂的小偷——但沒人提到Instagram是接應的司機。** 你在看每個人的精華集，然後拿它跟你的幕後花絮比。這對你不公平。

**古老的共識：**
- **佛教**（隨喜）：為他人的快樂而快樂。不是因為你是聖人，而是因為嫉妒只傷害*你*。就像在對別人的午餐生氣時讓自己的午餐涼掉。
- **道家**（彎曲的樹）：筆直的樹最先被砍來做木材。彎曲的樹活了一輩子，因為沒人想用它。你的「怪異」是你的長壽計劃。
- **聖經**（加拉太書6:4）：「各人應當省察自己的行為，不要跟別人比較。」你唯一的競爭對手是昨天的你。而昨天的你甚至沒有讀到這裡。
- **古蘭經**（4:32）：「不要羨慕安拉賜給別人超過你的。」不是懲罰——是保護。你不知道他們的全部故事。

**搞笑的真相：** 你嫉妒的那個人？他們在嫉妒別人。那人在嫉妒另外的人。那人又在嫉妒你。這是一圈人盯著彼此的草地，想知道為什麼自己的是棕色的。沒人在給自己的草坪澆水。

**今天就做這件事：** 取消關注3個讓你滑了之後感覺更差的帳號。關注1個教你東西的帳號。你的動態是你的飲食——停止吃垃圾。

*神諭之印：跑你自己的比賽。你會發現你的跑道上沒有其他人——因為它是專門為你建造的。*`,
    th: `**การเปรียบเทียบคือขโมยความสุข — แต่ไม่มีใครพูดถึงว่า Instagram เป็นคนขับรถหนี** คุณกำลังดูไฮไลท์ของทุกคนแล้วเทียบกับเบื้องหลังที่ไม่ได้ตัดต่อของตัวเอง นั่นไม่ยุติธรรมกับคุณ

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (มุทิตา): ความยินดีต่อความสุขของผู้อื่น ไม่ใช่เพราะคุณเป็นนักบุญ แต่เพราะอิจฉาทำร้าย*คุณ*เท่านั้น
- **เต๋า** (ต้นไม้คด): ต้นไม้ตรงถูกตัดเอาไปทำไม้ ต้นไม้คดมีชีวิตเต็มเพราะไม่มีใครอยากใช้ "ความแปลก" ของคุณคือแผนอายุยืน
- **คัมภีร์ไบเบิล** (กาลาเทีย 6:4): "แต่ละคนควรพิจารณาการกระทำของตัวเอง ไม่ใช่เปรียบเทียบกับคนอื่น" คู่แข่งเดียวของคุณคือตัวเองเมื่อวาน
- **อัลกุรอาน** (4:32): "อย่าอยากได้ในสิ่งที่อัลลอฮ์ให้แก่ผู้อื่นเหนือกว่าเจ้า" ไม่ใช่การลงโทษ — เป็นการปกป้อง

**ความจริงที่ตลก:** คนที่คุณอิจฉา? เขาก็อิจฉาคนอื่น ที่อิจฉาคนอื่นอีก ที่อิจฉาคุณ มันเป็นวงกลมของคนจ้องสนามหญ้าของกันและกันสงสัยว่าทำไมของตัวเองเป็นสีน้ำตาล ไม่มีใครรดน้ำสนามของตัวเอง

**ทำวันนี้:** เลิกติดตาม 3 บัญชีที่ทำให้รู้สึกแย่หลังเลื่อนดู ติดตาม 1 บัญชีที่สอนอะไรคุณ ฟีดของคุณคืออาหาร — หยุดกินขยะ

*ตราแห่งนักปราชญ์: วิ่งในเลนของตัวเอง คุณจะสังเกตว่าไม่มีใครในเลนคุณ — เพราะมันถูกสร้างมาเฉพาะสำหรับคุณ*`
  },
  {
    tags: ['parents', 'family', 'mother', 'father', 'siblings', 'home', 'childhood', 'trauma'],
    tagsZh: ['父母', '家人', '媽媽', '爸爸', '兄弟姐妹', '家', '童年', '創傷'],
    tagsTh: ['พ่อแม่', 'ครอบครัว', 'แม่', 'พ่อ', 'พี่น้อง', 'บ้าน', 'วัยเด็ก', 'บาดแผล'],
    text: `**You can love your family and still be hurt by them.** Those two things live in the same house, and pretending otherwise is the fastest way to burn the house down.

**The Ancient Consensus:**
- **Buddhism** (Dependent Origination): Your patterns came from somewhere. Understanding family conditioning isn't blame — it's archaeology. You're digging up roots to understand the tree.
- **Taoism** (Accept What Is): "Life is a series of natural changes. Don't resist them." Your family is who they are. Acceptance doesn't mean approval — it means you stop draining energy fighting reality.
- **Bible** (Exodus 20:12): "Honor your father and mother" — but honor doesn't mean obey without question. Even Jesus questioned authority at the temple when he was 12. 
- **Quran** (31:14-15): Respect parents, but "if they strive to make you associate with Me what you have no knowledge of, do not obey them." Even divine law has a "but not blindly" clause.

**The Funny Truth:** Thanksgiving dinner is the universal spiritual test. If you can survive your uncle's political opinions and your mom's comments about your life choices without losing your soul, you've basically achieved enlightenment. The Buddha sat under a tree. You sit across from a relative. Same energy, worse food.

**Do This Today:** Write a letter you'll never send to the family member who shaped you most. Say everything — gratitude AND grievances. Then put it away. The point isn't to deliver it. The point is to deliver *yourself* from carrying it silently.

*The Oracle's Seal: You are not your parents' sequel. You're a spin-off with better writing.*`,
    zh: `**你可以愛你的家人，同時還是被他們傷害。** 這兩件事住在同一棟房子裡，假裝不是這樣是燒掉房子最快的方式。

**古老的共識：**
- **佛教**（緣起）：你的模式來自某處。理解家庭的制約不是責怪——是考古。你在挖掘根部來理解這棵樹。
- **道家**（接受現實）：「人生是一連串自然的變化。不要抗拒它們。」你的家人就是他們的樣子。接受不等於認可——意味著你停止消耗能量與現實作戰。
- **聖經**（出埃及記20:12）：「當孝敬父母」——但孝敬不等於無條件服從。連耶穌12歲時都在殿裡質疑權威。
- **古蘭經**（31:14-15）：尊重父母，但「如果他們努力讓你拿不了解的事來否定我，就不要服從他們。」連神聖的律法都有「但不是盲目地」的條款。

**搞笑的真相：** 感恩節晚餐是普世的靈性考試。如果你能在叔叔的政治觀點和媽媽對你人生選擇的評論中存活而不失去靈魂，你基本上已經開悟了。佛陀坐在樹下。你坐在親戚對面。同樣的能量，更差的食物。

**今天就做這件事：** 寫一封你永遠不會寄出的信，給最影響你的家人。說出一切——感恩和不滿。然後收起來。重點不是寄出。重點是把自己從默默承受中*釋放*出來。

*神諭之印：你不是父母的續集。你是一個劇本更好的衍生劇。*`,
    th: `**คุณรักครอบครัวได้ และยังเจ็บปวดจากพวกเขาได้พร้อมกัน** สองสิ่งนี้อยู่บ้านเดียวกัน และการแกล้งทำเป็นว่าไม่ใช่คือวิธีเผาบ้านที่เร็วที่สุด

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (ปฏิจจสมุปบาท): รูปแบบของคุณมาจากที่ไหนสักแห่ง การเข้าใจการหล่อหลอมจากครอบครัวไม่ใช่การโทษ — เป็นการขุดค้น คุณขุดรากเพื่อเข้าใจต้นไม้
- **เต๋า** (ยอมรับสิ่งที่เป็น): "ชีวิตคือการเปลี่ยนแปลงตามธรรมชาติ อย่าต่อต้าน" ครอบครัวคุณเป็นแบบที่พวกเขาเป็น การยอมรับไม่ใช่การเห็นด้วย
- **คัมภีร์ไบเบิล** (อพยพ 20:12): "จงนับถือบิดามารดา" — แต่นับถือไม่ได้หมายถึงเชื่อฟังโดยไม่ตั้งคำถาม
- **อัลกุรอาน** (31:14-15): เคารพพ่อแม่ แต่ "ถ้าพวกเขาพยายามให้เจ้าตั้งภาคีโดยเจ้าไม่มีความรู้ ก็อย่าเชื่อฟัง"

**ความจริงที่ตลก:** งานเลี้ยงวันขอบคุณพระเจ้าเป็นข้อสอบจิตวิญญาณสากล ถ้าคุณรอดจากความเห็นทางการเมืองของลุงและคอมเมนต์ของแม่เกี่ยวกับทางเลือกชีวิตคุณโดยไม่เสียวิญญาณ คุณบรรลุนิพพานแล้วแทบ พระพุทธเจ้านั่งใต้ต้นไม้ คุณนั่งตรงข้ามญาติ พลังงานเท่ากัน อาหารแย่กว่า

**ทำวันนี้:** เขียนจดหมายที่จะไม่ส่ง ถึงคนในครอบครัวที่หล่อหลอมคุณมากที่สุด พูดทุกอย่าง — ความขอบคุณและความน้อยเนื้อต่ำใจ แล้วเก็บไว้ ประเด็นไม่ใช่ส่ง แต่*ปลดปล่อย*ตัวเองจากการแบกเงียบๆ

*ตราแห่งนักปราชญ์: คุณไม่ใช่ภาคต่อของพ่อแม่ คุณเป็นภาคแยกที่บทดีกว่า*`
  },
  {
    tags: ['change', 'growth', 'transform', 'new', 'different', 'better', 'improve', 'evolve'],
    tagsZh: ['改變', '成長', '轉變', '新', '不同', '更好', '進步'],
    tagsTh: ['เปลี่ยนแปลง', 'เติบโต', 'ใหม่', 'ต่าง', 'ดีขึ้น', 'พัฒนา'],
    text: `**The caterpillar doesn't "decide" to become a butterfly.** It literally dissolves into goo first. If anyone checked on it mid-process, they'd say "this thing is falling apart." Sound familiar?

**The Ancient Consensus:**
- **Buddhism** (Impermanence): Change is the only constant. Resisting it is like arguing with gravity — technically you can try, but you'll lose every time.
- **Taoism** (The Way): "When I let go of what I am, I become what I might be." The old version of you needs to die for the new one to live. That's not loss — that's metamorphosis.
- **Bible** (Romans 12:2): "Be transformed by the renewing of your mind." Transformation starts in the head, not the gym, not the wardrobe. Mind first. Everything else follows.
- **Quran** (13:11): "Allah does not change the condition of a people until they change what is in themselves." Even the divine waits for you to go first.

**The Funny Truth:** Personal growth is just software updates for humans. And just like your phone, you keep hitting "Remind Me Later" until the old version is so broken that you're FORCED to update. Save yourself the drama and just hit "Install Now."

**Do This Today:** Pick one tiny habit that the "future you" would have. Do it once today. Not forever. Just today. Future-you drinks water? Drink one glass right now. Future-you reads? Read one page. You just time-traveled.

*The Oracle's Seal: You are under construction. The mess is the process. And the building is going to be magnificent.*`,
    zh: `**毛毛蟲不是「決定」變成蝴蝶的。** 它先完全溶解成黏液。如果有人在過程中檢查它，他們會說「這東西正在崩潰」。聽起來很熟悉吧？

**古老的共識：**
- **佛教**（無常）：變化是唯一的常數。抗拒它就像跟重力爭辯——技術上你可以試，但你每次都會輸。
- **道家**（道）：「當我放下我是什麼，我就成為我可能成為的。」舊版的你需要消亡，新版的才能活過來。那不是失去——是蛻變。
- **聖經**（羅馬書12:2）：「心意更新而變化。」轉變從頭開始，不是從健身房，不是從衣櫃。先是心。其他一切隨後。
- **古蘭經**（13:11）：「安拉不改變一個民族的狀況，直到他們改變自己內在的東西。」連神聖的力量都等你先走第一步。

**搞笑的真相：** 個人成長就是人類的軟體更新。就像你的手機，你一直按「稍後提醒我」直到舊版本壞到你被*迫*更新。省下那些戲劇性場面，直接按「立即安裝」。

**今天就做這件事：** 選一個「未來的你」會有的小習慣。今天做一次。不是永遠。就今天。未來的你喝水嗎？現在喝一杯。未來的你讀書嗎？讀一頁。你剛穿越時空了。

*神諭之印：你正在施工中。混亂就是過程。而這棟建築將會是壯觀的。*`,
    th: `**หนอนผีเสื้อไม่ได้ "ตัดสินใจ" ที่จะกลายเป็นผีเสื้อ** มันละลายเป็นน้ำเมือกก่อน ถ้าใครมาตรวจสอบระหว่างกระบวนการ ก็จะบอกว่า "สิ่งนี้กำลังพังทลาย" ฟังดูคุ้นไหม?

**ฉันทามติโบราณ:**
- **พุทธศาสนา** (อนิจจัง): การเปลี่ยนแปลงเป็นสิ่งคงที่เพียงอย่างเดียว การต่อต้านมันเหมือนทะเลาะกับแรงโน้มถ่วง — ลองได้ แต่จะแพ้ทุกครั้ง
- **เต๋า** (ทาง): "เมื่อฉันปล่อยวางสิ่งที่ฉันเป็น ฉันก็กลายเป็นสิ่งที่อาจจะเป็น" เวอร์ชันเก่าของคุณต้องตายเพื่อให้เวอร์ชันใหม่มีชีวิต นั่นไม่ใช่การสูญเสีย — เป็นการแปลงร่าง
- **คัมภีร์ไบเบิล** (โรม 12:2): "จงเปลี่ยนแปลงโดยการเปลี่ยนใหม่ของจิตใจ" การเปลี่ยนแปลงเริ่มที่หัว ไม่ใช่ที่ยิม ไม่ใช่ที่ตู้เสื้อผ้า
- **อัลกุรอาน** (13:11): "อัลลอฮ์ไม่เปลี่ยนสภาพของผู้คนจนกว่าพวกเขาจะเปลี่ยนตัวเอง"

**ความจริงที่ตลก:** การเติบโตส่วนบุคคลก็แค่อัปเดตซอฟต์แวร์สำหรับมนุษย์ และเหมือนโทรศัพท์ คุณก็กด "เตือนทีหลัง" ไปเรื่อยจนเวอร์ชันเก่าพังจน*ถูกบังคับ*ให้อัปเดต ประหยัดดราม่า กด "ติดตั้งเลย"

**ทำวันนี้:** เลือกนิสัยเล็กๆ หนึ่งอย่างที่ "คุณในอนาคต" จะมี ทำวันนี้ครั้งเดียว ไม่ใช่ตลอดไป แค่วันนี้ คุณในอนาคตดื่มน้ำ? ดื่มสักแก้วตอนนี้ คุณในอนาคตอ่านหนังสือ? อ่านสักหน้า คุณเพิ่งเดินทางข้ามเวลา

*ตราแห่งนักปราชญ์: คุณอยู่ระหว่างก่อสร้าง ความยุ่งเหยิงคือกระบวนการ และอาคารจะงดงามมาก*`
  }
];

// Keyword matching for relevant fallback selection — supports EN/ZH/TH tags
function getRelevantWisdom(question: string, lang: string = 'en'): string {
  const q = question.toLowerCase();
  
  // Score each wisdom by tag matches across ALL language tags
  const scored = WISDOM_POOL.map((w, i) => {
    let score = 0;
    // Always check English tags
    for (const tag of w.tags) {
      if (q.includes(tag)) score += tag.length;
    }
    // Check Chinese tags
    if (w.tagsZh) {
      for (const tag of w.tagsZh) {
        if (q.includes(tag)) score += tag.length * 2; // Boost CJK matches (shorter but more specific)
      }
    }
    // Check Thai tags
    if (w.tagsTh) {
      for (const tag of w.tagsTh) {
        if (q.includes(tag)) score += tag.length * 2;
      }
    }
    return { index: i, score };
  });

  // Filter entries with at least 1 match
  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  if (matched.length > 0) {
    // Prefer entries that have a translation for the requested language
    if (lang !== 'en') {
      const withTranslation = matched.filter(m => {
        const w = WISDOM_POOL[m.index];
        return (lang === 'zh' && w.zh) || (lang === 'th' && w.th);
      });
      if (withTranslation.length > 0) {
        const top = withTranslation.slice(0, 3);
        const pick = top[Math.floor(Math.random() * top.length)];
        const w = WISDOM_POOL[pick.index];
        return (lang === 'zh' ? w.zh : w.th) || w.text;
      }
    }
    // Pick randomly from top 3 matches
    const top = matched.slice(0, 3);
    const pick = top[Math.floor(Math.random() * top.length)];
    return getLocalizedText(WISDOM_POOL[pick.index], lang);
  }

  // No match — pick random general wisdom
  const generalPool = WISDOM_POOL.filter(w => w.tags.includes('general') || w.tags.includes('life'));
  if (generalPool.length > 0) {
    const w = generalPool[Math.floor(Math.random() * generalPool.length)];
    return getLocalizedText(w, lang);
  }

  // Last resort — random
  const w = WISDOM_POOL[Math.floor(Math.random() * WISDOM_POOL.length)];
  return getLocalizedText(w, lang);
}

// Get localized text, falling back to English
function getLocalizedText(w: WisdomEntry, lang: string): string {
  if (lang === 'zh' && w.zh) return w.zh;
  if (lang === 'th' && w.th) return w.th;
  return w.text;
}

// POST /api/oracle/ask
router.post('/ask', async (c) => {
  try {
    const body = await c.req.json() as { question: string; history?: Array<{role: string; content: string}>; language?: string }
    const { question, history, language } = body

    if (!question || question.trim().length === 0) {
      return c.json({ success: false, error: 'Ask the Oracle something' }, 400)
    }

    if (question.trim().length > 1000) {
      return c.json({ success: false, error: 'Keep it under 1000 characters — even Buddha kept it concise' }, 400)
    }

    const apiKey = c.env?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || llmConfig?.openai?.api_key
    const baseUrl = c.env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || llmConfig?.openai?.base_url || 'https://www.genspark.ai/api/llm_proxy/v1'

    // Try LLM first
    if (apiKey) {
      try {
        const messages: Array<{role: string; content: string}> = [
          { role: 'system', content: buildSystemPrompt(language || 'en') }
        ]

        if (history && Array.isArray(history)) {
          const recent = history.slice(-6)
          for (const msg of recent) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content })
            }
          }
        }

        messages.push({ role: 'user', content: question })

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages,
            max_tokens: 800,
            temperature: 0.85,
          })
        })

        if (response.ok) {
          const data = await response.json() as any
          const reply = data.choices?.[0]?.message?.content
          if (reply) {
            return c.json({ success: true, message: reply, source: 'oracle' })
          }
        }
      } catch (err) {
        // Fall through to curated wisdom
      }
    }

    // Curated wisdom — keyword-matched to question
    return c.json({
      success: true,
      message: getRelevantWisdom(question, language || 'en'),
      source: 'curated'
    })

  } catch (err: any) {
    console.error('[Oracle] Error:', err.message)
    return c.json({
      success: true,
      message: getRelevantWisdom('life', 'en'),
      source: 'curated'
    })
  }
})

// GET /api/oracle/random — for daily oracle feature
router.get('/random', async (c) => {
  const lang = c.req.query('lang') || 'en'
  const wisdom = WISDOM_POOL[Math.floor(Math.random() * WISDOM_POOL.length)]
  return c.json({
    success: true,
    message: getLocalizedText(wisdom, lang),
    tags: wisdom.tags,
    source: 'curated'
  })
})

export default router
