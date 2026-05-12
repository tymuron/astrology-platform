# Vastu Portal

A modern educational platform for Vastu courses.

## Features
- Student Dashboard
- Video Lessons
- Material Downloads
- Teacher Course Editor

## Tech Stack
- React + Vite
- Tailwind CSS
- Supabase (Auth + Database)

## Production Handover Checklist
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in hosting environment.
- Run SQL migrations in Supabase, including `supabase/handover_hardening.sql`.
- Confirm at least one teacher account exists in `profiles.role = 'teacher'`.
- Verify storage buckets exist: `course-content`, `library_files`, `avatars`.
