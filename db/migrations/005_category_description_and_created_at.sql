-- 005_category_description_and_created_at.sql
-- 目的：
--   1) wenan_categories 增加 description：分类页展示「分类简介」，供 SEO 与用户理解该分类；
--   2) wenan_copy_items 增加 created_at：区分「发布时间」与「更新时间」（详情页 SEO 展示）。
-- 幂等：全部使用 IF NOT EXISTS，可重复执行。

BEGIN;

-- 1) 分类简介（空字符串 = 未填写，页面用默认简介兜底）
ALTER TABLE wenan_categories
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN wenan_categories.description IS
  '分类简介，空字符串表示未填写；分类页用默认简介兜底展示';

-- 2) 文案发布时间（NULL 兼容历史数据 = 视为与 updated_at 相同）
ALTER TABLE wenan_copy_items
  ADD COLUMN IF NOT EXISTS created_at DATE NULL;

-- 历史数据回填：created_at 为空时取 updated_at（历史语义中 updated_at 即发布日）
UPDATE wenan_copy_items
   SET created_at = updated_at
 WHERE created_at IS NULL;

COMMENT ON COLUMN wenan_copy_items.created_at IS
  '文案首次发布时间（YYYY-MM-DD）；NULL 的历史数据视为与 updated_at 相同';

COMMIT;
