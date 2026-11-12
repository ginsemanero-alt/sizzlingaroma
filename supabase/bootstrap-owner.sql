-- Promote an existing Supabase Auth user to the first active Owner.
-- 1) Supabase → Authentication → Users → "Add user" (tick Auto Confirm).
-- 2) Replace the email below and run this in the SQL Editor.
update public.profiles
   set role = 'owner', active = true, name = 'Owner'
 where id = (select id from auth.users where email = 'owner@example.com');
