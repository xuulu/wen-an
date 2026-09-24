-- 004_add_soft_delete_and_deactivation.rollback.sql
-- 回滚 004：删除任务表、注销标记、软删除列与相关设置。
-- 注意：回滚会使回收站中尚未物理删除的内容重新变为「正常可见」
--       （deleted_at 列被移除），执行前请先确认业务可接受。

BEGIN;

DROP TABLE IF EXISTS wenan_deletion_jobs;

DROP INDEX IF EXISTS idx_wenan_copy_items_deleted_at;
ALTER TABLE wenan_copy_items DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE wenan_users DROP COLUMN IF EXISTS deactivated_at;

DELETE FROM wenan_site_settings
 WHERE key IN ('deletion_favorite_threshold', 'deletion_grace_days');

COMMIT;
