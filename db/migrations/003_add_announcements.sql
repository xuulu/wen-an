-- =============================================================
-- 迁移 003：新增公告表（公告系统）
--   wenan_announcements  站务公告（管理员发布，用户可读）
--   - is_hidden  隐藏后前端不展示（软隐藏，保留数据）
--   - is_pinned  置顶公告优先展示
-- 执行方式：psql "$DATABASE_URL" -f db/migrations/003_add_announcements.sql
-- 回滚：  psql "$DATABASE_URL" -f db/migrations/003_add_announcements.rollback.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS wenan_announcements (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  BIGINT NULL REFERENCES wenan_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  wenan_announcements IS '站务公告（公告系统）';
COMMENT ON COLUMN wenan_announcements.title IS '公告标题';
COMMENT ON COLUMN wenan_announcements.content IS '公告正文';
COMMENT ON COLUMN wenan_announcements.is_hidden IS '是否隐藏（软隐藏，不展示但保留数据）';
COMMENT ON COLUMN wenan_announcements.is_pinned IS '是否置顶（置顶优先展示）';
COMMENT ON COLUMN wenan_announcements.created_by IS '发布管理员（关联 wenan_users）';

-- 索引：用户可见列表 = 未隐藏 + 置顶优先 + 时间倒序
CREATE INDEX IF NOT EXISTS idx_announcements_list
  ON wenan_announcements (is_hidden, is_pinned DESC, created_at DESC);
