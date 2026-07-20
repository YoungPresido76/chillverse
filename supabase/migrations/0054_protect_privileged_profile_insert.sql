-- 0054_protect_privileged_profile_insert
-- ALREADY APPLIED to the live database on 2026-07-20 (via MCP, migration name
-- "protect_privileged_profile_insert"). Kept here so the repo mirrors production.
--
-- The INSERT grant on profiles covers all columns; force privileged fields
-- to safe defaults when the inserting role is a direct client.
create or replace function public.sanitize_privileged_profile_insert()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    new.xp := 0;
    new.level := 1;
    new.streak := 0;
    new.longest_streak := 0;
    new.is_pro := false;
    new.pro_tier := null;
    new.pro_billing_interval := null;
    new.pro_expires_at := null;
    new.pro_cancel_at_period_end := false;
    new.referral_count := 0;
    new.referral_completed := false;
    new.referral_tier_paid := 0;
    new.referred_by := null;
    new.staff_member_since := null;
    new.version_level := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists sanitize_privileged_profile_insert_trg on public.profiles;
create trigger sanitize_privileged_profile_insert_trg
  before insert on public.profiles
  for each row execute function public.sanitize_privileged_profile_insert();
