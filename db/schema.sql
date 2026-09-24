-- =============================================================
-- 文案库 PostgreSQL 建表脚本
-- 表：
--   wenan_users           用户
--   wenan_categories      类目
--   wenan_copy_items      文案（user_id 为 NULL 表示公共预置文案）
--   wenan_user_favorites  用户收藏（用户 × 文案 关联表）
--   wenan_feedbacks       用户意见反馈（管理员可回复）
--   wenan_site_settings   站点设置（键值表，admin 后台修改实时生效）
-- 说明：
--   - 主键使用 BIGSERIAL 自增
--   - 文案标签功能已于迁移 002 移除，标签数据归档在 wenan_copy_tags_archive
--   - 收藏不再挂在文案表上，而是独立关联表，支持多用户各自收藏
-- =============================================================

-- -------------------------------------------------------------
-- 1. 用户表
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_users (
  id            BIGSERIAL PRIMARY KEY,
  nickname      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(200) NULL,
  avatar_url    VARCHAR(500) NOT NULL DEFAULT '',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  wenan_users IS '用户';
COMMENT ON COLUMN wenan_users.nickname IS '账号名（登录与显示同一个）';
COMMENT ON COLUMN wenan_users.password_hash IS '密码哈希，格式 scrypt:salt:hash；NULL 表示未设置密码';

-- -------------------------------------------------------------
-- 2. 类目表
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_categories (
  id          BIGSERIAL PRIMARY KEY,
  label       VARCHAR(50) NOT NULL UNIQUE,
  color       VARCHAR(20) NOT NULL DEFAULT '#10b981'
                CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  wenan_categories IS '文案分类';
COMMENT ON COLUMN wenan_categories.color IS '类目配色，#RRGGBB 十六进制色码';

-- -------------------------------------------------------------
-- 3. 文案表
--    user_id 为 NULL 表示公共预置文案；非 NULL 表示用户自建
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_copy_items (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES wenan_categories(id) ON DELETE CASCADE,
  user_id     BIGINT NULL REFERENCES wenan_users(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'approved'
                CHECK (status IN ('pending','approved','rejected')),
  updated_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  review_reason TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE  wenan_copy_items IS '文案条目';
COMMENT ON COLUMN wenan_copy_items.user_id IS '创建者，NULL 表示公共预置文案';
COMMENT ON COLUMN wenan_copy_items.status IS '审核状态：pending 待审核 / approved 已通过 / rejected 已拒绝';
COMMENT ON COLUMN wenan_copy_items.review_reason IS '审核拒绝/不确定原因，供投稿用户查看';

-- 索引：按类目、按用户检索
CREATE INDEX IF NOT EXISTS idx_wenan_copy_items_category_id ON wenan_copy_items(category_id);
CREATE INDEX IF NOT EXISTS idx_wenan_copy_items_user_id     ON wenan_copy_items(user_id);

-- -------------------------------------------------------------
-- 4. 用户收藏表（用户 × 文案 关联）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_user_favorites (
  user_id    BIGINT NOT NULL REFERENCES wenan_users(id)       ON DELETE CASCADE,
  copy_id    BIGINT NOT NULL REFERENCES wenan_copy_items(id)  ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, copy_id)
);

COMMENT ON TABLE wenan_user_favorites IS '用户收藏的文案';

-- -------------------------------------------------------------
-- 5. 用户意见反馈表
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_feedbacks (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES wenan_users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL
                CHECK (type IN ('bug','suggestion','complaint','other')),
  content     TEXT NOT NULL,
  contact     VARCHAR(100) NOT NULL DEFAULT '',
  admin_reply TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','replied','closed')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  wenan_feedbacks IS '用户意见反馈';
COMMENT ON COLUMN wenan_feedbacks.type IS '反馈类型：bug 故障 / suggestion 建议 / complaint 投诉 / other 其他';
COMMENT ON COLUMN wenan_feedbacks.admin_reply IS '管理员回复内容';
COMMENT ON COLUMN wenan_feedbacks.status IS '处理状态：pending 待处理 / replied 已回复 / closed 已关闭';

-- -------------------------------------------------------------
-- 6. 站点设置表（键值：基本信息/SEO/页脚/审核/AI）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_site_settings (
  key        VARCHAR(64) PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE wenan_site_settings IS '站点设置（键值表）';

-- -------------------------------------------------------------
-- 7. 审核日志表（AI/关键词审核记录）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_review_logs (
  id          BIGSERIAL PRIMARY KEY,
  copy_id     BIGINT NULL REFERENCES wenan_copy_items(id) ON DELETE SET NULL,
  copy_title  VARCHAR(200) NOT NULL DEFAULT '',
  user_id     BIGINT NULL,
  method      VARCHAR(20) NOT NULL DEFAULT 'keyword'
                CHECK (method IN ('keyword','ai','auto','manual','schedule')),
  decision    VARCHAR(20) NOT NULL DEFAULT 'approved'
                CHECK (decision IN ('approved','rejected','pending')),
  reason      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wenan_review_logs_created
  ON wenan_review_logs(created_at DESC);

COMMENT ON TABLE wenan_review_logs IS '审核日志';

-- =============================================================
-- 种子数据
-- =============================================================

-- 清空已有种子数据（可按需注释掉）
TRUNCATE TABLE wenan_user_favorites, wenan_copy_items, wenan_categories, wenan_users, wenan_feedbacks
  RESTART IDENTITY CASCADE;

-- 用户（演示用，真实环境由注册流程创建）
-- 演示账号：demo / demo123456
INSERT INTO wenan_users (id, nickname, password_hash) VALUES
  (1, 'demo', 'scrypt:8ae53a230941cfa41304a9cc79dbbb41:3ed7a3b39dcecc311aeef0c6560bf5944992f14bdb846293fcc43571fcace8e6097f089d9a90b3a9006f0a9d36b4362b561ebc34293a5a3ef3fe679aef39841');

-- 类目
INSERT INTO wenan_categories (id, label, color, sort_order) VALUES
  (1, '节日活动',   '#f43f5e', 1),
  (2, '朋友圈文案', '#0ea5e9', 2),
  (3, '小红书文案', '#ec4899', 3),
  (4, '短视频文案', '#8b5cf6', 4),
  (5, '日常文案',   '#10b981', 5),
  (6, '诗句文案',   '#f59e0b', 6),
  (7, '旅游文案',   '#06b6d4', 7);

SELECT setval(pg_get_serial_sequence('wenan_categories','id'),
              (SELECT MAX(id) FROM wenan_categories));

-- 文案（公共预置，user_id 为 NULL，status 默认 approved）
INSERT INTO wenan_copy_items (id, title, content, category_id, user_id, status, updated_at) VALUES
  (1,  '春节品牌祝福',   '辞旧迎新岁，万事皆可期。祝你新春快乐，阖家安康，新的一年所愿皆所得。', 1, NULL, 'approved', '2026-09-05'),
  (2,  '中秋品牌关怀',   '月满中秋，情暖人间。愿所有的思念，都有归途；愿所有的团圆，都不被辜负。', 1, NULL, 'approved', '2026-09-01'),
  (3,  '国庆出游预热',   '七天长假，把生活调成喜欢的频道。山河辽阔，人间值得，出发就是最好的回答。', 1, NULL, 'approved', '2026-09-18'),

  (4,  '周末小确幸',     '睡到自然醒，阳光刚好，咖啡正热。慢下来的日子，每一秒都在发光。',         2, NULL, 'approved', '2026-09-12'),
  (5,  '打工人日常碎碎念','打工不是全部，但打工是为了更好地生活。今天也辛苦啦，奖励自己一顿好的。',   2, NULL, 'approved', '2026-09-10'),
  (6,  '深夜感悟',       '成年人的世界没有容易二字，但每一个咬牙坚持的夜晚，都在悄悄照亮未来的路。', 2, NULL, 'approved', '2026-09-08'),

  (7,  '救命！这个东西我怎么才发现','打工人的续命神器，用了一周直接回购三单，姐妹们冲就完事了，不好用你来找我！', 3, NULL, 'approved', '2026-09-15'),
  (8,  '平价好物分享',   '学生党也能闭眼入的宝藏清单，均价不超过 50 块，却能让幸福感直接拉满。',     3, NULL, 'approved', '2026-09-14'),
  (9,  '变美小心机',     '坚持这三个小习惯一个月，皮肤肉眼可见变好。低成本变美，贵在坚持。',         3, NULL, 'approved', '2026-09-06'),

  (10, '三分钟看完我的一天','从清晨的第一杯咖啡，到深夜的最后一盏灯。记录生活，是写给自己的情书。', 4, NULL, 'approved', '2026-09-17'),
  (11, '挑战 24 小时不看手机','放下手机的那一刻，世界安静了。原来生活里有这么多被忽略的美好。',     4, NULL, 'approved', '2026-09-13'),
  (12, '一个人的治愈时光','独处不是孤独，而是和自己对话的温柔时刻。点一盏灯，放一首歌，世界都是你的。', 4, NULL, 'approved', '2026-09-09'),

  (13, '早安问候',       '早安，愿你今天的每一份努力，都能被温柔以待。',                            5, NULL, 'approved', '2026-09-16'),
  (14, '晚安治愈',       '今天辛苦了，早点休息。梦里有星辰大海，醒来有光和希望。',                  5, NULL, 'approved', '2026-09-11'),
  (15, '雨天随笔',       '窗外下着雨，屋里煮着茶。日子不紧不慢，刚刚好是喜欢的样子。',              5, NULL, 'approved', '2026-09-04'),

  (16, '山居秋暝',       '空山新雨后，天气晚来秋。明月松间照，清泉石上流。',                        6, NULL, 'approved', '2026-08-28'),
  (17, '静夜思',         '床前明月光，疑是地上霜。举头望明月，低头思故乡。',                        6, NULL, 'approved', '2026-09-02'),
  (18, '登鹳雀楼',       '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',                        6, NULL, 'approved', '2026-08-30'),

  (19, '大理慢生活',     '在大理，时间是用来浪费的。苍山洱海之间，风花雪月之中，做一个闲云野鹤。', 7, NULL, 'approved', '2026-09-18'),
  (20, '川西自驾',       '一路向西，翻过折多山，遇见最美的自己。318 国道，每一公里都是风景。',      7, NULL, 'approved', '2026-09-07'),
  (21, '海岛度假',       '把烦恼丢进海里，让海风带走一切。沙滩、椰林、落日，这就是向往的生活。',    7, NULL, 'approved', '2026-09-03');

SELECT setval(pg_get_serial_sequence('wenan_copy_items','id'),
              (SELECT MAX(id) FROM wenan_copy_items));

-- 演示用户收藏了部分文案
INSERT INTO wenan_user_favorites (user_id, copy_id) VALUES
  (1, 1), (1, 3), (1, 4), (1, 7), (1, 10), (1, 14), (1, 17), (1, 19);
