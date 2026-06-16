-- ============================================================================
-- Feature support: ordered lesson materials (multiple videos per lesson).
--
-- Lesson-attached extra videos are stored as rows in public.materials with
-- type='video' and day_id set (reusing the existing video-materials render
-- path in LektionView). Add an order_index so several videos under one lesson
-- keep a stable, teacher-controlled order instead of arbitrary insertion order.
--
-- Backward compatible: existing rows default to 0 and sort stably by
-- (order_index, created_at). Idempotent.
-- ============================================================================

alter table public.materials
  add column if not exists order_index integer not null default 0;

create index if not exists materials_day_order_idx
  on public.materials (day_id, order_index);
