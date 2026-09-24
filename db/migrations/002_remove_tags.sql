-- =============================================================
-- 迁移 002：移除文案标签（tags）功能
--
-- 安全策略：不直接破坏性删除生产数据。
--   1) 先将现有 tags 数据归档到 wenan_copy_tags_archive（幂等）
--   2) 再移除 tags 列与 GIN 索引
-- 回滚：执行 002_remove_tags.rollback.sql 可从归档恢复数据。
--
-- 注意：本脚本仅处理数据库层；代码层（API/UI/类型/搜索）需与
-- 本次迁移同步发布，避免运行中的代码引用已删除的列。
-- =============================================================

-- -------------------------------------------------------------
-- 1. 归档现有标签数据（幂等：按 copy_id + tag 去重，重复执行不产生重复归档）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wenan_copy_tags_archive (
  id          BIGSERIAL PRIMARY KEY,
  copy_id     BIGINT NOT NULL,
  tag         TEXT NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wenan_copy_tags_archive_copy
  ON wenan_copy_tags_archive(copy_id);

INSERT INTO wenan_copy_tags_archive (copy_id, tag)
SELECT c.id, t
FROM wenan_copy_items c
CROSS JOIN LATERAL unnest(c.tags) AS t
WHERE c.tags IS NOT NULL
  AND array_length(c.tags, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM wenan_copy_tags_archive a
    WHERE a.copy_id = c.id AND a.tag = t
  );

-- -------------------------------------------------------------
-- 2. 移除 tags 列与索引
-- -------------------------------------------------------------
DROP INDEX IF EXISTS idx_wenan_copy_items_tags;
ALTER TABLE wenan_copy_items DROP COLUMN IF EXISTS tags;

-- 归档表保留，便于日后回溯或恢复，不随迁移删除
