-- Run this once in Supabase Dashboard > SQL Editor for an existing project.
-- It exposes each approved user's equipped title in the authenticated leaderboard.

begin;

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

revoke execute on function public.get_leaderboard(integer)
    from public, anon;
grant execute on function public.get_leaderboard(integer)
    to authenticated, service_role;

commit;
