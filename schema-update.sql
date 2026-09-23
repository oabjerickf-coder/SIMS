-- ============================================================
-- SIMS Schema Update — Run in Supabase SQL Editor
-- Adds: teacher approval, announcements table, profile self-update
-- ============================================================

-- 1. Add 'approved' column to teachers table
alter table public.teachers
  add column if not exists approved boolean default false;

-- 2. Create announcements table
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  posted_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 3. Enable RLS on announcements
alter table public.announcements enable row level security;

-- 4. Announcements policies (drop first to prevent duplicate policy errors)
drop policy if exists "anyone can read announcements" on public.announcements;
create policy "anyone can read announcements" on public.announcements
  for select using (auth.uid() is not null);

drop policy if exists "admin inserts announcements" on public.announcements;
create policy "admin inserts announcements" on public.announcements
  for insert with check (public.is_admin());

drop policy if exists "admin updates announcements" on public.announcements;
create policy "admin updates announcements" on public.announcements
  for update using (public.is_admin());

drop policy if exists "admin deletes announcements" on public.announcements;
create policy "admin deletes announcements" on public.announcements
  for delete using (public.is_admin());

-- 5. Allow admins to update teachers (for approving)
drop policy if exists "admin updates teachers" on public.teachers;
create policy "admin updates teachers" on public.teachers
  for update using (public.is_admin());

-- 6. Also allow admins to view all teachers so admin can see who to approve
drop policy if exists "admin views all teachers" on public.teachers;
create policy "admin views all teachers" on public.teachers
  for select using (public.is_admin());

-- 7. Allow users to update their own profile (Admin, Teacher, Student)
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 8. Allow students to update their own student details
drop policy if exists "students update own row" on public.students;
create policy "students update own row" on public.students
  for update using (auth.uid() = id);

-- 9. Allow teachers to update their own teacher details
drop policy if exists "teachers update own row" on public.teachers;
create policy "teachers update own row" on public.teachers
  for update using (auth.uid() = id);

-- 10. Add 'avatar_url' column to profiles table
alter table public.profiles
  add column if not exists avatar_url text;

-- ============================================================
-- Done! Run this in Supabase SQL Editor.
-- ============================================================
