#!/usr/bin/env node
/**
 * NW i18n Auto-Translator v2.0 — Offline Dictionary Engine
 * =========================================================
 * Translates fake/missing zh/th translations WITHOUT an API.
 * Uses a 700+ entry dictionary with compositional fallback.
 *
 * Usage:
 *   node scripts/i18n-translate.cjs                  # Translate all pages
 *   node scripts/i18n-translate.cjs admin-physical    # Single page
 *   node scripts/i18n-translate.cjs --dry-run         # Preview only
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const DRY_RUN = process.argv.includes('--dry-run');
const SUPPORTED_LANGS = ['en', 'zh', 'th'];

// ══════════════════════════════════════════════════════════════════
//  COMPREHENSIVE TRANSLATION DICTIONARY
//  700+ entries covering UI, game, guild, business, crypto, etc.
// ══════════════════════════════════════════════════════════════════

const DICT = {
  // ── Single Words: Navigation & UI ──
  'Home': { zh: '首頁', th: 'หน้าแรก' },
  'Back': { zh: '返回', th: 'กลับ' },
  'Menu': { zh: '選單', th: 'เมนู' },
  'Close': { zh: '關閉', th: 'ปิด' },
  'Submit': { zh: '提交', th: 'ส่ง' },
  'Cancel': { zh: '取消', th: 'ยกเลิก' },
  'Save': { zh: '儲存', th: 'บันทึก' },
  'Delete': { zh: '刪除', th: 'ลบ' },
  'Loading': { zh: '載入中', th: 'กำลังโหลด' },
  'Search': { zh: '搜尋', th: 'ค้นหา' },
  'Filter': { zh: '篩選', th: 'กรอง' },
  'Sort': { zh: '排序', th: 'เรียงลำดับ' },
  'Settings': { zh: '設定', th: 'ตั้งค่า' },
  'Profile': { zh: '個人資料', th: 'โปรไฟล์' },
  'Logout': { zh: '登出', th: 'ออกจากระบบ' },
  'Login': { zh: '登入', th: 'เข้าสู่ระบบ' },
  'Yes': { zh: '是', th: 'ใช่' },
  'No': { zh: '否', th: 'ไม่' },
  'Confirm': { zh: '確認', th: 'ยืนยัน' },
  'Edit': { zh: '編輯', th: 'แก้ไข' },
  'Details': { zh: '詳情', th: 'รายละเอียด' },
  'More': { zh: '更多', th: 'เพิ่มเติม' },
  'Share': { zh: '分享', th: 'แชร์' },
  'Copy': { zh: '複製', th: 'คัดลอก' },
  'Refresh': { zh: '重新整理', th: 'รีเฟรช' },
  'Retry': { zh: '重試', th: 'ลองอีกครั้ง' },
  'Next': { zh: '下一步', th: 'ถัดไป' },
  'Previous': { zh: '上一步', th: 'ก่อนหน้า' },
  'Start': { zh: '開始', th: 'เริ่ม' },
  'Stop': { zh: '停止', th: 'หยุด' },
  'Reset': { zh: '重設', th: 'รีเซ็ต' },
  'Apply': { zh: '套用', th: 'นำไปใช้' },
  'All': { zh: '全部', th: 'ทั้งหมด' },
  'None': { zh: '無', th: 'ไม่มี' },
  'Select': { zh: '選擇', th: 'เลือก' },
  'Download': { zh: '下載', th: 'ดาวน์โหลด' },
  'Upload': { zh: '上傳', th: 'อัปโหลด' },
  'Send': { zh: '發送', th: 'ส่ง' },
  'Receive': { zh: '接收', th: 'รับ' },
  'Preview': { zh: '預覽', th: 'ดูตัวอย่าง' },
  'Create': { zh: '建立', th: 'สร้าง' },
  'Update': { zh: '更新', th: 'อัปเดต' },
  'Remove': { zh: '移除', th: 'ลบออก' },
  'Add': { zh: '新增', th: 'เพิ่ม' },
  'Help': { zh: '幫助', th: 'ช่วยเหลือ' },
  'About': { zh: '關於', th: 'เกี่ยวกับ' },
  'Buy': { zh: '購買', th: 'ซื้อ' },
  'Sell': { zh: '出售', th: 'ขาย' },
  'Trade': { zh: '交易', th: 'แลกเปลี่ยน' },
  'Offer': { zh: '出價', th: 'เสนอ' },
  'Bid': { zh: '競標', th: 'ประมูล' },
  'List': { zh: '上架', th: 'ลงรายการ' },
  'Delist': { zh: '下架', th: 'ถอนรายการ' },
  'Invest': { zh: '投資', th: 'ลงทุน' },
  'Withdraw': { zh: '提取', th: 'ถอน' },
  'Deposit': { zh: '存入', th: 'ฝาก' },
  'Transfer': { zh: '轉移', th: 'โอน' },
  'Donate': { zh: '捐贈', th: 'บริจาค' },
  'Enable': { zh: '啟用', th: 'เปิดใช้' },
  'Disable': { zh: '停用', th: 'ปิดใช้' },
  'Connect': { zh: '連接', th: 'เชื่อมต่อ' },
  'Disconnect': { zh: '斷開連接', th: 'ยกเลิกเชื่อมต่อ' },
  'Join': { zh: '加入', th: 'เข้าร่วม' },
  'Leave': { zh: '離開', th: 'ออก' },
  'Invite': { zh: '邀請', th: 'เชิญ' },
  'Accept': { zh: '接受', th: 'ยอมรับ' },
  'Reject': { zh: '拒絕', th: 'ปฏิเสธ' },
  'Dismiss': { zh: '解散', th: 'ยกเลิก' },
  'Continue': { zh: '繼續', th: 'ดำเนินการต่อ' },
  'Skip': { zh: '跳過', th: 'ข้าม' },
  'Done': { zh: '完成', th: 'เสร็จ' },
  'Finish': { zh: '完成', th: 'เสร็จสิ้น' },
  'Explore': { zh: '探索', th: 'สำรวจ' },
  'Discover': { zh: '發現', th: 'ค้นพบ' },
  'Expand': { zh: '展開', th: 'ขยาย' },
  'Collapse': { zh: '收合', th: 'ยุบ' },
  'Enter': { zh: '進入', th: 'เข้า' },
  'Exit': { zh: '離開', th: 'ออก' },
  'Play': { zh: '遊玩', th: 'เล่น' },
  'Pause': { zh: '暫停', th: 'หยุดชั่วคราว' },
  'Watch': { zh: '觀看', th: 'ดู' },
  'Listen': { zh: '聆聽', th: 'ฟัง' },
  'Vote': { zh: '投票', th: 'โหวต' },
  'Approve': { zh: '批准', th: 'อนุมัติ' },
  'Deny': { zh: '拒絕', th: 'ปฏิเสธ' },
  'Report': { zh: '檢舉', th: 'รายงาน' },
  'Ban': { zh: '封鎖', th: 'แบน' },
  'Mute': { zh: '靜音', th: 'ปิดเสียง' },
  'Unmute': { zh: '取消靜音', th: 'เปิดเสียง' },
  'Pin': { zh: '置頂', th: 'ปักหมุด' },
  'Unpin': { zh: '取消置頂', th: 'เลิกปักหมุด' },

  // ── Game Terms ──
  'Cards': { zh: '卡牌', th: 'การ์ด' },
  'Card': { zh: '卡牌', th: 'การ์ด' },
  'Wallet': { zh: '錢包', th: 'กระเป๋า' },
  'Market': { zh: '市場', th: 'ตลาด' },
  'Marketplace': { zh: '市場', th: 'ตลาด' },
  'Battle': { zh: '戰鬥', th: 'ต่อสู้' },
  'Guild': { zh: '公會', th: 'กิลด์' },
  'Auction': { zh: '拍賣', th: 'ประมูล' },
  'Forge': { zh: '鍛造', th: 'หลอม' },
  'Shrine': { zh: '神社', th: 'ศาลเจ้า' },
  'Staking': { zh: '質押', th: 'สเตกกิ้ง' },
  'Fusion': { zh: '融合', th: 'ฟิวชั่น' },
  'Collection': { zh: '收藏', th: 'คอลเลกชัน' },
  'Rarity': { zh: '稀有度', th: 'ความหายาก' },
  'Common': { zh: '普通', th: 'ธรรมดา' },
  'Rare': { zh: '稀有', th: 'แรร์' },
  'Epic': { zh: '史詩', th: 'เอพิค' },
  'Legendary': { zh: '傳說', th: 'ตำนาน' },
  'Mythic': { zh: '神話', th: 'มิธิค' },
  'Attack': { zh: '攻擊', th: 'โจมตี' },
  'Defense': { zh: '防禦', th: 'ป้องกัน' },
  'Health': { zh: '生命', th: 'พลังชีวิต' },
  'Level': { zh: '等級', th: 'ระดับ' },
  'Experience': { zh: '經驗', th: 'ประสบการณ์' },
  'Inventory': { zh: '背包', th: 'คลัง' },
  'Quest': { zh: '任務', th: 'เควส' },
  'Achievement': { zh: '成就', th: 'ความสำเร็จ' },
  'Achievements': { zh: '成就', th: 'ความสำเร็จ' },
  'Leaderboard': { zh: '排行榜', th: 'ลีดเดอร์บอร์ด' },
  'Tournament': { zh: '錦標賽', th: 'ทัวร์นาเมนต์' },
  'Reward': { zh: '獎勵', th: 'รางวัล' },
  'Rewards': { zh: '獎勵', th: 'รางวัล' },
  'Price': { zh: '價格', th: 'ราคา' },
  'Total': { zh: '總計', th: 'รวม' },
  'Balance': { zh: '餘額', th: 'ยอดคงเหลือ' },
  'History': { zh: '歷史', th: 'ประวัติ' },
  'Status': { zh: '狀態', th: 'สถานะ' },
  'Active': { zh: '活躍', th: 'ใช้งาน' },
  'Completed': { zh: '已完成', th: 'เสร็จสิ้น' },
  'Pending': { zh: '待處理', th: 'รอดำเนินการ' },
  'Power': { zh: '力量', th: 'พลัง' },
  'Rank': { zh: '排名', th: 'อันดับ' },
  'Score': { zh: '分數', th: 'คะแนน' },
  'Season': { zh: '賽季', th: 'ซีซั่น' },
  'Round': { zh: '回合', th: 'รอบ' },
  'Win': { zh: '勝利', th: 'ชนะ' },
  'Wins': { zh: '勝場', th: 'ชนะ' },
  'Lose': { zh: '失敗', th: 'แพ้' },
  'Loss': { zh: '虧損', th: 'ขาดทุน' },
  'Draw': { zh: '平局', th: 'เสมอ' },
  'Damage': { zh: '傷害', th: 'ความเสียหาย' },
  'Heal': { zh: '治療', th: 'รักษา' },
  'Shield': { zh: '護盾', th: 'โล่' },
  'Buff': { zh: '增益', th: 'เพิ่มพลัง' },
  'Debuff': { zh: '減益', th: 'ลดพลัง' },
  'Cooldown': { zh: '冷卻', th: 'คูลดาวน์' },
  'Mana': { zh: '魔力', th: 'มานา' },
  'Skill': { zh: '技能', th: 'สกิล' },
  'Skills': { zh: '技能', th: 'สกิล' },
  'Ability': { zh: '能力', th: 'ความสามารถ' },
  'Equip': { zh: '裝備', th: 'สวมใส่' },
  'Craft': { zh: '製作', th: 'คราฟต์' },
  'Upgrade': { zh: '升級', th: 'อัพเกรด' },
  'Unlock': { zh: '解鎖', th: 'ปลดล็อก' },
  'Unlocked': { zh: '已解鎖', th: 'ปลดล็อกแล้ว' },
  'Locked': { zh: '已鎖定', th: 'ล็อค' },
  'Claim': { zh: '領取', th: 'รับ' },
  'Open': { zh: '開啟', th: 'เปิด' },
  'Pack': { zh: '卡包', th: 'แพ็ค' },
  'Packs': { zh: '卡包', th: 'แพ็ค' },
  'Deck': { zh: '牌組', th: 'เด็ค' },
  'Hand': { zh: '手牌', th: 'มือ' },
  'Board': { zh: '場地', th: 'บอร์ด' },
  'Player': { zh: '玩家', th: 'ผู้เล่น' },
  'Players': { zh: '玩家', th: 'ผู้เล่น' },
  'Opponent': { zh: '對手', th: 'คู่ต่อสู้' },
  'Turn': { zh: '回合', th: 'เทิร์น' },
  'Phase': { zh: '階段', th: 'เฟส' },
  'Ready': { zh: '準備', th: 'พร้อม' },
  'Waiting': { zh: '等待中', th: 'กำลังรอ' },
  'Arena': { zh: '競技場', th: 'อารีน่า' },
  'Champion': { zh: '冠軍', th: 'แชมเปี้ยน' },
  'Champions': { zh: '冠軍們', th: 'แชมเปี้ยน' },
  'Warrior': { zh: '戰士', th: 'นักรบ' },
  'Mage': { zh: '法師', th: 'จอมเวทย์' },
  'Thief': { zh: '盜賊', th: 'โจร' },
  'Archer': { zh: '弓箭手', th: 'นักธนู' },
  'Summoner': { zh: '召喚師', th: 'ผู้เรียก' },
  'Boss': { zh: '頭目', th: 'บอส' },
  'Dungeon': { zh: '地下城', th: 'ดันเจี้ยน' },
  'Raid': { zh: '副本', th: 'เรด' },
  'Loot': { zh: '戰利品', th: 'ลูท' },
  'Item': { zh: '物品', th: 'ไอเท็ม' },
  'Items': { zh: '物品', th: 'ไอเท็ม' },
  'Equipment': { zh: '裝備', th: 'อุปกรณ์' },
  'Weapon': { zh: '武器', th: 'อาวุธ' },
  'Armor': { zh: '護甲', th: 'เกราะ' },
  'Potion': { zh: '藥水', th: 'ยา' },
  'Gem': { zh: '寶石', th: 'อัญมณี' },
  'Gems': { zh: '寶石', th: 'อัญมณี' },
  'Crystal': { zh: '水晶', th: 'คริสตัล' },
  'Token': { zh: '代幣', th: 'โทเค็น' },
  'Tokens': { zh: '代幣', th: 'โทเค็น' },
  'Coin': { zh: '金幣', th: 'เหรียญ' },
  'Coins': { zh: '金幣', th: 'เหรียญ' },
  'Gold': { zh: '黃金', th: 'ทอง' },
  'Silver': { zh: '白銀', th: 'เงิน' },
  'Bronze': { zh: '青銅', th: 'บรอนซ์' },
  'Diamond': { zh: '鑽石', th: 'เพชร' },
  'Star': { zh: '星星', th: 'ดาว' },
  'Stars': { zh: '星星', th: 'ดาว' },
  'Energy': { zh: '能量', th: 'พลังงาน' },
  'Stamina': { zh: '體力', th: 'แสตมิน่า' },
  'Speed': { zh: '速度', th: 'ความเร็ว' },
  'Accuracy': { zh: '命中', th: 'ความแม่นยำ' },
  'Critical': { zh: '暴擊', th: 'คริติคอล' },
  'Dodge': { zh: '閃避', th: 'หลบ' },
  'Block': { zh: '格擋', th: 'บล็อก' },
  'Resistance': { zh: '抗性', th: 'ต้านทาน' },
  'Immunity': { zh: '免疫', th: 'ภูมิคุ้มกัน' },
  'Aura': { zh: '光環', th: 'ออร่า' },
  'Blessing': { zh: '祝福', th: 'พร' },
  'Curse': { zh: '詛咒', th: 'คำสาป' },
  'Sacred': { zh: '神聖', th: 'ศักดิ์สิทธิ์' },
  'Divine': { zh: '神聖', th: 'ทิพย์' },
  'Mythical': { zh: '神話般的', th: 'ในตำนาน' },
  'Ancient': { zh: '古代', th: 'โบราณ' },
  'Eternal': { zh: '永恆', th: 'นิรันดร์' },
  'Void': { zh: '虛空', th: 'ความว่างเปล่า' },
  'Shadow': { zh: '暗影', th: 'เงา' },
  'Light': { zh: '光明', th: 'แสง' },
  'Fire': { zh: '火焰', th: 'ไฟ' },
  'Water': { zh: '水', th: 'น้ำ' },
  'Earth': { zh: '大地', th: 'ดิน' },
  'Wind': { zh: '風', th: 'ลม' },
  'Ice': { zh: '冰', th: 'น้ำแข็ง' },
  'Thunder': { zh: '雷', th: 'สายฟ้า' },
  'Poison': { zh: '毒', th: 'พิษ' },
  'Chaos': { zh: '混沌', th: 'ความวุ่นวาย' },
  'Order': { zh: '秩序', th: 'ระเบียบ' },
  'Destiny': { zh: '命運', th: 'ชะตากรรม' },
  'Fate': { zh: '命運', th: 'โชคชะตา' },
  'Glory': { zh: '榮耀', th: 'เกียรติยศ' },
  'Honor': { zh: '榮譽', th: 'เกียรติ' },
  'Victory': { zh: '勝利', th: 'ชัยชนะ' },
  'Defeat': { zh: '戰敗', th: 'พ่ายแพ้' },
  'Conquest': { zh: '征服', th: 'การพิชิต' },

  // ── Guild-specific ──
  'Guild Master': { zh: '會長', th: 'หัวหน้ากิลด์' },
  'Vice Master': { zh: '副會長', th: 'รองหัวหน้า' },
  'Guild Member': { zh: '公會成員', th: 'สมาชิกกิลด์' },
  'Guild Members': { zh: '公會成員', th: 'สมาชิกกิลด์' },
  'Officer': { zh: '幹部', th: 'เจ้าหน้าที่' },
  'Recruit': { zh: '新成員', th: 'สมาชิกใหม่' },
  'Siege': { zh: '攻城戰', th: 'สงครามปิดล้อม' },
  'Territory': { zh: '領地', th: 'อาณาเขต' },
  'Stronghold': { zh: '要塞', th: 'ป้อมปราการ' },
  'Outpost': { zh: '前哨站', th: 'ด่านหน้า' },
  'Alliance': { zh: '聯盟', th: 'พันธมิตร' },
  'Contribution': { zh: '貢獻', th: 'การสนับสนุน' },
  'Donation': { zh: '捐款', th: 'การบริจาค' },
  'Treasury': { zh: '國庫', th: 'คลัง' },
  'War': { zh: '戰爭', th: 'สงคราม' },
  'Defense Tower': { zh: '防禦塔', th: 'หอป้องกัน' },
  'Karma': { zh: '業力', th: 'กรรม' },
  'Citizen': { zh: '公民', th: 'พลเมือง' },
  'Citizens': { zh: '公民', th: 'พลเมือง' },
  'Citizenship': { zh: '公民權', th: 'สัญชาติ' },
  'Embassy': { zh: '大使館', th: 'สถานทูต' },
  'Court': { zh: '法庭', th: 'ศาล' },
  'Tribunal': { zh: '法庭', th: 'ศาลพิเศษ' },
  'Council': { zh: '議會', th: 'สภา' },
  'Senate': { zh: '參議院', th: 'วุฒิสภา' },
  'Constitution': { zh: '憲法', th: 'รัฐธรรมนูญ' },
  'Law': { zh: '法律', th: 'กฎหมาย' },
  'Laws': { zh: '法律', th: 'กฎหมาย' },
  'Justice': { zh: '正義', th: 'ความยุติธรรม' },
  'Verdict': { zh: '判決', th: 'คำตัดสิน' },
  'Evidence': { zh: '證據', th: 'หลักฐาน' },
  'Witness': { zh: '證人', th: 'พยาน' },
  'Appeal': { zh: '上訴', th: 'อุทธรณ์' },
  'Ruling': { zh: '裁決', th: 'คำตัดสิน' },
  'Nation': { zh: '國家', th: 'ชาติ' },
  'Kingdom': { zh: '王國', th: 'ราชอาณาจักร' },
  'Empire': { zh: '帝國', th: 'จักรวรรดิ' },

  // ── Business & Finance ──
  'Fee': { zh: '手續費', th: 'ค่าธรรมเนียม' },
  'Tax': { zh: '稅', th: 'ภาษี' },
  'Revenue': { zh: '收入', th: 'รายได้' },
  'Profit': { zh: '利潤', th: 'กำไร' },
  'Volume': { zh: '交易量', th: 'ปริมาณ' },
  'Assets': { zh: '資產', th: 'สินทรัพย์' },
  'Portfolio': { zh: '投資組合', th: 'พอร์ตโฟลิโอ' },
  'Dividend': { zh: '股息', th: 'เงินปันผล' },
  'Inflation': { zh: '通膨', th: 'เงินเฟ้อ' },
  'Supply': { zh: '供給', th: 'อุปทาน' },
  'Demand': { zh: '需求', th: 'อุปสงค์' },
  'Liquidity': { zh: '流動性', th: 'สภาพคล่อง' },
  'Yield': { zh: '收益', th: 'ผลตอบแทน' },
  'Stake': { zh: '質押', th: 'สเตก' },
  'Burn': { zh: '銷毀', th: 'เบิร์น' },
  'Mint': { zh: '鑄造', th: 'มินท์' },
  'Swap': { zh: '兌換', th: 'สวอป' },
  'Bridge': { zh: '跨鏈橋', th: 'บริดจ์' },
  'Airdrop': { zh: '空投', th: 'แอร์ดรอป' },

  // ── Tech / AI ──
  'Agent': { zh: '代理', th: 'เอเจนต์' },
  'Agents': { zh: '代理', th: 'เอเจนต์' },
  'Model': { zh: '模型', th: 'โมเดล' },
  'Pipeline': { zh: '管線', th: 'ไปป์ไลน์' },
  'Dashboard': { zh: '儀表板', th: 'แดชบอร์ด' },
  'Analytics': { zh: '分析', th: 'การวิเคราะห์' },
  'Metrics': { zh: '指標', th: 'ตัวชี้วัด' },
  'Console': { zh: '主控台', th: 'คอนโซล' },
  'Debug': { zh: '除錯', th: 'ดีบัก' },
  'Deploy': { zh: '部署', th: 'ดีพลอย' },
  'Monitor': { zh: '監控', th: 'มอนิเตอร์' },
  'System': { zh: '系統', th: 'ระบบ' },
  'Server': { zh: '伺服器', th: 'เซิร์ฟเวอร์' },
  'Database': { zh: '資料庫', th: 'ฐานข้อมูล' },
  'Network': { zh: '網路', th: 'เครือข่าย' },
  'Security': { zh: '安全', th: 'ความปลอดภัย' },
  'Encryption': { zh: '加密', th: 'การเข้ารหัส' },
  'Verification': { zh: '驗證', th: 'การยืนยัน' },
  'Authentication': { zh: '身份認證', th: 'การยืนยันตัวตน' },

  // ── Phrases ──
  'View All': { zh: '查看全部', th: 'ดูทั้งหมด' },
  'Learn More': { zh: '了解更多', th: 'เรียนรู้เพิ่มเติม' },
  'Get Started': { zh: '開始使用', th: 'เริ่มต้น' },
  'Read More': { zh: '閱讀更多', th: 'อ่านเพิ่มเติม' },
  'Show More': { zh: '顯示更多', th: 'แสดงเพิ่มเติม' },
  'Show Less': { zh: '收起', th: 'แสดงน้อยลง' },
  'No Results': { zh: '沒有結果', th: 'ไม่มีผลลัพธ์' },
  'Coming Soon': { zh: '即將推出', th: 'เร็วๆ นี้' },
  'Select All': { zh: '全選', th: 'เลือกทั้งหมด' },
  'Clear All': { zh: '清除全部', th: 'ล้างทั้งหมด' },
  'No Data': { zh: '無資料', th: 'ไม่มีข้อมูล' },
  'Error': { zh: '錯誤', th: 'ข้อผิดพลาด' },
  'Success': { zh: '成功', th: 'สำเร็จ' },
  'Warning': { zh: '警告', th: 'คำเตือน' },
  'Info': { zh: '資訊', th: 'ข้อมูล' },
  'Unavailable': { zh: '不可用', th: 'ไม่พร้อมใช้งาน' },
  'Offline': { zh: '離線', th: 'ออฟไลน์' },
  'Online': { zh: '在線', th: 'ออนไลน์' },
  'Sign Up': { zh: '註冊', th: 'สมัคร' },
  'Log In': { zh: '登入', th: 'เข้าสู่ระบบ' },
  'Log Out': { zh: '登出', th: 'ออกจากระบบ' },
  'Sign Out': { zh: '登出', th: 'ออกจากระบบ' },
  'All Rights Reserved': { zh: '版權所有', th: 'สงวนลิขสิทธิ์' },
  'All rights reserved.': { zh: '版權所有。', th: 'สงวนลิขสิทธิ์' },
  'Terms of Service': { zh: '服務條款', th: 'ข้อกำหนดในการให้บริการ' },
  'Privacy Policy': { zh: '隱私政策', th: 'นโยบายความเป็นส่วนตัว' },
  'Contact Us': { zh: '聯繫我們', th: 'ติดต่อเรา' },
  'Follow Us': { zh: '追蹤我們', th: 'ติดตามเรา' },
  'FAQ': { zh: '常見問題', th: 'คำถามที่พบบ่อย' },
  'Support': { zh: '支援', th: 'สนับสนุน' },
  'Click anywhere to close': { zh: '點擊任意處關閉', th: 'คลิกที่ใดก็ได้เพื่อปิด' },
  'Click Anywhere to Close': { zh: '點擊任意處關閉', th: 'คลิกที่ใดก็ได้เพื่อปิด' },

  // ── Game-specific compound phrases ──
  'Active Auctions': { zh: '進行中的拍賣', th: 'การประมูลที่กำลังดำเนินอยู่' },
  'Total Volume': { zh: '總交易量', th: 'ปริมาณรวม' },
  'Trade Volume': { zh: '交易量', th: 'ปริมาณการซื้อขาย' },
  'Trade Balance': { zh: '貿易平衡', th: 'ดุลการค้า' },
  'Inflation Rate': { zh: '通膨率', th: 'อัตราเงินเฟ้อ' },
  'Active Traders': { zh: '活躍交易者', th: 'ผู้ค้าที่ใช้งาน' },
  'Markets Open': { zh: '市場開放', th: 'ตลาดเปิด' },
  'Guild Treasury': { zh: '公會國庫', th: 'คลังกิลด์' },
  'Daily Rewards': { zh: '每日獎勵', th: 'รางวัลประจำวัน' },
  'Weekly Rewards': { zh: '每週獎勵', th: 'รางวัลประจำสัปดาห์' },
  'Streak Protection': { zh: '連勝保護', th: 'การป้องกันสตรีค' },
  'Streak Protections': { zh: '連勝保護', th: 'การป้องกันสตรีค' },
  'Streak at Risk': { zh: '連勝即將中斷', th: 'สตรีคเสี่ยง' },
  'Use a Protection to Save': { zh: '使用保護以保存', th: 'ใช้การป้องกันเพื่อรักษา' },
  'Use Protection': { zh: '使用保護', th: 'ใช้การป้องกัน' },
  'Open Pack': { zh: '開啟卡包', th: 'เปิดแพ็ค' },
  'Open First Pack': { zh: '開啟第一個卡包', th: 'เปิดแพ็คแรก' },
  'Battle Now': { zh: '立即戰鬥', th: 'ต่อสู้เลย' },
  'Accept Ruling': { zh: '接受裁決', th: 'ยอมรับคำตัดสิน' },
  'Account Transfer': { zh: '帳號轉移', th: 'โอนบัญชี' },
  'Card Lab': { zh: '卡牌實驗室', th: 'ห้องปฏิบัติการการ์ด' },
  'Card Audit': { zh: '卡牌審計', th: 'ตรวจสอบการ์ด' },
  'Card Bridge': { zh: '卡牌橋接', th: 'บริดจ์การ์ด' },
  'Deck Builder': { zh: '牌組構建器', th: 'สร้างเด็ค' },
  'Battle Engine': { zh: '戰鬥引擎', th: 'เอนจินต่อสู้' },
  'Research Library': { zh: '研究圖書館', th: 'ห้องสมุดวิจัย' },
  'Historical Society': { zh: '歷史學會', th: 'สมาคมประวัติศาสตร์' },
  'Lost and Found': { zh: '失物招領', th: 'ของหายได้คืน' },
  'AI Lounge': { zh: 'AI 休息室', th: 'ห้องรับรอง AI' },
  'AI Assets': { zh: 'AI 資產', th: 'สินทรัพย์ AI' },
  'AI Judge': { zh: 'AI 法官', th: 'ผู้พิพากษา AI' },
  'AI Economic Forecast': { zh: 'AI 經濟預測', th: 'การพยากรณ์เศรษฐกิจ AI' },
  'Ability Reference': { zh: '能力參考', th: 'ข้อมูลอ้างอิงความสามารถ' },
  'Ability Reference:': { zh: '能力參考：', th: 'ข้อมูลอ้างอิงความสามารถ:' },
  'API Health': { zh: 'API 健康狀態', th: 'สถานะ API' },
  'Abyss Chamber': { zh: '深淵密室', th: 'ห้องเหว' },
  'Coin Shop': { zh: '金幣商店', th: 'ร้านเหรียญ' },
  'Fashion Show': { zh: '時裝秀', th: 'แฟชั่นโชว์' },
  'Tabletop': { zh: '桌遊', th: 'เกมบนโต๊ะ' },
  'Profile Card': { zh: '個人檔案卡', th: 'การ์ดโปรไฟล์' },
  'Avatar Builder': { zh: '角色建造器', th: 'สร้างอวาตาร์' },
  'Avatar Studio': { zh: '角色工作室', th: 'สตูดิโออวาตาร์' },
  'Merch Store': { zh: '周邊商店', th: 'ร้านค้าสินค้า' },
  'Lore': { zh: '傳說故事', th: 'เรื่องราว' },
  'Guide': { zh: '指南', th: 'คู่มือ' },
  'Updates': { zh: '更新', th: 'อัปเดต' },
  'Cafeteria': { zh: '食堂', th: 'โรงอาหาร' },
  'Breakroom': { zh: '休息室', th: 'ห้องพัก' },
  'Basement': { zh: '地下室', th: 'ห้องใต้ดิน' },
  'Vault': { zh: '金庫', th: 'ห้องนิรภัย' },
  'Arcade': { zh: '遊戲機台', th: 'ตู้เกม' },
  'Showcase': { zh: '展示', th: 'โชว์เคส' },
  'Efficiency': { zh: '效率', th: 'ประสิทธิภาพ' },
  'Tools': { zh: '工具', th: 'เครื่องมือ' },
  'Academy': { zh: '學院', th: 'สถาบัน' },
  'Gallery': { zh: '畫廊', th: 'แกลเลอรี' },
  'Library': { zh: '圖書館', th: 'ห้องสมุด' },
  'Museum': { zh: '博物館', th: 'พิพิธภัณฑ์' },
  'Lab': { zh: '實驗室', th: 'ห้องปฏิบัติการ' },
  'Workshop': { zh: '工作坊', th: 'เวิร์คช็อป' },
  'Lounge': { zh: '休息室', th: 'ห้องรับรอง' },
  'Studio': { zh: '工作室', th: 'สตูดิโอ' },

  // ── Status / State messages ──
  'Loading...': { zh: '載入中...', th: 'กำลังโหลด...' },
  'Please wait...': { zh: '請稍候...', th: 'กรุณารอ...' },
  'Processing...': { zh: '處理中...', th: 'กำลังดำเนินการ...' },
  'Connecting...': { zh: '連接中...', th: 'กำลังเชื่อมต่อ...' },
  'Syncing...': { zh: '同步中...', th: 'กำลังซิงค์...' },
  'Saving...': { zh: '儲存中...', th: 'กำลังบันทึก...' },
  'Updating...': { zh: '更新中...', th: 'กำลังอัปเดต...' },
  'No items found': { zh: '找不到項目', th: 'ไม่พบรายการ' },
  'Something went wrong': { zh: '出了點問題', th: 'เกิดข้อผิดพลาด' },
  'Try again later': { zh: '請稍後再試', th: 'ลองอีกครั้งในภายหลัง' },
  'Feature coming soon': { zh: '功能即將推出', th: 'ฟีเจอร์เร็วๆ นี้' },
  'Under construction': { zh: '建設中', th: 'อยู่ระหว่างก่อสร้าง' },

  // ── Time ──
  'Days': { zh: '天', th: 'วัน' },
  'Hours': { zh: '小時', th: 'ชั่วโมง' },
  'Minutes': { zh: '分鐘', th: 'นาที' },
  'Seconds': { zh: '秒', th: 'วินาที' },
  'Today': { zh: '今天', th: 'วันนี้' },
  'Yesterday': { zh: '昨天', th: 'เมื่อวาน' },
  'Tomorrow': { zh: '明天', th: 'พรุ่งนี้' },
  'This Week': { zh: '本週', th: 'สัปดาห์นี้' },
  'This Month': { zh: '本月', th: 'เดือนนี้' },
  'Daily': { zh: '每日', th: 'รายวัน' },
  'Weekly': { zh: '每週', th: 'รายสัปดาห์' },
  'Monthly': { zh: '每月', th: 'รายเดือน' },

  // ── NumbahWan-specific compound phrases (from audit failures) ──
  'Mythic Forge': { zh: '神話鍛造', th: 'หลอมมิธิค' },
  'Currency Exchange': { zh: '貨幣兌換', th: 'แลกเปลี่ยนสกุลเงิน' },
  'Enter the Forge': { zh: '進入鍛造', th: 'เข้าสู่การหลอม' },
  'Tears of Victory': { zh: '勝利之淚', th: 'น้ำตาแห่งชัยชนะ' },
  'Pure Focus': { zh: '純粹專注', th: 'สมาธิบริสุทธิ์' },
  'Champion Rising': { zh: '冠軍崛起', th: 'แชมเปี้ยนผงาด' },
  'The Arena': { zh: '競技場', th: 'อารีน่า' },
  'Electric Atmosphere': { zh: '電流般的氛圍', th: 'บรรยากาศสุดมัน' },
  'Build Your Deck': { zh: '建造你的牌組', th: 'สร้างเด็คของคุณ' },
  'Your Collection': { zh: '你的收藏', th: 'คอลเลกชันของคุณ' },
  'Build Your Empire': { zh: '建立你的帝國', th: 'สร้างจักรวรรดิของคุณ' },
  'Trade Cards': { zh: '交易卡牌', th: 'แลกเปลี่ยนการ์ด' },
  'Guild Members Playing': { zh: '正在遊玩的公會成員', th: 'สมาชิกกิลด์ที่กำลังเล่น' },
  'Cards Pulled Today': { zh: '今日抽卡次數', th: 'การ์ดที่ดึงวันนี้' },
  'Pulled a Rare!': { zh: '抽到稀有卡！', th: 'ดึงได้การ์ดแรร์!' },
  'Sacred Log': { zh: '神聖日誌', th: 'บันทึกศักดิ์สิทธิ์' },
  'Log Entry': { zh: '日誌條目', th: 'รายการบันทึก' },
  'Contribution Points': { zh: '貢獻點數', th: 'แต้มสนับสนุน' },
  'Karma Points': { zh: '業力點數', th: 'แต้มกรรม' },
  'Power Rating': { zh: '力量評分', th: 'ระดับพลัง' },
  'Win Rate': { zh: '勝率', th: 'อัตราชนะ' },
  'Total Games': { zh: '總場次', th: 'เกมทั้งหมด' },
  'Games Played': { zh: '已玩場次', th: 'เกมที่เล่น' },
  'Current Streak': { zh: '目前連勝', th: 'สตรีคปัจจุบัน' },
  'Best Streak': { zh: '最佳連勝', th: 'สตรีคดีที่สุด' },
  'My Cards': { zh: '我的卡牌', th: 'การ์ดของฉัน' },
  'My Deck': { zh: '我的牌組', th: 'เด็คของฉัน' },
  'My Collection': { zh: '我的收藏', th: 'คอลเลกชันของฉัน' },
  'My Inventory': { zh: '我的背包', th: 'คลังของฉัน' },
  'My Wallet': { zh: '我的錢包', th: 'กระเป๋าของฉัน' },
  'Play Now': { zh: '立即遊玩', th: 'เล่นเลย' },
  'Start Battle': { zh: '開始戰鬥', th: 'เริ่มต่อสู้' },
  'End Turn': { zh: '結束回合', th: 'จบเทิร์น' },
  'Draw Card': { zh: '抽牌', th: 'จั่วการ์ด' },
  'Play Card': { zh: '出牌', th: 'ลงการ์ด' },
  'Discard': { zh: '棄牌', th: 'ทิ้ง' },
  'Surrender': { zh: '投降', th: 'ยอมแพ้' },
  'Rematch': { zh: '再戰一次', th: 'แข่งใหม่' },
  'Find Match': { zh: '尋找對手', th: 'หาคู่แข่ง' },
  'Quick Match': { zh: '快速比賽', th: 'แมตช์ด่วน' },
  'Ranked Match': { zh: '排位賽', th: 'แมตช์จัดอันดับ' },
  'Casual Match': { zh: '休閒比賽', th: 'แมตช์ทั่วไป' },
  'Practice Mode': { zh: '練習模式', th: 'โหมดฝึกซ้อม' },
  'Tutorial': { zh: '教學', th: 'สอนเล่น' },
  'How to Play': { zh: '如何遊玩', th: 'วิธีเล่น' },
  'Rules': { zh: '規則', th: 'กฎ' },
  'Patch Notes': { zh: '更新日誌', th: 'บันทึกแพทช์' },
  'Event': { zh: '活動', th: 'อีเว้นท์' },
  'Events': { zh: '活動', th: 'อีเว้นท์' },
  'Special Event': { zh: '特別活動', th: 'อีเว้นท์พิเศษ' },
  'Limited Edition': { zh: '限量版', th: 'ลิมิเต็ด อิดิชั่น' },
  'Exclusive': { zh: '獨家', th: 'เอกสิทธิ์' },
  'Premium': { zh: '高級', th: 'พรีเมียม' },
  'Free': { zh: '免費', th: 'ฟรี' },
  'Bonus': { zh: '獎勵', th: 'โบนัส' },
  'Gift': { zh: '禮物', th: 'ของขวัญ' },
  'Coupon': { zh: '優惠券', th: 'คูปอง' },
  'Discount': { zh: '折扣', th: 'ส่วนลด' },

  // ── Wallet / Financial UI ──
  'Available Balance': { zh: '可用餘額', th: 'ยอดคงเหลือที่ใช้ได้' },
  'Total Balance': { zh: '總餘額', th: 'ยอดคงเหลือรวม' },
  'Recent Transactions': { zh: '最近交易', th: 'ธุรกรรมล่าสุด' },
  'Transaction History': { zh: '交易紀錄', th: 'ประวัติธุรกรรม' },
  'Send Tokens': { zh: '發送代幣', th: 'ส่งโทเค็น' },
  'Receive Tokens': { zh: '接收代幣', th: 'รับโทเค็น' },
  'Wallet Address': { zh: '錢包地址', th: 'ที่อยู่กระเป๋า' },
  'Connect Wallet': { zh: '連接錢包', th: 'เชื่อมต่อกระเป๋า' },
  'Disconnect Wallet': { zh: '斷開錢包', th: 'ยกเลิกเชื่อมต่อกระเป๋า' },
  'Gas Fee': { zh: '手續費', th: 'ค่าแก๊ส' },
  'Network Fee': { zh: '網路手續費', th: 'ค่าธรรมเนียมเครือข่าย' },
  'Transaction Fee': { zh: '交易手續費', th: 'ค่าธรรมเนียมการทำธุรกรรม' },

  // ── Layout / Content ──
  'Featured': { zh: '精選', th: 'แนะนำ' },
  'Popular': { zh: '熱門', th: 'ยอดนิยม' },
  'Trending': { zh: '趨勢', th: 'กำลังฮิต' },
  'New': { zh: '最新', th: 'ใหม่' },
  'Hot': { zh: '熱門', th: 'ฮอต' },
  'Top': { zh: '頂級', th: 'สูงสุด' },
  'Best': { zh: '最佳', th: 'ดีที่สุด' },
  'Latest': { zh: '最新', th: 'ล่าสุด' },
  'Recommended': { zh: '推薦', th: 'แนะนำ' },
  'Favorites': { zh: '收藏', th: 'รายการโปรด' },
  'Notifications': { zh: '通知', th: 'การแจ้งเตือน' },
  'Messages': { zh: '訊息', th: 'ข้อความ' },
  'Chat': { zh: '聊天', th: 'แชท' },
  'Friends': { zh: '朋友', th: 'เพื่อน' },
  'Community': { zh: '社群', th: 'ชุมชน' },
  'Forum': { zh: '論壇', th: 'ฟอรั่ม' },
  'Blog': { zh: '部落格', th: 'บล็อก' },
  'News': { zh: '新聞', th: 'ข่าว' },
  'Announcements': { zh: '公告', th: 'ประกาศ' },
  'Changelog': { zh: '更新日誌', th: 'บันทึกการเปลี่ยนแปลง' },
  'Roadmap': { zh: '路線圖', th: 'โรดแมป' },
  'Whitepaper': { zh: '白皮書', th: 'ไวท์เปเปอร์' },
  'Documentation': { zh: '文件', th: 'เอกสาร' },

  // ── More game compound phrases from audit ──
  'Est. 2025': { zh: '創立於 2025', th: 'ก่อตั้ง 2025' },
  'Season 1': { zh: '第一賽季', th: 'ซีซั่น 1' },
  'Season 2': { zh: '第二賽季', th: 'ซีซั่น 2' },
  'Season 3': { zh: '第三賽季', th: 'ซีซั่น 3' },
  '1st Edition': { zh: '第一版', th: 'พิมพ์ครั้งแรก' },
  'Floor Price': { zh: '地板價', th: 'ราคาพื้น' },
  'Market Cap': { zh: '市值', th: 'มูลค่าตลาด' },
  'All Time High': { zh: '歷史新高', th: 'สูงสุดตลอดกาล' },
  'No Listings': { zh: '無上架商品', th: 'ไม่มีรายการ' },
  'Place Bid': { zh: '下標', th: 'วางราคา' },
  'Buy Now': { zh: '立即購買', th: 'ซื้อเลย' },
  'Sell Now': { zh: '立即出售', th: 'ขายเลย' },
  'Make Offer': { zh: '出價', th: 'เสนอราคา' },
  'Cancel Offer': { zh: '取消出價', th: 'ยกเลิกข้อเสนอ' },
  'Minimum Bid': { zh: '最低出價', th: 'ราคาประมูลขั้นต่ำ' },
  'Starting Price': { zh: '起標價', th: 'ราคาเริ่มต้น' },
  'Current Price': { zh: '目前價格', th: 'ราคาปัจจุบัน' },
  'Highest Bid': { zh: '最高出價', th: 'ราคาประมูลสูงสุด' },
  'Time Left': { zh: '剩餘時間', th: 'เวลาที่เหลือ' },
  'Ends In': { zh: '結束於', th: 'สิ้นสุดใน' },
  'Sold Out': { zh: '售罄', th: 'หมดแล้ว' },
  'Out of Stock': { zh: '缺貨', th: 'สินค้าหมด' },
  'In Stock': { zh: '有庫存', th: 'มีสินค้า' },
  'Add to Cart': { zh: '加入購物車', th: 'เพิ่มลงตะกร้า' },
  'Checkout': { zh: '結帳', th: 'ชำระเงิน' },
  'Order Summary': { zh: '訂單摘要', th: 'สรุปคำสั่งซื้อ' },
  'Payment': { zh: '付款', th: 'การชำระเงิน' },
  'Shipping': { zh: '運送', th: 'จัดส่ง' },
  'Return Policy': { zh: '退貨政策', th: 'นโยบายการคืนสินค้า' },

  // ── Specific NW page strings from audit ──
  'A City at Sea': { zh: '海上之城', th: 'เมืองกลางทะเล' },
  '779 Years of Dreams': { zh: '779年的夢想', th: 'ความฝัน 779 ปี' },
  '3 Michelin Stars': { zh: '米其林三星', th: '3 ดาวมิชลิน' },
  'AI & Prompting Lab': { zh: 'AI 與提示工程實驗室', th: 'ห้องปฏิบัติการ AI และการสร้างพรอมท์' },
  'AI Chips': { zh: 'AI 晶片', th: 'ชิป AI' },
  'AI Leader': { zh: 'AI 領導者', th: 'ผู้นำ AI' },
  'Mythic Forge': { zh: '神話鍛造', th: 'หลอมมิธิค' },
  'Logs': { zh: '日誌', th: 'บันทึก' },
  'Physical Cards': { zh: '實體卡牌', th: 'การ์ดจริง' },
  'Digital Cards': { zh: '數位卡牌', th: 'การ์ดดิจิทัล' },
  'Card Preview': { zh: '卡牌預覽', th: 'ตัวอย่างการ์ด' },
  'Card Details': { zh: '卡牌詳情', th: 'รายละเอียดการ์ด' },
  'Card Stats': { zh: '卡牌數據', th: 'สถิติการ์ด' },
  'Deck Analysis': { zh: '牌組分析', th: 'วิเคราะห์เด็ค' },
  'Deck Strength': { zh: '牌組強度', th: 'ความแข็งแกร่งเด็ค' },
  'Battle Results': { zh: '戰鬥結果', th: 'ผลการต่อสู้' },
  'Battle History': { zh: '戰鬥紀錄', th: 'ประวัติการต่อสู้' },
  'Battle Log': { zh: '戰鬥日誌', th: 'บันทึกการต่อสู้' },
  'Guild Hall': { zh: '公會大廳', th: 'ห้องประชุมกิลด์' },
  'Guild Info': { zh: '公會資訊', th: 'ข้อมูลกิลด์' },
  'Guild Chat': { zh: '公會聊天', th: 'แชทกิลด์' },
  'Guild Events': { zh: '公會活動', th: 'อีเว้นท์กิลด์' },
  'Guild Shop': { zh: '公會商店', th: 'ร้านค้ากิลด์' },
  'Guild Bank': { zh: '公會銀行', th: 'ธนาคารกิลด์' },
  'Guild Wars': { zh: '公會戰爭', th: 'สงครามกิลด์' },
  'Guild Siege': { zh: '公會攻城戰', th: 'สงครามปิดล้อมกิลด์' },
  'Guild Ranking': { zh: '公會排名', th: 'อันดับกิลด์' },
  'Member List': { zh: '成員列表', th: 'รายชื่อสมาชิก' },
  'Apply to Join': { zh: '申請加入', th: 'สมัครเข้าร่วม' },
  'Pending Applications': { zh: '待審核申請', th: 'ใบสมัครที่รอดำเนินการ' },
  'Kick Member': { zh: '踢除成員', th: 'เตะสมาชิก' },
  'Promote': { zh: '升職', th: 'เลื่อนตำแหน่ง' },
  'Demote': { zh: '降職', th: 'ลดตำแหน่ง' },
  'Daily Login Bonus': { zh: '每日登入獎勵', th: 'โบนัสเข้าสู่ระบบรายวัน' },
  'Claim Reward': { zh: '領取獎勵', th: 'รับรางวัล' },
  'Claim All': { zh: '領取全部', th: 'รับทั้งหมด' },
  'Trade History': { zh: '交易紀錄', th: 'ประวัติการซื้อขาย' },
  'Transaction Pending': { zh: '交易處理中', th: 'รอดำเนินการธุรกรรม' },
  'Transaction Complete': { zh: '交易完成', th: 'ธุรกรรมเสร็จสิ้น' },
  'Transaction Failed': { zh: '交易失敗', th: 'ธุรกรรมล้มเหลว' },
  'Verification Required': { zh: '需要驗證', th: 'ต้องการการยืนยัน' },
  'Identity Verification': { zh: '身份驗證', th: 'ยืนยันตัวตน' },
  'Two Factor Auth': { zh: '兩步驟驗證', th: 'การยืนยันสองขั้นตอน' },
  'Backup Code': { zh: '備份碼', th: 'รหัสสำรอง' },
  'Recovery Key': { zh: '恢復金鑰', th: 'คีย์กู้คืน' },
  'Change Password': { zh: '變更密碼', th: 'เปลี่ยนรหัสผ่าน' },
  'Email Notifications': { zh: '電子郵件通知', th: 'การแจ้งเตือนทางอีเมล' },
  'Push Notifications': { zh: '推播通知', th: 'การแจ้งเตือนแบบพุช' },
  'Sound Effects': { zh: '音效', th: 'เอฟเฟกต์เสียง' },
  'Background Music': { zh: '背景音樂', th: 'เพลงพื้นหลัง' },
  'Auto Play': { zh: '自動播放', th: 'เล่นอัตโนมัติ' },
  'Full Screen': { zh: '全螢幕', th: 'เต็มจอ' },
  'Windowed Mode': { zh: '視窗模式', th: 'โหมดหน้าต่าง' },
  'Low Quality': { zh: '低畫質', th: 'คุณภาพต่ำ' },
  'Medium Quality': { zh: '中畫質', th: 'คุณภาพปานกลาง' },
  'High Quality': { zh: '高畫質', th: 'คุณภาพสูง' },
  'Ultra Quality': { zh: '最高畫質', th: 'คุณภาพสูงสุด' },
  'Party': { zh: '隊伍', th: 'ปาร์ตี้' },
  'Party Members': { zh: '隊伍成員', th: 'สมาชิกปาร์ตี้' },
  'Party Leader': { zh: '隊長', th: 'หัวหน้าปาร์ตี้' },
  'Party Chat': { zh: '隊伍聊天', th: 'แชทปาร์ตี้' },
  'Create Party': { zh: '建立隊伍', th: 'สร้างปาร์ตี้' },
  'Join Party': { zh: '加入隊伍', th: 'เข้าร่วมปาร์ตี้' },
  'Leave Party': { zh: '離開隊伍', th: 'ออกจากปาร์ตี้' },
  'Invite to Party': { zh: '邀請加入隊伍', th: 'เชิญเข้าปาร์ตี้' },
  'Difficulty': { zh: '難度', th: 'ความยาก' },
  'Easy': { zh: '簡單', th: 'ง่าย' },
  'Normal': { zh: '普通', th: 'ปกติ' },
  'Hard': { zh: '困難', th: 'ยาก' },
  'Extreme': { zh: '極限', th: 'สุดขีด' },
  'Nightmare': { zh: '夢魘', th: 'ฝันร้าย' },
  'Hell': { zh: '地獄', th: 'นรก' },
  'Floor': { zh: '層', th: 'ชั้น' },
  'Wave': { zh: '波', th: 'เวฟ' },
  'Stage': { zh: '關卡', th: 'ด่าน' },
  'Chapter': { zh: '章節', th: 'บท' },
  'World': { zh: '世界', th: 'โลก' },
  'Zone': { zh: '區域', th: 'โซน' },
  'Region': { zh: '地區', th: 'ภูมิภาค' },
  'Map': { zh: '地圖', th: 'แผนที่' },
  'Compass': { zh: '羅盤', th: 'เข็มทิศ' },
  'Waypoint': { zh: '路點', th: 'จุดอ้างอิง' },
  'Checkpoint': { zh: '存檔點', th: 'จุดเช็คพอยท์' },
  'Spawn': { zh: '重生', th: 'เกิด' },
  'Respawn': { zh: '復活', th: 'เกิดใหม่' },
  'Teleport': { zh: '傳送', th: 'เทเลพอร์ต' },
  'Fast Travel': { zh: '快速移動', th: 'เดินทางเร็ว' },

  // ── Admin / Physical Cards ──
  'Order Status': { zh: '訂單狀態', th: 'สถานะคำสั่งซื้อ' },
  'Print Queue': { zh: '列印佇列', th: 'คิวพิมพ์' },
  'Quality Check': { zh: '品質檢查', th: 'ตรวจสอบคุณภาพ' },
  'Shipping Label': { zh: '運送標籤', th: 'ฉลากจัดส่ง' },
  'Tracking Number': { zh: '追蹤碼', th: 'หมายเลขติดตาม' },
  'Delivery Status': { zh: '配送狀態', th: 'สถานะจัดส่ง' },
  'Batch Processing': { zh: '批次處理', th: 'การประมวลผลแบบกลุ่ม' },
  'Inventory Count': { zh: '庫存盤點', th: 'นับสินค้าคงคลัง' },
  'Stock Level': { zh: '庫存水平', th: 'ระดับสต็อก' },
  'Reorder Point': { zh: '再訂購點', th: 'จุดสั่งซื้อใหม่' },
  'Unit Price': { zh: '單價', th: 'ราคาต่อหน่วย' },
  'Bulk Order': { zh: '批量訂購', th: 'สั่งซื้อจำนวนมาก' },
  'Sample Request': { zh: '索取樣品', th: 'ขอตัวอย่าง' },

  // ── Crypto / Investment ──
  'ETF Assets': { zh: 'ETF 資產', th: 'สินทรัพย์ ETF' },
  'Digital Gold': { zh: '數位黃金', th: 'ทองคำดิจิทัล' },
  'Token Burn': { zh: '代幣銷毀', th: 'เผาโทเค็น' },
  'Token Burn Event': { zh: '代幣銷毀活動', th: 'กิจกรรมเผาโทเค็น' },
  'Halving': { zh: '減半', th: 'ฮาล์ฟวิ่ง' },
  'Block Height': { zh: '區塊高度', th: 'ความสูงบล็อก' },
  'Hash Rate': { zh: '哈希率', th: 'อัตราแฮช' },
  'Smart Contract': { zh: '智能合約', th: 'สมาร์ทคอนแทรค' },
  'Governance': { zh: '治理', th: 'การกำกับดูแล' },
  'Proposal': { zh: '提案', th: 'ข้อเสนอ' },
  'Proposals': { zh: '提案', th: 'ข้อเสนอ' },
  'Voting Power': { zh: '投票權', th: 'อำนาจการโหวต' },
  'Delegation': { zh: '委託', th: 'การมอบหมาย' },
  'Staking Rewards': { zh: '質押獎勵', th: 'รางวัลการสเตก' },
  'Unstake': { zh: '解除質押', th: 'ถอนสเตก' },
  'Cooldown Period': { zh: '冷卻期', th: 'ช่วงพักร้อน' },
  'APY': { zh: '年化收益率', th: 'ผลตอบแทนต่อปี' },
  'TVL': { zh: '總鎖定價值', th: 'มูลค่ารวมที่ล็อค' },

  // ── NW Specific longer phrases ──
  'AI Judge is reviewing your case...': { zh: 'AI 法官正在審理您的案件...', th: 'ผู้พิพากษา AI กำลังตรวจสอบคดีของคุณ...' },
  'Build Your Empire In': { zh: '建立你的帝國於', th: 'สร้างจักรวรรดิของคุณใน' },
  "The Greatest Nation That Doesn't Exist Yet": { zh: '尚未存在的最偉大國家', th: 'ชาติที่ยิ่งใหญ่ที่สุดที่ยังไม่มีอยู่จริง' },
  'Imaginary But Real In Our Hearts': { zh: '想像中但在我們心中真實', th: 'จินตนาการแต่จริงในใจเรา' },
  'Where young minds master the ancient arts': { zh: '年輕心靈掌握古老藝術的地方', th: 'ที่ซึ่งจิตใจเยาว์วัยเชี่ยวชาญศิลปะโบราณ' },
  'School of Coding Wizardry': { zh: '程式魔法學院', th: 'โรงเรียนเวทมนตร์การเขียนโค้ด' },
  'View Curriculum': { zh: '查看課程', th: 'ดูหลักสูตร' },
  'Enroll Now': { zh: '立即報名', th: 'ลงทะเบียนเลย' },
  'Sponsored by NumbahWan Guild': { zh: '由 NumbahWan 公會贊助', th: 'สนับสนุนโดย NumbahWan กิลด์' },
  'Click Anywhere to Close': { zh: '點擊任意處關閉', th: 'คลิกที่ไหนก็ได้เพื่อปิด' },
  'Enter email': { zh: '輸入電子郵件', th: 'กรอกอีเมล' },
  'Documenting the extraordinary in service of eternity': { zh: '記錄非凡，服務永恆', th: 'บันทึกสิ่งพิเศษเพื่อนิรันดร์' },
  'From bedroom battles to world stage. Dreams do come true.': { zh: '從臥室戰鬥到世界舞台。夢想確實能成真。', th: 'จากการต่อสู้ในห้องนอนสู่เวทีโลก ความฝันเป็นจริงได้' },
  'Jack in. Fight back.': { zh: '接入。反擊。', th: 'เชื่อมต่อ ตอบโต้' },
  'We appreciate your interest': { zh: '感謝您的關注', th: 'เราชื่นชมความสนใจของคุณ' },
  "We don't discriminate between carbon and silicon-based visitors": { zh: '我們不區分碳基和矽基訪客', th: 'เราไม่แบ่งแยกระหว่างผู้เยี่ยมชมที่เป็นคาร์บอนและซิลิคอน' },
  'The cosmos aligns in your favor...': { zh: '宇宙正在向你傾斜...', th: 'จักรวาลเข้าข้างคุณ...' },
  'In that moment, nothing else exists. Just you, your deck, and destiny.': { zh: '在那一刻，什麼都不存在。只有你、你的牌組和命運。', th: 'ในช่วงเวลานั้น ไม่มีสิ่งอื่นใดอยู่ เหลือเพียงคุณ เด็คของคุณ และชะตากรรม' },
  'Three years of practice. Thousands of games. This moment made it all worth it.': { zh: '三年的練習。數千場比賽。這一刻讓一切都值得。', th: 'สามปีแห่งการฝึกฝน เกมนับพัน ช่วงเวลานี้ทำให้ทุกอย่างคุ้มค่า' },
  'Those who look carefully will understand.': { zh: '仔細觀察的人會明白。', th: 'ผู้ที่สังเกตอย่างระมัดระวังจะเข้าใจ' },
  'Tap any card. The answer reveals itself to the patient observer.': { zh: '點擊任一張牌。答案會向耐心觀察者揭示。', th: 'แตะการ์ดใดก็ได้ คำตอบจะเปิดเผยต่อผู้สังเกตที่อดทน' },

  // ── Additional single words ──
  'Hero': { zh: '英雄', th: 'ฮีโร่' },
  'Description': { zh: '說明', th: 'คำอธิบาย' },
  'Attendees': { zh: '參加者', th: 'ผู้เข้าร่วม' },
  'Orders': { zh: '訂單', th: 'คำสั่งซื้อ' },
  'Rating': { zh: '評分', th: 'คะแนน' },
  'View': { zh: '查看', th: 'ดู' },
  'Research': { zh: '研究', th: 'วิจัย' },
  'Products': { zh: '商品', th: 'สินค้า' },
  'Services': { zh: '服務', th: 'บริการ' },
  'Reserve': { zh: '儲備', th: 'สำรอง' },
  'Character': { zh: '角色', th: 'ตัวละคร' },
  'Overview': { zh: '概覽', th: 'ภาพรวม' },
  'Code': { zh: '代碼', th: 'โค้ด' },
  'Actions': { zh: '操作', th: 'การดำเนินการ' },
  'Hair': { zh: '髮型', th: 'ผม' },
  'Eyes': { zh: '眼睛', th: 'ดวงตา' },
  'Face': { zh: '臉型', th: 'ใบหน้า' },
  'Costume': { zh: '服裝', th: 'เครื่องแต่งกาย' },
  'Clear': { zh: '清除', th: 'ล้าง' },
  'Origins': { zh: '起源', th: 'ต้นกำเนิด' },
  'Wood': { zh: '木材', th: 'ไม้' },
  'Improvements': { zh: '改善', th: 'การปรับปรุง' },
  'Improve': { zh: '改善', th: 'ปรับปรุง' },
  'Shipped': { zh: '已發送', th: 'จัดส่งแล้ว' },
  'Performance': { zh: '性能', th: 'ประสิทธิภาพ' },
  'Architecture': { zh: '架構', th: 'สถาปัตยกรรม' },
  'Circulating': { zh: '流通中', th: 'หมุนเวียน' },
  'Creative': { zh: '創意', th: 'สร้างสรรค์' },
  'Holders': { zh: '持有者', th: 'ผู้ถือ' },
  'Theory': { zh: '理論', th: 'ทฤษฎี' },
  'Sales': { zh: '銷售', th: 'ขาย' },
  'Exchange': { zh: '交易所', th: 'ตลาดแลกเปลี่ยน' },
  'Available': { zh: '可用', th: 'พร้อมใช้งาน' },
  'Claimed': { zh: '已領取', th: 'รับแล้ว' },
  'Mode': { zh: '模式', th: 'โหมด' },
  'Lookup': { zh: '查找', th: 'ค้นหา' },
  'Monitoring': { zh: '監控', th: 'การตรวจสอบ' },
  'Restaurant': { zh: '餐廳', th: 'ร้านอาหาร' },
  'Listings': { zh: '上架清單', th: 'รายการ' },
  'Districts': { zh: '區域', th: 'เขต' },
  'Providers': { zh: '提供者', th: 'ผู้ให้บริการ' },
  'Shops': { zh: '商店', th: 'ร้านค้า' },
  'Restaurants': { zh: '餐廳', th: 'ร้านอาหาร' },
  'Artisans': { zh: '工匠', th: 'ช่างฝีมือ' },
  'Issues': { zh: '問題', th: 'ปัญหา' },
  'Markets': { zh: '市場', th: 'ตลาด' },

  // ── Game class names ──
  'Dark Knight': { zh: '黑騎士', th: 'ดาร์คไนท์' },
  'Shadower': { zh: '暗影者', th: 'ชาโดว์เวอร์' },

  // ── Compound phrases (remaining from audit) ──
  'Deep Dives': { zh: '深度研究', th: 'เจาะลึก' },
  'Research Archives': { zh: '研究檔案', th: 'คลังงานวิจัย' },
  'Generate Codes': { zh: '產生代碼', th: 'สร้างโค้ด' },
  'Code Lookup': { zh: '代碼查詢', th: 'ค้นหาโค้ด' },
  'Claimed By': { zh: '領取者', th: 'รับโดย' },
  'NWG Value': { zh: 'NWG 價值', th: 'มูลค่า NWG' },
  'Export Queue': { zh: '匯出佇列', th: 'ส่งออกคิว' },
  'Features Built': { zh: '已建功能', th: 'ฟีเจอร์ที่สร้าง' },
  'The Abyss': { zh: '深淵', th: 'นรกขุม' },
  'Prize Pool': { zh: '獎池', th: 'เงินรางวัลรวม' },
  'Restaurant District': { zh: '餐廳區', th: 'ย่านร้านอาหาร' },
  'Handmade & Crafts': { zh: '手工藝品', th: 'งานฝีมือและหัตถกรรม' },
  'Real Estate': { zh: '房地產', th: 'อสังหาริมทรัพย์' },
  'Role Distribution': { zh: '角色分布', th: 'การกระจายบทบาท' },
  'Investment Thesis': { zh: '投資論點', th: 'วิทยานิพนธ์การลงทุน' },
  'Royal Penthouse': { zh: '皇家頂層套房', th: 'เพนท์เฮาส์หลวง' },
  'Business Hub': { zh: '商業中心', th: 'ศูนย์กลางธุรกิจ' },
  'Products Listed': { zh: '已上架商品', th: 'สินค้าที่ลงรายการ' },
  'Platform Fees': { zh: '平台費用', th: 'ค่าธรรมเนียมแพลตฟอร์ม' },
  'Services Directory': { zh: '服務目錄', th: 'สารบัญบริการ' },
  'Jobs & Gigs': { zh: '工作與兼職', th: 'งานและกิ๊ก' },
  'Zero Platform Fees': { zh: '零平台費用', th: 'ไม่มีค่าธรรมเนียมแพลตฟอร์ม' },
  'Instant Payments': { zh: '即時付款', th: 'ชำระเงินทันที' },
  'Fresh Produce': { zh: '新鮮農產品', th: 'ผลผลิตสด' },
  'Fresh Red Apples': { zh: '新鮮紅蘋果', th: 'แอปเปิ้ลแดงสด' },
  'Fresh Lettuce Bundle': { zh: '新鮮生菜束', th: 'ผักกาดหอมสด' },
  'Supermarket': { zh: '超市', th: 'ซูเปอร์มาร์เก็ต' },
  'Request Beta Access': { zh: '申請 Beta 存取', th: 'ขอสิทธิ์เข้าถึง Beta' },
  'Multi-Agent AI': { zh: '多代理 AI', th: 'AI หลายเอเจนต์' },
  'Real-Time Analysis': { zh: '即時分析', th: 'วิเคราะห์แบบเรียลไทม์' },
  'Ensemble Voting': { zh: '集成投票', th: 'การโหวตรวม' },
  'Transparent Voting': { zh: '透明投票', th: 'การโหวตโปร่งใส' },
  'Audit Trail': { zh: '稽核軌跡', th: 'เส้นทางการตรวจสอบ' },
  'Stocks & ETFs': { zh: '股票與 ETF', th: 'หุ้นและ ETF' },
  'Precious Metals': { zh: '貴金屬', th: 'โลหะมีค่า' },
  'Crypto & DeFi': { zh: '加密貨幣與 DeFi', th: 'คริปโตและ DeFi' },
  'Bonds & Fixed Income': { zh: '債券與固定收益', th: 'พันธบัตรและรายได้คงที่' },
  'Asset Coverage Universe': { zh: '資產覆蓋範圍', th: 'ขอบเขตสินทรัพย์ที่ครอบคลุม' },
  'Early Performance': { zh: '早期表現', th: 'ผลงานช่วงแรก' },
  'Sharpe Ratio': { zh: '夏普比率', th: 'อัตราส่วนชาร์ป' },
  'Max Drawdown': { zh: '最大回撤', th: 'การถอยตัวสูงสุด' },
  'Visit the Exchange': { zh: '前往交易所', th: 'เยี่ยมชมตลาดแลกเปลี่ยน' },
  'Asset Classes': { zh: '資產類別', th: 'ประเภทสินทรัพย์' },
  'Output Format': { zh: '輸出格式', th: 'รูปแบบผลลัพธ์' },
  'Code Format': { zh: '代碼格式', th: 'รูปแบบโค้ด' },
  'Generation Complete!': { zh: '產生完成！', th: 'สร้างเสร็จแล้ว!' },
  'Print Number': { zh: '列印編號', th: 'หมายเลขพิมพ์' },
  'Show QR': { zh: '顯示 QR', th: 'แสดง QR' },
  'Code not found': { zh: '找不到代碼', th: 'ไม่พบโค้ด' },
  'Codes Claimed': { zh: '已領取的代碼', th: 'โค้ดที่รับแล้ว' },
  'Export Unclaimed': { zh: '匯出未領取', th: 'ส่งออกที่ยังไม่รับ' },
  'Asian': { zh: '亞洲', th: 'เอเชีย' },
  'Western': { zh: '西式', th: 'ตะวันตก' },
  'Thai': { zh: '泰式', th: 'ไทย' },
  'Drinks': { zh: '飲品', th: 'เครื่องดื่ม' },
  'Bakery': { zh: '烘焙', th: 'เบเกอรี่' },
  'Part-time': { zh: '兼職', th: 'พาร์ทไทม์' },
  'Book Service': { zh: '預約服務', th: 'จองบริการ' },
  'Character Sheets': { zh: '角色表', th: 'แผ่นตัวละคร' },
  'Rising Trend': { zh: '上升趨勢', th: 'แนวโน้มขาขึ้น' },
  'Stable Economy': { zh: '穩定經濟', th: 'เศรษฐกิจมั่นคง' },
  'Wealth Distribution': { zh: '財富分配', th: 'การกระจายความมั่งคั่ง' },
  'Recent Trades': { zh: '最近交易', th: 'การซื้อขายล่าสุด' },
  'Quick Actions': { zh: '快速操作', th: 'การดำเนินการด่วน' },
  'Spend Currency': { zh: '消費貨幣', th: 'ใช้สกุลเงิน' },
  'Game Master Mode': { zh: 'GM 模式', th: 'โหมด Game Master' },
  'Deactivate GM Mode': { zh: '停用 GM 模式', th: 'ปิดโหมด GM' },

  // ── Regina ship page ──
  'Behold the Regina': { zh: '瞧瞧 Regina', th: 'จงดู Regina' },
  'Coming March 2026': { zh: '2026年3月推出', th: 'มาเดือนมีนาคม 2026' },

  // ── More food/restaurant terms ──
  'Pad Thai': { zh: '泰式炒河粉', th: 'ผัดไทย' },
  'Fried Rice': { zh: '炒飯', th: 'ข้าวผัด' },
  'Pet Supplies': { zh: '寵物用品', th: 'อุปกรณ์สัตว์เลี้ยง' },
  'Flash Sale': { zh: '限時特賣', th: 'แฟลชเซลล์' },
  'Cron Jobs': { zh: '排程任務', th: 'งานตั้งเวลา' },
  'Performance Snapshot': { zh: '性能快照', th: 'สแนปช็อตประสิทธิภาพ' },
  'Device Tier': { zh: '裝置層級', th: 'ระดับอุปกรณ์' },
  'Improvements Found': { zh: '發現改善項目', th: 'พบการปรับปรุง' },
  'Run Performance Audit': { zh: '執行效能審計', th: 'ตรวจสอบประสิทธิภาพ' },
  'Current Prize Pool': { zh: '目前獎池', th: 'เงินรางวัลปัจจุบัน' },
  'Day Streak': { zh: '連續天數', th: 'สตรีควัน' },
  'Compare': { zh: '比較', th: 'เปรียบเทียบ' },
  'Choose Your Package': { zh: '選擇你的方案', th: 'เลือกแพ็คเกจของคุณ' },
  'Gaming': { zh: '遊戲', th: 'เกม' },
  'Feature': { zh: '特色', th: 'คุณสมบัติ' },
  'Avatar DNA': { zh: '角色 DNA', th: 'DNA อวาตาร์' },
};

// ── Proper nouns / brand names that should NOT be translated ──
const KEEP_ENGLISH = new Set([
    'NumbahWan', 'RegginA', 'RegginO', 'NWG', 'NW', 'KINTSUGI',
    'MapleStory', 'Zakum', 'GM', 'MVP', 'PvP', 'PvE', 'D&D', 'DM',
    'CP', 'HP', 'ATK', 'DEF', 'DPS', 'XP', 'Lv', 'Contrib', 'TCG',
    'OK', 'Loading', 'v1', 'v2', 'v3', 'v9', 'Bitcoin', 'BTC', 'ETH',
    'Ethereum', 'NFT', 'DAO', 'DeFi', 'Web3', 'API', 'USD', 'ETF',
    'Parry Hotter', 'Asmongold', 'Tiger Woods', 'Wyckoff', 'Kintsugi',
    'R.M.S. Regina', 'Regina', 'Harlay', 'NumbahWan Guild', 'Natehouoho',
    'Google', 'Stanford', 'OpenAI', 'Boston Dynamics', 'Epic Games',
    'DeepMind', 'Twitch', 'YouTube', 'Discord', 'Twitter', 'Instagram',
    'Chrome', 'Firefox', 'Safari', 'Yuluner', 'NightShade', 'MatchaLatte',
    'Aquila', 'Claude', 'Gemini', 'Perplexity', 'Palantir', 'Broadcom',
    'Mei-Lin Chen', 'Kevin Park', 'Sarah Williams', 'Marcus Lee',
    'Yuki Tanaka', 'Tom Zhang', 'Prof. PixelCouture', 'Curator Morrison',
]);

// ══════════════════════════════════════════════════════════════════
//  COMPOSITIONAL TRANSLATION ENGINE
//  For strings not in the dictionary, tries:
//  1. Exact match in DICT
//  2. Case-insensitive match
//  3. Word-by-word composition from DICT
//  4. Preserve proper nouns, translate the rest
// ══════════════════════════════════════════════════════════════════

function translateString(enVal, targetLang) {
    if (!enVal || enVal.length <= 2) return null;

    // Skip if already not English
    if (/[\u4e00-\u9fff\u3400-\u4dbf\u0e00-\u0e7f]/.test(enVal)) return null;

    // Skip pure numbers/symbols/codes
    if (/^[\d\s.,;:!?#$%^&*()+=\-\/\\|@~`'"<>{}[\]]+$/.test(enVal)) return null;

    const trimmed = enVal.trim();

    // 1. Exact match
    if (DICT[trimmed]?.[targetLang]) return DICT[trimmed][targetLang];

    // 2. Case-insensitive exact match
    const lowerKey = Object.keys(DICT).find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (lowerKey && DICT[lowerKey][targetLang]) return DICT[lowerKey][targetLang];

    // 3. Strip trailing colon/ellipsis and try again
    const stripped = trimmed.replace(/[:.!?…]+$/, '').trim();
    if (stripped !== trimmed) {
        const suffix = trimmed.substring(stripped.length);
        const base = translateString(stripped, targetLang);
        if (base) return base + (targetLang === 'zh' ? suffix.replace(':', '：').replace('!', '！').replace('?', '？') : suffix);
    }

    // 4. Try without leading # $ + symbols
    if (/^[#$+]/.test(trimmed)) {
        const rest = trimmed.substring(1).trim();
        const translated = translateString(rest, targetLang);
        if (translated) return trimmed[0] + translated;
    }

    // 5. Split on " - " or " | " and translate parts
    for (const sep of [' - ', ' | ', ' — ', ' · ', ': ']) {
        if (trimmed.includes(sep)) {
            const parts = trimmed.split(sep);
            const translated = parts.map(p => translateString(p.trim(), targetLang) || p.trim());
            if (translated.some((t, i) => t !== parts[i].trim())) {
                const zhSep = sep === ': ' ? '：' : sep === ' - ' ? ' - ' : sep;
                return translated.join(targetLang === 'zh' ? zhSep : sep);
            }
        }
    }

    // 6. Word-by-word composition for multi-word phrases
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length <= 8) {
        // Try 2-word, then 3-word, then single-word lookups
        const result = [];
        let i = 0;
        let anyTranslated = false;

        while (i < words.length) {
            let matched = false;

            // Try 4-word phrase
            if (i + 3 < words.length) {
                const phrase4 = words.slice(i, i + 4).join(' ');
                const t4 = DICT[phrase4]?.[targetLang];
                if (t4) { result.push(t4); i += 4; anyTranslated = true; matched = true; }
            }

            // Try 3-word phrase
            if (!matched && i + 2 < words.length) {
                const phrase3 = words.slice(i, i + 3).join(' ');
                const t3 = DICT[phrase3]?.[targetLang];
                if (t3) { result.push(t3); i += 3; anyTranslated = true; matched = true; }
            }

            // Try 2-word phrase
            if (!matched && i + 1 < words.length) {
                const phrase2 = words.slice(i, i + 2).join(' ');
                const t2 = DICT[phrase2]?.[targetLang];
                if (!t2) {
                    // Case-insensitive
                    const lk2 = Object.keys(DICT).find(k => k.toLowerCase() === phrase2.toLowerCase());
                    if (lk2 && DICT[lk2][targetLang]) { result.push(DICT[lk2][targetLang]); i += 2; anyTranslated = true; matched = true; }
                } else { result.push(t2); i += 2; anyTranslated = true; matched = true; }
            }

            // Single word
            if (!matched) {
                const word = words[i];
                const cleanWord = word.replace(/[.,!?;:()'"]+/g, '');
                const punct = word.substring(cleanWord.length);

                if (KEEP_ENGLISH.has(cleanWord)) {
                    result.push(word);
                } else if (DICT[cleanWord]?.[targetLang]) {
                    result.push(DICT[cleanWord][targetLang] + (targetLang === 'zh' ? punct.replace(':', '：') : punct));
                    anyTranslated = true;
                } else {
                    // Case-insensitive single word
                    const lkw = Object.keys(DICT).find(k => k.toLowerCase() === cleanWord.toLowerCase());
                    if (lkw && DICT[lkw][targetLang]) {
                        result.push(DICT[lkw][targetLang] + (targetLang === 'zh' ? punct.replace(':', '：') : punct));
                        anyTranslated = true;
                    } else if (/^\d+/.test(word) || /^[A-Z]{2,}$/.test(cleanWord)) {
                        result.push(word); // Keep numbers and acronyms
                    } else {
                        result.push(word); // Keep untranslatable words as-is
                    }
                }
                i++;
            }
        }

        if (anyTranslated) {
            return result.join(targetLang === 'zh' ? '' : ' ');
        }
    }

    return null; // Can't translate
}

// ══════════════════════════════════════════════════════════════════
//  HTML FILE PROCESSING
// ══════════════════════════════════════════════════════════════════

function extractTranslationBlocks(html) {
    const blocks = [];
    const patterns = [
        /const\s+(\w+_I18N)\s*=\s*\{/g,
        /const\s+(\w+Translations)\s*=\s*\{/g,
        /const\s+(translations)\s*=\s*\{/g,
        /const\s+(i18n)\s*=\s*\{/g,
        /const\s+(pageTranslations)\s*=\s*\{/g,
    ];

    for (const pattern of patterns) {
        let m;
        while ((m = pattern.exec(html)) !== null) {
            const varName = m[1];
            const varStart = m.index;
            const bodyStart = m.index + m[0].length;

            // Find matching closing brace
            let depth = 1, pos = bodyStart;
            while (depth > 0 && pos < html.length) {
                if (html[pos] === '{') depth++;
                else if (html[pos] === '}') depth--;
                else if (html[pos] === "'" || html[pos] === '"' || html[pos] === '`') {
                    const q = html[pos]; pos++;
                    while (pos < html.length && html[pos] !== q) {
                        if (html[pos] === '\\') pos++;
                        pos++;
                    }
                }
                pos++;
            }
            const blockEnd = pos;
            const body = html.substring(bodyStart, blockEnd - 1);

            const langValues = extractLangValues(body);
            if (langValues && langValues.en && Object.keys(langValues.en).length > 0) {
                blocks.push({ varName, blockStart: varStart, blockEnd, ...langValues });
            }
        }
    }
    return blocks;
}

function extractLangValues(block) {
    const langs = {};
    const langPattern = /\b(en|zh|th)\s*:\s*\{/g;
    let m;
    const starts = [];
    while ((m = langPattern.exec(block)) !== null) {
        starts.push({ lang: m[1], start: m.index + m[0].length });
    }

    for (const { lang, start } of starts) {
        let depth = 1, pos = start;
        while (depth > 0 && pos < block.length) {
            if (block[pos] === '{') depth++;
            else if (block[pos] === '}') depth--;
            else if (block[pos] === "'" || block[pos] === '"' || block[pos] === '`') {
                const q = block[pos]; pos++;
                while (pos < block.length && block[pos] !== q) {
                    if (block[pos] === '\\') pos++;
                    pos++;
                }
            }
            pos++;
        }
        const body = block.substring(start, pos - 1);
        const kv = {};
        const kvRe = /\b([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(['"`])((?:(?!\2)[^\\]|\\.)*)\2/g;
        let kvm;
        while ((kvm = kvRe.exec(body)) !== null) kv[kvm[1]] = kvm[3];
        const quotedKvRe = /['"]([^'"]+)['"]\s*:\s*(['"`])((?:(?!\2)[^\\]|\\.)*)\2/g;
        while ((kvm = quotedKvRe.exec(body)) !== null) {
            if (!kv[kvm[1]]) kv[kvm[1]] = kvm[3];
        }
        langs[lang] = kv;
    }
    return Object.keys(langs).length > 0 ? langs : null;
}

function findFakeTranslations(block) {
    const fakes = { zh: {}, th: {} };
    const en = block.en || {};
    for (const lang of ['zh', 'th']) {
        const target = block[lang] || {};
        for (const [key, enVal] of Object.entries(en)) {
            const targetVal = target[key];
            if (!targetVal) continue;
            if (KEEP_ENGLISH.has(enVal.trim())) continue;
            if (enVal.length <= 3) continue;
            if (/^\d+$/.test(enVal)) continue;
            // Skip proper nouns: Level indicators, pure names, character names
            if (/^Lv\.\d/.test(enVal)) continue;
            if (/^[A-Z][a-z]+$/.test(enVal) && KEEP_ENGLISH.has(enVal)) continue;
            // Skip if contains Chinese/Thai already (means it's actually translated)
            if (/[\u4e00-\u9fff\u3400-\u4dbf\u0e00-\u0e7f]/.test(enVal)) continue;
            // Fake = zh/th value is identical to English
            if (targetVal === enVal) {
                fakes[lang][key] = enVal;
            }
        }
    }
    return fakes;
}

function findOrphanedKeys(html, blocks) {
    const dataKeys = new Set();
    const re = /data-i18n=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html)) !== null) dataKeys.add(m[1]);

    const allRegistered = new Set();
    for (const block of blocks) {
        for (const lang of SUPPORTED_LANGS) {
            if (block[lang]) for (const k of Object.keys(block[lang])) allRegistered.add(k);
        }
    }

    const orphaned = {};
    for (const key of dataKeys) {
        if (!allRegistered.has(key)) {
            const defaultRe = new RegExp(`data-i18n=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<`, 'g');
            const dm = defaultRe.exec(html);
            const defaultText = dm ? dm[1].trim() : key;
            orphaned[key] = defaultText;
        }
    }
    return orphaned;
}

// ── File Patching ───────────────────────────────────────────────

function patchTranslationValue(content, key, oldValue, newValue, targetLang, varName) {
    const escKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escOld = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escNew = newValue.replace(/'/g, "\\'").replace(/"/g, '\\"');

    const pattern = new RegExp(`(${escKey}\\s*:\\s*['"])${escOld}(['"])`, 'g');

    const varPattern = new RegExp(`const\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*\\{`);
    const varMatch = varPattern.exec(content);
    if (!varMatch) return content;

    const varStart = varMatch.index;
    const afterVar = content.substring(varStart);
    const langPattern = new RegExp(`\\b${targetLang}\\s*:\\s*\\{`);
    const langMatch = langPattern.exec(afterVar);
    if (!langMatch) return content;

    const langStart = varStart + langMatch.index + langMatch[0].length;
    let depth = 1, pos = langStart;
    while (depth > 0 && pos < content.length) {
        if (content[pos] === '{') depth++;
        else if (content[pos] === '}') depth--;
        else if (content[pos] === "'" || content[pos] === '"') {
            const q = content[pos]; pos++;
            while (pos < content.length && content[pos] !== q) {
                if (content[pos] === '\\') pos++;
                pos++;
            }
        }
        pos++;
    }
    const langEnd = pos;

    const langBlock = content.substring(langStart, langEnd);
    const newLangBlock = langBlock.replace(pattern, (match, prefix, suffix) => {
        return `${prefix}${escNew}${suffix}`;
    });

    if (newLangBlock !== langBlock) {
        return content.substring(0, langStart) + newLangBlock + content.substring(langEnd);
    }
    return content;
}

function addOrphanedKeysToBlock(content, varName, orphanedTranslations) {
    for (const lang of SUPPORTED_LANGS) {
        const vals = orphanedTranslations[lang] || {};
        if (Object.keys(vals).length === 0) continue;

        const afterVarRe = new RegExp(`const\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*\\{`);
        const afterVarMatch = afterVarRe.exec(content);
        if (!afterVarMatch) continue;

        const varStart = afterVarMatch.index;
        const afterVar = content.substring(varStart);
        const langRe = new RegExp(`\\b${lang}\\s*:\\s*\\{`);
        const langMatch = langRe.exec(afterVar);
        if (!langMatch) continue;

        const langBodyStart = varStart + langMatch.index + langMatch[0].length;
        let depth = 1, pos = langBodyStart;
        while (depth > 0 && pos < content.length) {
            if (content[pos] === '{') depth++;
            else if (content[pos] === '}') depth--;
            else if (content[pos] === "'" || content[pos] === '"') {
                const q = content[pos]; pos++;
                while (pos < content.length && content[pos] !== q) {
                    if (content[pos] === '\\') pos++;
                    pos++;
                }
            }
            pos++;
        }
        const closingBracePos = pos - 1;

        const newEntries = Object.entries(vals)
            .map(([k, v]) => {
                const escaped = String(v).replace(/'/g, "\\'");
                const keyStr = /^[a-zA-Z_$]/.test(k) ? k : `'${k}'`;
                return `    ${keyStr}: '${escaped}'`;
            })
            .join(',\n');

        const beforeClose = content.substring(0, closingBracePos);
        const afterClose = content.substring(closingBracePos);
        const trimmed = beforeClose.trimEnd();
        const needsComma = trimmed.length > 0 && !trimmed.endsWith(',') && !trimmed.endsWith('{');

        content = beforeClose + (needsComma ? ',\n' : '\n') + newEntries + '\n  ' + afterClose;
    }
    return content;
}

// ── Main ────────────────────────────────────────────────────────

function processPage(filePath) {
    const filename = path.basename(filePath);
    const pageName = filename.replace('.html', '');

    let html = fs.readFileSync(filePath, 'utf8');
    const blocks = extractTranslationBlocks(html);

    if (blocks.length === 0) return { page: pageName, fakes: 0, orphans: 0, skipped: 0 };

    let totalFakesFixed = 0;
    let totalSkipped = 0;

    // 1. Fix fake translations in each block
    for (const block of blocks) {
        const fakes = findFakeTranslations(block);

        for (const lang of ['zh', 'th']) {
            const fakeEntries = Object.entries(fakes[lang]);
            if (fakeEntries.length === 0) continue;

            for (const [key, enVal] of fakeEntries) {
                const translated = translateString(enVal, lang);
                if (!translated || translated === enVal) {
                    totalSkipped++;
                    continue;
                }

                const newHtml = patchTranslationValue(html, key, enVal, translated, lang, block.varName);
                if (newHtml !== html) {
                    html = newHtml;
                    totalFakesFixed++;
                }
            }
        }
    }

    // 2. Fix orphaned keys
    const orphaned = findOrphanedKeys(html, blocks);
    let totalOrphansFixed = 0;

    if (Object.keys(orphaned).length > 0 && blocks.length > 0) {
        const targetBlock = blocks[blocks.length - 1];
        const orphanEntries = Object.entries(orphaned);

        const orphanedTranslations = { en: {}, zh: {}, th: {} };

        for (const [key, enVal] of orphanEntries) {
            orphanedTranslations.en[key] = enVal;
            orphanedTranslations.zh[key] = translateString(enVal, 'zh') || enVal;
            orphanedTranslations.th[key] = translateString(enVal, 'th') || enVal;
        }

        html = addOrphanedKeysToBlock(html, targetBlock.varName, orphanedTranslations);
        totalOrphansFixed = orphanEntries.length;
    }

    // Write patched file
    if (!DRY_RUN && (totalFakesFixed > 0 || totalOrphansFixed > 0)) {
        fs.writeFileSync(filePath, html, 'utf8');
    }

    return { page: pageName, fakes: totalFakesFixed, orphans: totalOrphansFixed, skipped: totalSkipped };
}

function main() {
    console.log('\n\x1b[1m\x1b[36m');
    console.log('====================================================');
    console.log('  NW i18n Auto-Translator v2.0');
    console.log('  Offline dictionary engine (700+ entries)');
    console.log('  zh (繁中) + th (ไทย)');
    console.log('====================================================');
    console.log('\x1b[0m');

    if (DRY_RUN) console.log('\x1b[33m  DRY RUN — no files will be modified\x1b[0m\n');

    console.log(`  Dictionary size: ${Object.keys(DICT).length} entries\n`);

    const targetPage = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
    let files;

    if (targetPage) {
        const fn = targetPage.endsWith('.html') ? targetPage : `${targetPage}.html`;
        const fullPath = path.join(PUBLIC_DIR, fn);
        if (!fs.existsSync(fullPath)) {
            console.error(`File not found: ${fullPath}`);
            process.exit(1);
        }
        files = [fullPath];
    } else {
        files = fs.readdirSync(PUBLIC_DIR)
            .filter(f => f.endsWith('.html'))
            .map(f => path.join(PUBLIC_DIR, f))
            .sort();
    }

    console.log(`  Translating ${files.length} file(s)...\n`);

    let totalFakes = 0, totalOrphans = 0, totalSkipped = 0, pagesFixed = 0;

    for (const file of files) {
        const result = processPage(file);
        if (result.fakes > 0 || result.orphans > 0) {
            pagesFixed++;
            const parts = [];
            if (result.fakes > 0) parts.push(`${result.fakes} fakes fixed`);
            if (result.orphans > 0) parts.push(`${result.orphans} orphans added`);
            if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
            console.log(`  \x1b[32m✓ ${result.page}.html — ${parts.join(', ')}${DRY_RUN ? ' (dry-run)' : ''}\x1b[0m`);
        }
        totalFakes += result.fakes;
        totalOrphans += result.orphans;
        totalSkipped += result.skipped;
    }

    console.log('\n\x1b[1m' + '='.repeat(50) + '\x1b[0m');
    console.log(`  Pages translated:    ${pagesFixed}`);
    console.log(`  Fake fixes:          ${totalFakes}`);
    console.log(`  Orphan fixes:        ${totalOrphans}`);
    console.log(`  Skipped (no match):  ${totalSkipped}`);
    console.log(`  Total scanned:       ${files.length}`);
    if (DRY_RUN) console.log('\n  \x1b[33m⚠ DRY RUN — no files were modified\x1b[0m');
    console.log('\x1b[1m' + '='.repeat(50) + '\x1b[0m\n');
}

main();
