-- Only this email can see the current invite code in the app.

update public.profiles
set is_admin = false;

update public.profiles p
set
    is_admin = true,
    invite_approved = true
from auth.users u
where p.user_id = u.id
  and lower(u.email) = lower($$lionryan4796@gmail.com$$);
