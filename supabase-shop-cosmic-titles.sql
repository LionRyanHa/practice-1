-- Add the 지구, 태양, 블랙홀 shop titles to an existing Supabase project.

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
        when 'earth-horizon' then 5200
        when 'solar-flare' then 6000
        when 'black-hole' then 7200
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
        when 'earth-horizon' then 'prism-crown'
        when 'solar-flare' then 'earth-horizon'
        when 'black-hole' then 'solar-flare'
        else null
    end;
$$;
