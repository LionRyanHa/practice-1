-- Run this entire file in Supabase Dashboard > SQL Editor after every update.
-- The browser receives no direct write access to application tables.

begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter default privileges for role postgres in schema public
    revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
    revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
    revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema private
    revoke execute on functions from public, anon, authenticated;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '한자 학습자',
    points integer not null default 0 check (points >= 0),
    level integer not null default 1 check (level >= 1),
    unlocked_lessons integer[] not null default array[1],
    last_attendance_date date,
    attendance_count integer not null default 0 check (attendance_count >= 0),
    theme text not null default 'light'
        check (theme in ('light', 'dark')),
    default_direction text not null default 'meaning-to-hanja'
        check (default_direction in (
            'meaning-to-hanja',
            'hanja-to-meaning',
            'mixed'
        )),
    owned_shop_items text[] not null default array['classic'],
    equipped_shop_item text not null default 'classic',
    legacy_imported boolean not null default false,
    invite_approved boolean not null default false,
    is_admin boolean not null default false,
    updated_at timestamptz not null default now()
);

alter table public.profiles
    add column if not exists owned_shop_items text[] default array['classic'],
    add column if not exists equipped_shop_item text default 'classic',
    add column if not exists invite_approved boolean,
    add column if not exists is_admin boolean;

update public.profiles
set
    invite_approved = coalesce(invite_approved, false),
    is_admin = coalesce(is_admin, false),
    points = greatest(coalesce(points, 0), 0),
    level = greatest(coalesce(level, 1), 1),
    unlocked_lessons = coalesce(unlocked_lessons, array[1]),
    owned_shop_items = coalesce((
        select array_agg(distinct owned_item.item_id order by owned_item.item_id)
        from unnest(
            array['classic'] || coalesce(owned_shop_items, array[]::text[])
        ) as owned_item(item_id)
        where owned_item.item_id in (
            'classic',
            'ember-ring',
            'violet-nebula',
            'crimson-nova',
            'azure-singularity',
            'cobalt-tide',
            'indigo-depth',
            'violet-orbit',
            'prism-crown'
        )
    ), array['classic']),
    equipped_shop_item = case
        when coalesce(equipped_shop_item, 'classic') in (
            'classic',
            'ember-ring',
            'violet-nebula',
            'crimson-nova',
            'azure-singularity',
            'cobalt-tide',
            'indigo-depth',
            'violet-orbit',
            'prism-crown'
        )
        and coalesce(equipped_shop_item, 'classic') = any(
            coalesce(owned_shop_items, array['classic'])
        )
            then coalesce(equipped_shop_item, 'classic')
        else 'classic'
    end;

alter table public.profiles
    alter column owned_shop_items set default array['classic'],
    alter column owned_shop_items set not null,
    alter column equipped_shop_item set default 'classic',
    alter column equipped_shop_item set not null,
    alter column invite_approved set default false,
    alter column invite_approved set not null,
    alter column is_admin set default false,
    alter column is_admin set not null;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

revoke all on table public.profiles from public, anon, authenticated;
grant all on table public.profiles to service_role;

create table if not exists public.app_invite_state (
    id boolean primary key default true check (id),
    current_code text not null,
    last_used_by uuid references auth.users(id) on delete set null,
    last_used_at timestamptz,
    updated_at timestamptz not null default now()
);

alter table public.app_invite_state enable row level security;
alter table public.app_invite_state force row level security;
revoke all on table public.app_invite_state from public, anon, authenticated;
grant all on table public.app_invite_state to service_role;

create table if not exists private.lesson_words (
    lesson_id smallint not null check (lesson_id between 1 and 5),
    word_order smallint not null check (word_order > 0),
    hanja text not null,
    meaning text not null,
    primary key (lesson_id, word_order)
);

create table if not exists private.quiz_attempts (
    id uuid primary key default extensions.gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    lesson_id smallint not null check (lesson_id between 1 and 5),
    mode text not null check (mode in ('ordered', 'random')),
    direction text not null check (direction in (
        'meaning-to-hanja',
        'hanja-to-meaning',
        'mixed'
    )),
    question_order smallint[] not null,
    question_directions text[] not null,
    current_index integer not null default 1 check (current_index > 0),
    streak integer not null default 0 check (streak >= 0),
    correct_count integer not null default 0 check (correct_count >= 0),
    points_earned integer not null default 0 check (points_earned >= 0),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '2 hours',
    completed_at timestamptz
);

create index if not exists quiz_attempts_user_created_idx
    on private.quiz_attempts (user_id, created_at desc);

create table if not exists private.quiz_answers (
    attempt_id uuid not null
        references private.quiz_attempts(id) on delete cascade,
    question_index integer not null check (question_index > 0),
    word_order smallint not null,
    direction text not null,
    submitted_answer text not null,
    is_correct boolean not null,
    reward integer not null check (reward >= 0),
    answered_at timestamptz not null default now(),
    primary key (attempt_id, question_index)
);

create table if not exists private.point_ledger (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    event_type text not null,
    reference_key text not null,
    amount integer not null,
    balance_after integer not null check (balance_after >= 0),
    created_at timestamptz not null default now(),
    unique (user_id, event_type, reference_key)
);

create index if not exists point_ledger_user_created_idx
    on private.point_ledger (user_id, created_at desc);

alter table private.lesson_words enable row level security;
alter table private.lesson_words force row level security;
alter table private.quiz_attempts enable row level security;
alter table private.quiz_attempts force row level security;
alter table private.quiz_answers enable row level security;
alter table private.quiz_answers force row level security;
alter table private.point_ledger enable row level security;
alter table private.point_ledger force row level security;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
grant all on all tables in schema private to service_role;
grant all on all sequences in schema private to service_role;

create or replace function private.generate_invite_code()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
    select upper(substr(
        encode(extensions.gen_random_bytes(16), 'hex'),
        1,
        16
    ));
$$;

insert into public.app_invite_state (id, current_code)
values (true, private.generate_invite_code())
on conflict (id) do nothing;

update public.app_invite_state
set
    current_code = private.generate_invite_code(),
    updated_at = now()
where current_code !~ '^[0-9A-F]{16}$';

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function private.block_browser_table_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if current_user in ('anon', 'authenticated') then
        raise exception 'direct_table_write_forbidden';
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

drop trigger if exists block_browser_profile_write on public.profiles;
create trigger block_browser_profile_write
    before insert or update or delete on public.profiles
    for each row execute function private.block_browser_table_write();

drop trigger if exists block_browser_invite_write
    on public.app_invite_state;
create trigger block_browser_invite_write
    before insert or update or delete on public.app_invite_state
    for each row execute function private.block_browser_table_write();

drop trigger if exists set_profile_updated_at on public.profiles;
create trigger set_profile_updated_at
    before update on public.profiles
    for each row execute function private.set_profile_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
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
    values (
        new.id,
        left(regexp_replace(fallback_name, '[[:cntrl:]]', '', 'g'), 12)
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id, display_name)
select
    user_record.id,
    left(
        regexp_replace(
            coalesce(
                nullif(trim(user_record.raw_user_meta_data ->> 'display_name'), ''),
                nullif(trim(user_record.raw_user_meta_data ->> 'full_name'), ''),
                nullif(trim(user_record.raw_user_meta_data ->> 'name'), ''),
                split_part(user_record.email, '@', 1),
                '한자 학습자'
            ),
            '[[:cntrl:]]',
            '',
            'g'
        ),
        12
    )
from auth.users as user_record
on conflict (user_id) do nothing;

create or replace function private.require_profile(require_access boolean)
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid();

    if not found then
        raise exception 'profile_not_found';
    end if;

    if require_access
       and not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    return profile_row;
end;
$$;

create or replace function private.profile_payload(
    profile_row public.profiles
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'user_id', profile_row.user_id,
        'display_name', profile_row.display_name,
        'points', profile_row.points,
        'level', profile_row.level,
        'unlocked_lessons', profile_row.unlocked_lessons,
        'last_attendance_date', profile_row.last_attendance_date,
        'attendance_count', profile_row.attendance_count,
        'theme', profile_row.theme,
        'default_direction', profile_row.default_direction,
        'owned_shop_items', profile_row.owned_shop_items,
        'equipped_shop_item', profile_row.equipped_shop_item,
        'legacy_imported', profile_row.legacy_imported,
        'invite_approved', profile_row.invite_approved,
        'is_admin', profile_row.is_admin,
        'updated_at', profile_row.updated_at
    );
$$;

create or replace function public.get_my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
begin
    profile_row := private.require_profile(false);
    return private.profile_payload(profile_row);
end;
$$;

create or replace function public.get_invite_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    invite_code text;
begin
    profile_row := private.require_profile(false);

    if profile_row.is_admin then
        select current_code
        into invite_code
        from public.app_invite_state
        where id = true;
    end if;

    return jsonb_build_object(
        'invite_approved', profile_row.invite_approved,
        'is_admin', profile_row.is_admin,
        'current_code', case
            when profile_row.is_admin then invite_code
            else null
        end
    );
end;
$$;

create or replace function public.claim_invite_code(code_input text)
returns jsonb
language plpgsql
security definer
set search_path = ''
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

    if normalized_code !~ '^[0-9A-F]{16}$' then
        raise exception 'invalid_invite_code';
    end if;

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

    if not found
       or normalized_code <> upper(state_row.current_code) then
        raise exception 'invalid_invite_code';
    end if;

    update public.profiles
    set invite_approved = true
    where user_id = auth.uid();

    update public.app_invite_state
    set
        current_code = private.generate_invite_code(),
        last_used_by = auth.uid(),
        last_used_at = now(),
        updated_at = now()
    where id = true;

    return public.get_invite_status();
end;
$$;

create or replace function public.update_profile_preferences(
    display_name_input text,
    theme_input text,
    default_direction_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    normalized_name text;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;
    normalized_name := left(
        regexp_replace(
            trim(coalesce(display_name_input, '')),
            '[[:cntrl:]]',
            '',
            'g'
        ),
        12
    );

    if normalized_name = '' then
        raise exception 'invalid_display_name';
    end if;

    if theme_input not in ('light', 'dark') then
        raise exception 'invalid_theme';
    end if;

    if default_direction_input not in (
        'meaning-to-hanja',
        'hanja-to-meaning',
        'mixed'
    ) then
        raise exception 'invalid_direction';
    end if;

    update public.profiles
    set
        display_name = normalized_name,
        theme = theme_input,
        default_direction = default_direction_input,
        legacy_imported = true
    where user_id = profile_row.user_id
    returning * into profile_row;

    return private.profile_payload(profile_row);
end;
$$;

create or replace function public.claim_attendance_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    today_key date := (now() at time zone 'Asia/Seoul')::date;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if profile_row.last_attendance_date = today_key then
        raise exception 'attendance_already_claimed';
    end if;

    update public.profiles
    set
        points = points + 100,
        last_attendance_date = today_key,
        attendance_count = attendance_count + 1
    where user_id = profile_row.user_id
    returning * into profile_row;

    insert into private.point_ledger (
        user_id,
        event_type,
        reference_key,
        amount,
        balance_after
    )
    values (
        profile_row.user_id,
        'attendance',
        today_key::text,
        100,
        profile_row.points
    );

    return private.profile_payload(profile_row);
end;
$$;

create or replace function public.purchase_lesson(lesson_id_input integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    lesson_price integer;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    lesson_price := case lesson_id_input
        when 2 then 250
        when 3 then 500
        when 4 then 850
        when 5 then 1200
        else null
    end;

    if lesson_price is null then
        raise exception 'invalid_lesson';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if lesson_id_input = any(profile_row.unlocked_lessons) then
        raise exception 'lesson_already_unlocked';
    end if;

    if not ((lesson_id_input - 1) = any(profile_row.unlocked_lessons)) then
        raise exception 'previous_lesson_required';
    end if;

    if profile_row.points < lesson_price then
        raise exception 'insufficient_points';
    end if;

    update public.profiles
    set
        points = points - lesson_price,
        unlocked_lessons = array_append(
            unlocked_lessons,
            lesson_id_input
        )
    where user_id = profile_row.user_id
    returning * into profile_row;

    insert into private.point_ledger (
        user_id,
        event_type,
        reference_key,
        amount,
        balance_after
    )
    values (
        profile_row.user_id,
        'lesson_purchase',
        lesson_id_input::text,
        -lesson_price,
        profile_row.points
    );

    return private.profile_payload(profile_row);
end;
$$;

create or replace function private.shop_item_price(item_id_input text)
returns integer
language sql
immutable
security definer
set search_path = ''
as $$
    select case item_id_input
        when 'classic' then 0
        when 'ember-ring' then 500
        when 'violet-nebula' then 1100
        when 'crimson-nova' then 2200
        when 'azure-singularity' then 2600
        when 'cobalt-tide' then 3000
        when 'indigo-depth' then 3400
        when 'violet-orbit' then 3900
        when 'prism-crown' then 4500
        else null
    end;
$$;

create or replace function private.shop_item_previous_id(item_id_input text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
    select case item_id_input
        when 'violet-nebula' then 'ember-ring'
        when 'crimson-nova' then 'violet-nebula'
        when 'azure-singularity' then 'crimson-nova'
        when 'cobalt-tide' then 'azure-singularity'
        when 'indigo-depth' then 'cobalt-tide'
        when 'violet-orbit' then 'indigo-depth'
        when 'prism-crown' then 'violet-orbit'
        else null
    end;
$$;

create or replace function public.equip_shop_item(item_id_input text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    normalized_item_id text;
    item_price integer;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    normalized_item_id := lower(trim(coalesce(item_id_input, '')));
    item_price := private.shop_item_price(normalized_item_id);

    if item_price is null then
        raise exception 'invalid_shop_item';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if not (normalized_item_id = any(profile_row.owned_shop_items)) then
        raise exception 'shop_item_not_owned';
    end if;

    update public.profiles
    set equipped_shop_item = normalized_item_id
    where user_id = profile_row.user_id
    returning * into profile_row;

    return private.profile_payload(profile_row);
end;
$$;

create or replace function public.purchase_shop_item(item_id_input text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    normalized_item_id text;
    item_price integer;
    previous_item_id text;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    normalized_item_id := lower(trim(coalesce(item_id_input, '')));
    item_price := private.shop_item_price(normalized_item_id);
    previous_item_id := private.shop_item_previous_id(normalized_item_id);

    if item_price is null or item_price = 0 then
        raise exception 'invalid_shop_item';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if normalized_item_id = any(profile_row.owned_shop_items) then
        raise exception 'shop_item_already_owned';
    end if;

    if previous_item_id is not null
        and not (previous_item_id = any(profile_row.owned_shop_items)) then
        raise exception 'shop_previous_item_required';
    end if;

    if profile_row.points < item_price then
        raise exception 'insufficient_points';
    end if;

    update public.profiles
    set
        points = points - item_price,
        owned_shop_items = array_append(owned_shop_items, normalized_item_id)
    where user_id = profile_row.user_id
    returning * into profile_row;

    insert into private.point_ledger (
        user_id,
        event_type,
        reference_key,
        amount,
        balance_after
    )
    values (
        profile_row.user_id,
        'shop_purchase',
        normalized_item_id,
        -item_price,
        profile_row.points
    );

    return private.profile_payload(profile_row);
end;
$$;

drop function if exists private.shop_item_required_level(text);

create or replace function public.level_up()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    level_cost integer;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if not (profile_row.unlocked_lessons @> array[1, 2, 3, 4, 5]) then
        raise exception 'all_lessons_required';
    end if;

    level_cost := 300 + (profile_row.level - 1) * 200;

    if profile_row.points < level_cost then
        raise exception 'insufficient_points';
    end if;

    update public.profiles
    set
        points = points - level_cost,
        level = level + 1
    where user_id = profile_row.user_id
    returning * into profile_row;

    insert into private.point_ledger (
        user_id,
        event_type,
        reference_key,
        amount,
        balance_after
    )
    values (
        profile_row.user_id,
        'level_up',
        profile_row.level::text,
        -level_cost,
        profile_row.points
    );

    return private.profile_payload(profile_row);
end;
$$;

create or replace function public.start_quiz_attempt(
    lesson_id_input integer,
    mode_input text,
    direction_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    profile_row public.profiles%rowtype;
    attempt_id uuid;
    question_order smallint[];
    question_directions text[] := array[]::text[];
    question_count integer;
    direction_offset integer := floor(random() * 2)::integer;
    question_index integer;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    if lesson_id_input not between 1 and 5
       or not (lesson_id_input = any(profile_row.unlocked_lessons)) then
        raise exception 'lesson_not_unlocked';
    end if;

    if mode_input not in ('ordered', 'random') then
        raise exception 'invalid_quiz_mode';
    end if;

    if direction_input not in (
        'meaning-to-hanja',
        'hanja-to-meaning',
        'mixed'
    ) then
        raise exception 'invalid_direction';
    end if;

    if mode_input = 'random' then
        select array_agg(word_order order by random())
        into question_order
        from private.lesson_words
        where lesson_id = lesson_id_input;
    else
        select array_agg(word_order order by word_order)
        into question_order
        from private.lesson_words
        where lesson_id = lesson_id_input;
    end if;

    question_count := coalesce(array_length(question_order, 1), 0);

    if question_count = 0 then
        raise exception 'lesson_answer_key_missing';
    end if;

    for question_index in 1..question_count loop
        question_directions := array_append(
            question_directions,
            case
                when direction_input = 'mixed'
                     and mod(question_index + direction_offset, 2) = 0
                    then 'meaning-to-hanja'
                when direction_input = 'mixed'
                    then 'hanja-to-meaning'
                else direction_input
            end
        );
    end loop;

    insert into private.quiz_attempts (
        user_id,
        lesson_id,
        mode,
        direction,
        question_order,
        question_directions
    )
    values (
        profile_row.user_id,
        lesson_id_input,
        mode_input,
        direction_input,
        question_order,
        question_directions
    )
    returning id into attempt_id;

    return jsonb_build_object(
        'attempt_id', attempt_id,
        'question_order', question_order,
        'question_directions', question_directions
    );
end;
$$;

create or replace function public.submit_quiz_answer(
    attempt_id_input uuid,
    question_index_input integer,
    answer_input text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    attempt_row private.quiz_attempts%rowtype;
    profile_row public.profiles%rowtype;
    word_row private.lesson_words%rowtype;
    expected_direction text;
    expected_order smallint;
    normalized_answer text;
    normalized_expected text;
    answer_is_correct boolean;
    next_streak integer;
    reward_amount integer := 0;
    question_count integer;
    attempt_completed boolean;
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    if answer_input is null or length(answer_input) > 100 then
        raise exception 'invalid_answer';
    end if;

    select *
    into attempt_row
    from private.quiz_attempts
    where id = attempt_id_input
      and user_id = auth.uid()
    for update;

    if not found then
        raise exception 'quiz_attempt_not_found';
    end if;

    if attempt_row.completed_at is not null then
        raise exception 'quiz_attempt_completed';
    end if;

    if attempt_row.expires_at < now() then
        raise exception 'quiz_attempt_expired';
    end if;

    if question_index_input <> attempt_row.current_index then
        raise exception 'quiz_question_out_of_order';
    end if;

    select *
    into profile_row
    from public.profiles
    where user_id = auth.uid()
    for update;

    if not found then
        raise exception 'profile_not_found';
    end if;

    if not (profile_row.invite_approved or profile_row.is_admin) then
        raise exception 'access_not_approved';
    end if;

    question_count := array_length(attempt_row.question_order, 1);
    expected_order := attempt_row.question_order[attempt_row.current_index];
    expected_direction :=
        attempt_row.question_directions[attempt_row.current_index];

    select *
    into word_row
    from private.lesson_words
    where lesson_id = attempt_row.lesson_id
      and word_order = expected_order;

    if not found then
        raise exception 'lesson_answer_key_missing';
    end if;

    if expected_direction = 'meaning-to-hanja' then
        answer_is_correct := trim(answer_input) = word_row.hanja;
    else
        normalized_answer := regexp_replace(
            lower(trim(answer_input)),
            '[[:space:],，·ㆍ.、/()_-]+',
            '',
            'g'
        );
        normalized_expected := regexp_replace(
            lower(trim(word_row.meaning)),
            '[[:space:],，·ㆍ.、/()_-]+',
            '',
            'g'
        );
        answer_is_correct :=
            normalized_answer <> ''
            and normalized_answer = normalized_expected;
    end if;

    if answer_is_correct then
        next_streak := attempt_row.streak + 1;
        reward_amount :=
            5 + least(greatest(next_streak - 1, 0), 5) * 2;

    else
        next_streak := 0;
    end if;

    attempt_completed := attempt_row.current_index >= question_count;

    insert into private.quiz_answers (
        attempt_id,
        question_index,
        word_order,
        direction,
        submitted_answer,
        is_correct,
        reward
    )
    values (
        attempt_row.id,
        attempt_row.current_index,
        expected_order,
        expected_direction,
        left(answer_input, 100),
        answer_is_correct,
        reward_amount
    );

    update private.quiz_attempts
    set
        current_index = current_index + 1,
        streak = next_streak,
        correct_count = correct_count +
            case when answer_is_correct then 1 else 0 end,
        points_earned = points_earned + reward_amount,
        completed_at = case
            when attempt_completed then now()
            else null
        end
    where id = attempt_row.id
    returning * into attempt_row;

    if reward_amount > 0 then
        update public.profiles
        set points = points + reward_amount
        where user_id = profile_row.user_id
        returning * into profile_row;

        insert into private.point_ledger (
            user_id,
            event_type,
            reference_key,
            amount,
            balance_after
        )
        values (
            profile_row.user_id,
            'quiz_answer',
            attempt_row.id::text || ':' || question_index_input::text,
            reward_amount,
            profile_row.points
        );
    end if;

    return jsonb_build_object(
        'is_correct', answer_is_correct,
        'reward', reward_amount,
        'points', profile_row.points,
        'streak', attempt_row.streak,
        'correct_count', attempt_row.correct_count,
        'points_earned', attempt_row.points_earned,
        'expected_hanja', word_row.hanja,
        'expected_meaning', word_row.meaning,
        'completed', attempt_completed
    );
end;
$$;

drop function if exists public.get_leaderboard(integer);
create function public.get_leaderboard(limit_count integer default 50)
returns table (
    rank bigint,
    display_name text,
    level integer,
    points integer,
    equipped_shop_item text,
    is_current boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    perform private.require_profile(true);

    return query
    with ranked_profiles as (
        select
            p.user_id,
            p.display_name,
            p.level,
            p.points,
            p.equipped_shop_item,
            row_number() over (
                order by
                    p.level desc,
                    p.points desc,
                    lower(p.display_name) asc,
                    p.user_id asc
            ) as profile_rank
        from public.profiles p
        where p.invite_approved or p.is_admin
    )
    select
        ranked_profiles.profile_rank,
        ranked_profiles.display_name,
        ranked_profiles.level,
        ranked_profiles.points,
        ranked_profiles.equipped_shop_item,
        ranked_profiles.user_id = auth.uid()
    from ranked_profiles
    order by ranked_profiles.profile_rank
    limit greatest(1, least(coalesce(limit_count, 50), 100));
end;
$$;

drop function if exists public.generate_invite_code();
drop function if exists public.set_profile_updated_at();

revoke execute on all functions in schema public
    from public, anon, authenticated;
revoke execute on all functions in schema private
    from public, anon, authenticated;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.get_invite_status() to authenticated;
grant execute on function public.claim_invite_code(text) to authenticated;
grant execute on function public.update_profile_preferences(text, text, text)
    to authenticated;
grant execute on function public.claim_attendance_reward()
    to authenticated;
grant execute on function public.purchase_lesson(integer)
    to authenticated;
grant execute on function public.purchase_shop_item(text)
    to authenticated;
grant execute on function public.equip_shop_item(text)
    to authenticated;
grant execute on function public.level_up() to authenticated;
grant execute on function public.start_quiz_attempt(integer, text, text)
    to authenticated;
grant execute on function public.submit_quiz_answer(uuid, integer, text)
    to authenticated;
grant execute on function public.get_leaderboard(integer)
    to authenticated;

grant execute on all functions in schema public to service_role;
grant execute on all functions in schema private to service_role;

commit;
