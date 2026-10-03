-- 005_category_description_and_created_at.rollback.sql
-- 回滚：仅删除本迁移新增的列，不触碰业务数据。
-- 注意：回滚后 created_at 信息丢失（应用层将退回使用 updated_at 作为发布时间）。

BEGIN;

ALTER TABLE wenan_copy_items
  DROP COLUMN IF EXISTS created_at;

ALTER TABLE wenan_categories
  DROP COLUMN IF EXISTS description;

COMMIT;
