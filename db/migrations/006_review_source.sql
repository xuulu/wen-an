-- 006_review_source.sql
-- 文案审核来源标记：区分「机器审核（AI）」与「人工审核」，用于用户后台区分展示提示与红字原因
ALTER TABLE wenan_copy_items
  ADD COLUMN IF NOT EXISTS review_source VARCHAR(16) NOT NULL DEFAULT 'manual';

-- 存量数据兜底：已有拒绝原因但未标记来源的，按人工处理（人工可在后台重新拒绝并覆盖原因）
UPDATE wenan_copy_items SET review_source = 'manual' WHERE review_source = 'manual' AND status = 'rejected' AND review_reason IS NULL AND review_reason = '';
