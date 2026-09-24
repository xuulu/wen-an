-- =============================================================
-- 回滚 002：恢复文案标签（tags）列与数据
--
-- 从 wenan_copy_tags_archive 归档表恢复 tags 到 wenan_copy_items。
-- 注意：
--   - 仅恢复"归档时仍存在"的标签；归档后新增的文案无 tags（空数组）。
--   - 执行回滚前，请确认应用代码已同步回退到支持 tags 的版本。
-- =============================================================

-- 1. 恢复列与索引
ALTER TABLE wenan_copy_items ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_wenan_copy_items_tags
  ON wenan_copy_items USING GIN(tags);

COMMENT ON COLUMN wenan_copy_items.tags IS '标签数组';

-- 2. 从归档恢复数据（按归档顺序聚合）
UPDATE wenan_copy_items c
SET tags = COALESCE(
  (SELECT array_agg(a.tag ORDER BY a.id)
   FROM wenan_copy_tags_archive a
   WHERE a.copy_id = c.id),
  ARRAY[]::TEXT[]
)
WHERE EXISTS (
  SELECT 1 FROM wenan_copy_tags_archive a WHERE a.copy_id = c.id
);
