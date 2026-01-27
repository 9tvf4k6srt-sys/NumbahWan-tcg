-- ============================================
-- NumbahWan Guild - Seed Data
-- Migrated from JSON files
-- ============================================

-- Insert members
INSERT OR REPLACE INTO members (name, level, cp, cp_value, previous_cp, contribution, upgrade, role, online, days_ago, avatar, note) VALUES
('RegginA', 78, '3B 521M', 3521000000, 2867000000, 760, 4, 'Master', 1, NULL, '/static/avatar-reggina-zakum-gm.png', 'Zakum boss warrior - Guild Master'),
('Yuluner晴', 76, '2B 694M', 2694000000, 2328000000, 230, 0, 'Guild Member', 0, 'Today', '/static/avatar-yuluner-sunny-cheerful.jpg', '晴 = sunny/clear - Bright cheerful sun theme'),
('Natehouoho', 75, '2B 29M', 2029000000, 1197000000, 190, 0, 'Guild Member', 0, 'Today', '/static/avatar-natehouoho-playful-adventurer.jpg', 'Playful fun adventurer'),
('RegginO', 74, '1B 36M', 1036000000, 960002000, 560, 0, 'Vice Master', 0, 'Today', '/static/avatar-reggino-vicemaster-pinkhair.jpg', 'Pink hair with flower crown'),
('騎鳥回家', 71, '700M 955K', 700955000, 593939000, 560, 0, '小可愛', 0, 'Today', '/static/avatar-qiniaohuijia-riding-bird.jpg', 'Riding bird home - Character on bird mount'),
('紈蹈稀著', 72, '562M 108K', 562108000, 562108000, 0, 0, '領導', 0, 'Today', '/static/avatar-wandaoshuizhu-sleepy-gamer.jpg', 'Sleepy gamer falling asleep with phone'),
('阿光Yo', 68, '188M 981K', 188981000, 180315000, 190, 0, 'Guild Member', 0, 'Today', '/static/avatar-aguangyo-light-mage.jpg', '光 = light - Glowing light mage'),
('碼農小孫', 62, '31M 4K', 31004000, 31004000, 0, 0, 'Guild Member', 0, 'Today', '/static/avatar-manongxiaosun-programmer.jpg', '碼農 = programmer/coder - Tech geek with glasses'),
('泰拳寒玉', 52, '15M 329K', 15329000, 15329000, 0, 0, 'Guild Member', 0, 'Today', '/static/avatar-taiquanhanyu-thaiboxer-jade.jpg', 'Thai Boxing + Cold Jade - Martial artist ice theme');

-- Insert photos
INSERT OR REPLACE INTO photos (id, title_en, title_zh, title_th, description_en, description_zh, description_th, image) VALUES
(1, 'Henesys Market Day', '乾坤西斯市集日', 'วันตลาดเฮเนซิส', 'Shopping with the squad!', '和夥伴們一起逛街！', 'ช้อปปิ้งกับทีม!', '/static/guild-fun-1.jpg'),
(2, 'Selfie Time!', '自拍時間！', 'เวลาเซลฟี่!', 'Best friends forever', '永遠的好朋友', 'เพื่อนที่ดีที่สุดตลอดไป', '/static/guild-fun-2.jpg'),
(3, 'Sunset Chill', '夕陽時光', 'พักผ่อนยามเย็น', 'RegginA & friend on cloud nine', 'RegginA和朋友在雲端', 'RegginA และเพื่อนบนเมฆ', '/static/guild-fun-3.jpg'),
(4, 'Wings of Destiny', '命運之翼', 'ปีกแห่งโชคชะตา', 'Power couple goals', '戰力夫妻目標', 'เป้าหมายคู่รักสุดแกร่ง', '/static/guild-fun-4.jpg'),
(5, 'First Time Together', '第一次一起', 'ครั้งแรกด้วยกัน', 'Where it all began', '一切的開始', 'จุดเริ่มต้นของทุกอย่าง', '/static/guild-fun-5.jpg'),
(6, 'Boss Raid!', '打王啦！', 'บุกบอส!', 'Kerning City throwdown', '乾坤城大戰', 'ศึกเคอร์นิ่งซิตี้', '/static/guild-fun-6.jpg');

-- Insert guild stats
INSERT OR REPLACE INTO guild_stats (stat_key, stat_value) VALUES
('level', '7'),
('total_cp', '11.0B'),
('member_count', '9'),
('max_members', '20'),
('boss_raids_weekly', '24'),
('boss_raids_max', '35'),
('server_ranking', '47'),
('server', 'TW'),
('last_updated', '2026-01-27');
