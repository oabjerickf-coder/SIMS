-- ============================================================
-- SIMS Realtime Setup — Run in Supabase SQL Editor
-- Enables instant live updates across all tables without refreshing!
-- ============================================================

-- 1. Enable REPLICA IDENTITY FULL
-- This ensures that UPDATE and DELETE payloads contain complete row data,
-- which is required for Row Level Security (RLS) real-time broadcasting.
alter table public.grades replica identity full;
alter table public.announcements replica identity full;
alter table public.teachers replica identity full;
alter table public.students replica identity full;
alter table public.profiles replica identity full;

-- 2. Ensure supabase_realtime publication exists
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- 3. Add tables to Supabase Realtime publication (supabase_realtime)
-- Wrapped in an idempotent PL/pgSQL block to prevent duplicate errors
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'grades'
  ) then
    alter publication supabase_realtime add table public.grades;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teachers'
  ) then
    alter publication supabase_realtime add table public.teachers;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- 4. Verification query: shows all tables now participating in Realtime
select schemaname, tablename 
from pg_publication_tables 
where pubname = 'supabase_realtime'
order by tablename;
