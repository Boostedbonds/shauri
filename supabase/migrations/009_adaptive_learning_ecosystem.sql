-- 009_adaptive_learning_ecosystem.sql
-- Core persistence for Oral Arena + Fun/Skill adaptive progression.

create table if not exists public.adaptive_profiles (
  id bigserial primary key,
  student_key text not null,
  student_name text not null,
  class_level text not null,
  board text not null default 'CBSE',
  mode text not null check (mode in ('oral','funskill','global')),
  xp integer not null default 0,
  level integer not null default 1,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  confidence_score numeric(5,2) not null default 50,
  mastery_score numeric(5,2) not null default 0,
  speaking_rank text not null default 'Initiate',
  unlocked_skills jsonb not null default '[]'::jsonb,
  weak_areas jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_key, mode)
);

create table if not exists public.adaptive_sessions (
  id bigserial primary key,
  student_key text not null,
  mode text not null,
  track text not null,
  difficulty integer not null default 1,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  xp_gained integer not null default 0,
  combo_peak integer not null default 0,
  accuracy numeric(5,2),
  avg_response_ms integer,
  confidence_delta numeric(5,2) default 0,
  performance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.adaptive_events (
  id bigserial primary key,
  student_key text not null,
  mode text not null,
  event_type text not null,
  track text,
  difficulty integer,
  confidence numeric(5,2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.oral_pronunciation_samples (
  id bigserial primary key,
  student_key text not null,
  topic text,
  transcript text not null,
  expected_terms jsonb not null default '[]'::jsonb,
  detected_terms jsonb not null default '[]'::jsonb,
  pronunciation_score numeric(5,2) not null default 0,
  fluency_score numeric(5,2) not null default 0,
  clarity_score numeric(5,2) not null default 0,
  pacing_wpm numeric(7,2),
  hesitation_count integer not null default 0,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_adaptive_profiles_student_mode on public.adaptive_profiles(student_key, mode);
create index if not exists idx_adaptive_sessions_student_mode on public.adaptive_sessions(student_key, mode, started_at desc);
create index if not exists idx_adaptive_events_student_mode on public.adaptive_events(student_key, mode, created_at desc);
create index if not exists idx_oral_pron_student on public.oral_pronunciation_samples(student_key, created_at desc);

create or replace function public.touch_adaptive_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_adaptive_profiles_updated_at on public.adaptive_profiles;
create trigger trg_touch_adaptive_profiles_updated_at
before update on public.adaptive_profiles
for each row
execute function public.touch_adaptive_profiles_updated_at();
