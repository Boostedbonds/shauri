-- 010_adaptive_aggregation_engine.sql

create table if not exists public.adaptive_daily_snapshots (
  id bigserial primary key,
  snapshot_date date not null,
  student_key text not null,
  mode text not null,
  total_events integer not null default 0,
  total_sessions integer not null default 0,
  avg_accuracy numeric(5,2),
  avg_response_ms integer,
  avg_confidence numeric(5,2),
  pronunciation_avg numeric(5,2),
  mastery_score numeric(5,2),
  weak_area_count integer not null default 0,
  streak integer not null default 0,
  engagement_score numeric(5,2),
  created_at timestamptz not null default now(),
  unique(snapshot_date, student_key, mode)
);

create materialized view if not exists public.mv_adaptive_student_mastery as
select
  p.student_key,
  p.student_name,
  p.class_level,
  p.mode,
  p.xp,
  p.level,
  p.current_streak,
  p.best_streak,
  p.confidence_score,
  p.mastery_score,
  p.speaking_rank,
  coalesce((
    select avg(s.accuracy)
    from public.adaptive_sessions s
    where s.student_key = p.student_key and s.mode = p.mode
  ), 0)::numeric(5,2) as avg_accuracy,
  coalesce((
    select avg(s.avg_response_ms)
    from public.adaptive_sessions s
    where s.student_key = p.student_key and s.mode = p.mode
  ), 0)::integer as avg_response_ms,
  coalesce((
    select avg(op.pronunciation_score)
    from public.oral_pronunciation_samples op
    where op.student_key = p.student_key
  ), 0)::numeric(5,2) as pronunciation_avg,
  coalesce((
    select count(*)
    from public.adaptive_events e
    where e.student_key = p.student_key and e.mode = p.mode and e.created_at > now() - interval '7 day'
  ), 0)::integer as weekly_event_count,
  p.updated_at
from public.adaptive_profiles p;

create unique index if not exists idx_mv_adaptive_student_mastery_key_mode
  on public.mv_adaptive_student_mastery(student_key, mode);

create materialized view if not exists public.mv_adaptive_weak_areas as
select
  e.student_key,
  e.mode,
  coalesce(e.track, 'general') as track,
  count(*)::integer as event_count,
  avg(coalesce((e.payload->>'xpGain')::numeric, 0))::numeric(7,2) as avg_xp_gain,
  avg(coalesce((e.payload->>'elapsed')::numeric, 0))::numeric(9,2) as avg_elapsed_ms,
  avg(coalesce((e.payload->>'quality')::text = 'true')::int)::numeric(5,2) as quality_ratio,
  min(e.created_at) as first_seen,
  max(e.created_at) as last_seen
from public.adaptive_events e
where e.event_type in ('challenge_response', 'speech_sample')
group by e.student_key, e.mode, coalesce(e.track, 'general');

create index if not exists idx_mv_adaptive_weak_areas_key_mode
  on public.mv_adaptive_weak_areas(student_key, mode, track);

create or replace function public.refresh_adaptive_analytics()
returns void
language plpgsql
as $$
begin
  refresh materialized view concurrently public.mv_adaptive_student_mastery;
  refresh materialized view concurrently public.mv_adaptive_weak_areas;

  insert into public.adaptive_daily_snapshots (
    snapshot_date,
    student_key,
    mode,
    total_events,
    total_sessions,
    avg_accuracy,
    avg_response_ms,
    avg_confidence,
    pronunciation_avg,
    mastery_score,
    weak_area_count,
    streak,
    engagement_score
  )
  select
    current_date,
    p.student_key,
    p.mode,
    coalesce(ev.total_events, 0),
    coalesce(ss.total_sessions, 0),
    coalesce(ss.avg_accuracy, 0),
    coalesce(ss.avg_response_ms, 0),
    p.confidence_score,
    coalesce(pm.pronunciation_avg, 0),
    p.mastery_score,
    coalesce(wa.weak_count, 0),
    p.current_streak,
    round(((coalesce(ss.avg_accuracy, 0) * 0.35) + (p.confidence_score * 0.25) + (p.mastery_score * 0.25) + (least(coalesce(ev.total_events,0), 20) * 0.75)), 2)
  from public.adaptive_profiles p
  left join (
    select student_key, mode, count(*) total_events
    from public.adaptive_events
    where created_at >= now() - interval '24 hour'
    group by student_key, mode
  ) ev on ev.student_key = p.student_key and ev.mode = p.mode
  left join (
    select student_key, mode, count(*) total_sessions, avg(accuracy) avg_accuracy, avg(avg_response_ms) avg_response_ms
    from public.adaptive_sessions
    where started_at >= now() - interval '30 day'
    group by student_key, mode
  ) ss on ss.student_key = p.student_key and ss.mode = p.mode
  left join (
    select student_key, avg(pronunciation_score) pronunciation_avg
    from public.oral_pronunciation_samples
    where created_at >= now() - interval '30 day'
    group by student_key
  ) pm on pm.student_key = p.student_key
  left join (
    select student_key, mode, count(*) weak_count
    from public.mv_adaptive_weak_areas
    where quality_ratio < 0.6
    group by student_key, mode
  ) wa on wa.student_key = p.student_key and wa.mode = p.mode
  on conflict (snapshot_date, student_key, mode)
  do update set
    total_events = excluded.total_events,
    total_sessions = excluded.total_sessions,
    avg_accuracy = excluded.avg_accuracy,
    avg_response_ms = excluded.avg_response_ms,
    avg_confidence = excluded.avg_confidence,
    pronunciation_avg = excluded.pronunciation_avg,
    mastery_score = excluded.mastery_score,
    weak_area_count = excluded.weak_area_count,
    streak = excluded.streak,
    engagement_score = excluded.engagement_score,
    created_at = now();
end;
$$;
