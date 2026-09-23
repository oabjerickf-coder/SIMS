-- ============================================================
-- SIMS Schema Update — Run in Supabase SQL Editor
-- Adds: teacher approval, announcements table
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

-- 4. Announcements policies
-- All authenticated users can read announcements
create policy "anyone can read announcements" on public.announcements
  for select using (auth.uid() is not null);

-- Only admins can insert announcements
create policy "admin inserts announcements" on public.announcements
  for insert with check (public.is_admin());

-- Only admins can update announcements
create policy "admin updates announcements" on public.announcements
  for update using (public.is_admin());

-- Only admins can delete announcements
create policy "admin deletes announcements" on public.announcements
  for delete using (public.is_admin());

-- 5. Allow teachers to read their own approved status
-- (already covered by existing "view own teacher row" policy)

-- 6. Allow admins to update teachers (for approving)
create policy "admin updates teachers" on public.teachers
  for update using (public.is_admin());

-- ============================================================
-- Done. Refresh your Supabase dashboard to see changes.
-- ============================================================
