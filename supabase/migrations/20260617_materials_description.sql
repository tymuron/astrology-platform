-- ============================================================================
-- Feature: per-video description on lesson materials.
--
-- Extra lesson videos are stored as materials rows (type='video'). Add an
-- optional description so the teacher can write a note under each video; it
-- renders under that video for students. Backward compatible (nullable).
-- Idempotent.
-- ============================================================================

alter table public.materials
  add column if not exists description text;
