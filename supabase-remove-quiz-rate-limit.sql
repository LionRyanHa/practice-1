-- Run this once in Supabase Dashboard > SQL Editor for an existing project.
-- It removes the custom 10-starts-per-hour quiz limit while keeping all
-- authentication, invite approval, lesson unlock, mode, and direction checks.

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
