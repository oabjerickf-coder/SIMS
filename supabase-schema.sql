-- ============================================================
-- Student Information Management System — Supabase Schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query
-- ============================================================

-- 1. PROFILES (one row per authenticated user, linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('student','teacher','admin')),
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. STUDENT DETAILS (extra fields only students have)
create table if not exists public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  roll_no text unique,
  class_name text,
  guardian_contact text
);

-- 3. TEACHER DETAILS
create table if not exists public.teachers (
  id uuid primary key references public.profiles(id) on delete cascade,
  subject_specialty text
);

-- 4. GRADES
create table if not exists public.grades (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  subject text not null,
  term text not null default 'Term 1',
  grade text not null,
  entered_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- ============================================================
-- Auto-create a profile row whenever someone signs up.
-- Role/full_name are passed in from the sign-up form as
-- Supabase Auth "user metadata".
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );

  if coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then
    insert into public.students (id, roll_no, class_name)
    values (new.id, new.raw_user_meta_data->>'roll_no', new.raw_user_meta_data->>'class_name');
  elsif new.raw_user_meta_data->>'role' = 'teacher' then
    insert into public.teachers (id, subject_specialty)
    values (new.id, new.raw_user_meta_data->>'subject_specialty');
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.grades  enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.is_teacher()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'teacher'
  );
$$ language sql security definer stable;

-- PROFILES policies
create policy "view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin() or public.is_teacher());

create policy "admin updates any profile" on public.profiles
  for update using (public.is_admin());

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- STUDENTS policies
create policy "view own student row" on public.students
  for select using (auth.uid() = id or public.is_admin() or public.is_teacher());

create policy "admin manages students" on public.students
  for all using (public.is_admin());

create policy "students insert own row" on public.students
  for insert with check (auth.uid() = id);

create policy "students update own row" on public.students
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- TEACHERS policies
create policy "view own teacher row" on public.teachers
  for select using (auth.uid() = id or public.is_admin());

create policy "teachers insert own row" on public.teachers
  for insert with check (auth.uid() = id);

create policy "teachers update own row" on public.teachers
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- GRADES policies
create policy "student views own grades" on public.grades
  for select using (auth.uid() = student_id or public.is_admin() or public.is_teacher());

create policy "teacher inserts grades" on public.grades
  for insert with check (public.is_teacher() or public.is_admin());

create policy "teacher updates grades" on public.grades
  for update using (public.is_teacher() or public.is_admin());

-- ============================================================
-- Done. Next: create a Storage/Auth setup is not required —
-- Supabase Auth (email/password) is used out of the box.
-- ============================================================
