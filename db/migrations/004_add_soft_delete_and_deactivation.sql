-- 004_add_soft_delete_and_deactivation.sql
-- 目的：支持「软删除 + 回收站冷静期」「注销匿名化」「批量删除任务」，
--       防止用户一次性物理删除全部投稿导致社区内容蒸发 / 收藏死链 / 锁表。
-- 幂等：全部使用 IF NOT EXISTS / ON CONFLICT，可重复执行。

BEGIN;

-- 1) 文案软删除标记：NULL = 正常；非 NULL = 进入回收站的时间
ALTER TABLE wenan_copy_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN wenan_copy_items.deleted_at IS
  '软删除时间，NULL=正常；非 NULL=回收站，冷静期后由定时任务物理删除';

-- 回收站清理扫描索引（cron 按 deleted_at 过滤 + 排序）
CREATE INDEX IF NOT EXISTS idx_wenan_copy_items_deleted_at
  ON wenan_copy_items(deleted_at);

-- 2) 用户注销标记：NULL = 正常；非 NULL = 已注销（内容已匿名化）
ALTER TABLE wenan_users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN wenan_users.deactivated_at IS
  '注销时间，NULL=正常；注销后昵称改为「已注销用户#id」，登录被拒绝';

-- 3) 批量删除 / 注销任务表（异步分批、可观测、可恢复）
CREATE TABLE IF NOT EXISTS wenan_deletion_jobs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NULL REFERENCES wenan_users(id) ON DELETE SET NULL,
  kind        VARCHAR(20) NOT NULL
                CHECK (kind IN ('batch_delete','deactivate')),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  total       INTEGER NOT NULL DEFAULT 0,
  processed   INTEGER NOT NULL DEFAULT 0,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 如 {ids:[...], protected:[...]}
  error       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE wenan_deletion_jobs IS '批量删除/注销异步任务';

CREATE INDEX IF NOT EXISTS idx_wenan_deletion_jobs_status
  ON wenan_deletion_jobs(status, created_at);

-- 4) 站点设置默认值：收藏保护阈值、回收站冷静期天数
INSERT INTO wenan_site_settings (key, value) VALUES
  ('deletion_favorite_threshold', '3'),
  ('deletion_grace_days', '30')
ON CONFLICT (key) DO NOTHING;

COMMIT;
