-- Run this in Supabase Dashboard > SQL Editor after every schema update.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '한자 학습자',
    points integer not null default 0 check (points >= 0),
    level integer not null default 1 check (level >= 1),
    unlocked_lessons integer[] not null default array[1],
    last_attendance_date date,
    attendance_count integer not null default 0 check (attendance_count >= 0),
    theme text not null default 'light' check (theme in ('light', 'dark')),
    default_direction text not null default 'meaning-to-hanja' check (default_direction in ('meaning-to-hanja', 'hanja-to-meaning', 'mixed')),
    legacy_imported boolean not null default false,
    invite_approved boolean not null default false,
    is_admin boolean not null default false,
    updated_at timestamptz not null default now()
);

alter table public.profiles
    add column if not exists invite_approved boolean,
    add column if not exists is_admin boolean;

update public.profiles
set invite_approved = true
where invite_approved is null;

update public.profiles
set is_admin = false
where is_admin is null;

alter table public.profiles
    alter column invite_approved set default false,
    alter column invite_approved set not null,
    alter column is_admin set default false,
    alter column is_admin set not null;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
    on public.profiles for select
    to authenticated
    using (auth.uid() = user_id);

create policy profiles_insert_own
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy profiles_update_own
    on public.profiles for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (
    user_id,
    display_name,
    points,
    level,
    unlocked_lessons,
    last_attendance_date,
    attendance_count,
    theme,
    default_direction,
    legacy_imported
) on public.profiles to authenticated;
grant update (
    user_id,
    display_name,
    points,
    level,
    unlocked_lessons,
    last_attendance_date,
    attendance_count,
    theme,
    default_direction,
    legacy_imported
) on public.profiles to authenticated;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
    before update on public.profiles
    for each row execute function public.set_profile_updated_at();

create or replace function public.generate_invite_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
    select upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
$$;

revoke all on function public.generate_invite_code() from public;

create table if not exists public.app_invite_state (
    id boolean primary key default true check (id),
    current_code text not null,
    last_used_by uuid references auth.users(id) on delete set null,
    last_used_at timestamptz,
    updated_at timestamptz not null default now()
);

alter table public.app_invite_state enable row level security;
revoke all on public.app_invite_state from authenticated;
revoke all on public.app_invite_state from anon;

insert into public.app_invite_state (id, current_code)
values (true, public.generate_invite_code())
on conflict (id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definerN
set search_path = public
as $$
declare
    fallback_name text;
begin
    fallback_name := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(new.email, '@', 1),
        '한자 학습자'
    );

    insert into public.profiles (user_id, display_name)
    values (new.id, left(fallback_name, 12))
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute function public.handle_new_user_profile();

create or replace function public.get_invite_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    status jsonb;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select jsonb_build_object(
        'invite_approved', coalesce(p.invite_approved, false),
        'is_admin', coalesce(p.is_admin, false),
        'current_code', case when p.is_admin then s.current_code else null end
    )
    into status
    from public.profiles p
    left join public.app_invite_state s on true
    where p.user_id = auth.uid();

    if status is null then
        raise exception 'profile_not_found';
    end if;

    return status;
end;
$$;

create or replace function public.claim_invite_code(code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_code text;
    profile_row public.profiles%rowtype;
    state_row public.app_invite_state%rowtype;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    normalized_code := upper(trim(coalesce(code_input, '')));

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if profile_row.invite_approved or profile_row.is_admin then
        return public.get_invite_status();
    end if;

    select *
    into state_row
    from public.app_invite_state
    where id = true
    for update;

    if not found or normalized_code = '' or normalized_code <> upper(state_row.current_code) then
        raise exception 'invalid_invite_code';
    end if;

    update public.profiles
    set invite_approved = true
    where user_id = auth.uid();

    update public.app_invite_state
    set
        current_code = public.generate_invite_code(),
        last_used_by = auth.uid(),
        last_used_at = now(),
        updated_at = now()
    where id = true;

    return public.get_invite_status();
end;
$$;

revoke all on function public.get_invite_status() from public;
revoke all on function public.claim_invite_code(text) from public;
grant execute on function public.get_invite_status() to authenticated;
grant execute on function public.claim_invite_code(text) to authenticated;

create or replace function public.get_leaderboard(limit_count integer default 50)
returns table (
    rank bigint,
    display_name text,
    level integer,
    points integer,
    is_current boolean
)
language sql
stable
security definer
set search_path = public
as $$
    with ranked_profiles as (
        select
            p.user_id,
            p.display_name,
            p.level,
            p.points,
            row_number() over (
                order by p.level desc, p.points desc, lower(p.display_name) asc, p.user_id asc
            ) as rank
        from public.profiles p
        where p.invite_approved or p.is_admin
    )
    select
        ranked_profiles.rank,
        ranked_profiles.display_name,
        ranked_profiles.level,
        ranked_profiles.points,
        ranked_profiles.user_id = auth.uid() as is_current
    from ranked_profiles
    order by ranked_profiles.rank
    limit greatest(1, least(coalesce(limit_count, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;
