create extension if not exists pgcrypto;

create type briefing_status as enum ('open', 'closed', 'held', 'archived');
create type topic_status as enum ('pending', 'treated', 'other_forum', 'postponed');
create type app_role as enum ('employee', 'admin');

create table app_users (
  id uuid primary key default gen_random_uuid(),
  role app_role not null default 'employee',
  external_auth_id text unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table app_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  role app_role not null,
  user_id uuid references app_users(id) on delete cascade,
  admin_username text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint app_sessions_owner_check check (
    (role = 'employee' and user_id is not null and admin_username is null) or
    (role = 'admin' and user_id is null and admin_username is not null)
  )
);

create table briefings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text not null,
  briefing_at timestamptz not null,
  voting_ends_at timestamptz not null,
  status briefing_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint briefings_voting_before_briefing
    check (voting_ends_at <= briefing_at)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references briefings(id) on delete cascade,
  title text not null,
  description text not null,
  status topic_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (id, briefing_id)
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  topic_id uuid not null,
  briefing_id uuid not null references briefings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_topic_in_briefing_fk
    foreign key (topic_id, briefing_id)
    references topics (id, briefing_id)
    on delete cascade,
  constraint votes_unique_user_topic_briefing
    unique (user_id, topic_id, briefing_id)
);

create index votes_by_briefing_idx on votes (briefing_id, created_at desc);
create index topics_by_briefing_idx on topics (briefing_id, created_at asc);

create or replace view briefing_topic_ranking as
select
  t.id as topic_id,
  t.briefing_id,
  t.title,
  t.description,
  t.status,
  t.created_at,
  count(v.id)::int as vote_count,
  dense_rank() over (
    partition by t.briefing_id
    order by count(v.id) desc, t.created_at asc
  ) as ranking
from topics t
left join votes v
  on v.topic_id = t.id
 and v.briefing_id = t.briefing_id
group by t.id, t.briefing_id, t.title, t.description, t.status, t.created_at;

create or replace function cast_vote(
  p_user_id uuid,
  p_topic_id uuid,
  p_briefing_id uuid
)
returns votes
language plpgsql
as $$
declare
  v_briefing briefings%rowtype;
  v_vote votes%rowtype;
begin
  select *
    into v_briefing
    from briefings
   where id = p_briefing_id
   for update;

  if not found then
    raise exception 'Briefing not found';
  end if;

  if v_briefing.status <> 'open' then
    raise exception 'Voting closed by briefing status';
  end if;

  if v_briefing.voting_ends_at <= now() then
    raise exception 'Voting closed by deadline';
  end if;

  insert into votes (user_id, topic_id, briefing_id)
  values (p_user_id, p_topic_id, p_briefing_id)
  on conflict on constraint votes_unique_user_topic_briefing
  do nothing
  returning * into v_vote;

  if v_vote.id is null then
    raise exception 'User already voted this topic in this briefing';
  end if;

  return v_vote;
end;
$$;

insert into app_users (role, external_auth_id, display_name)
select
  'employee',
  employee_id,
  employee_id
from unnest(array[
  '130053', '7243', '261323', '166249', '139', '451', '470', '1069', '1332', '1637',
  '3715', '5043', '5170', '5261', '5293', '5302', '5342', '5388', '5435', '5457',
  '5463', '6423', '6728', '6818', '6919', '7370', '7609', '8000', '32484', '32635',
  '33153', '33203', '33910', '33930', '34016', '80867', '101115', '102268', '102384',
  '103730', '103984', '104259', '107013', '119370', '121142', '121589', '125428',
  '125613', '126510', '128250', '290135', '144246', '145756', '146419', '147729',
  '148672', '150604', '154418', '158298', '164038', '168879', '172936', '173754',
  '173929', '175089', '182399', '184886', '197516', '198000', '200818', '201561',
  '204078', '206004', '208427', '216102', '217556', '221155', '236158', '246262',
  '249085', '249238', '263766', '270371', '281348', '283124', '158545'
]) as employee_id
on conflict (external_auth_id) do nothing;
