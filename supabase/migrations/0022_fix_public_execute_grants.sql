-- supabase/migrations/0022_fix_public_execute_grants.sql
--
-- Follow-up to 0021: the `revoke ... from anon` statements in that
-- migration didn't actually close access. Postgres grants EXECUTE to the
-- PUBLIC pseudo-role by default when a function is created, and every
-- role (including anon/authenticated) is implicitly a member of PUBLIC for
-- privilege-checking purposes. Revoking from anon/authenticated directly
-- does nothing while a PUBLIC grant remains — verified live: after 0021,
-- has_function_privilege('anon', ..., 'EXECUTE') was still true for every
-- function it tried to lock down. The fix is to revoke from PUBLIC
-- explicitly, then re-grant only to `authenticated` where a function
-- should stay callable by signed-in players.

revoke execute on function public.award_xp() from public;
revoke execute on function public.award_xp(uuid, integer) from public;
revoke execute on function public.block_wishlist_if_owned() from public;
revoke execute on function public.handle_highlight_like_change() from public;
revoke execute on function public.handle_new_profile_referral_code() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user_global_chat() from public;
revoke execute on function public.handle_post_comment_change() from public;
revoke execute on function public.handle_post_like_change() from public;
revoke execute on function public.log_call_message() from public;
revoke execute on function public.remove_wishlist_on_acquire() from public;
revoke execute on function public.set_reaction_room_id() from public;
revoke execute on function public.enforce_report_rate_limit() from public;
revoke execute on function public.enforce_voice_note_pro_gate() from public;
revoke execute on function public.increment_halo_count(uuid, date) from public;

revoke execute on function public.increment_session_count(uuid, integer, integer, numeric) from public;
revoke execute on function public.upgrade_version(uuid, integer, integer) from public;
revoke execute on function public.pk_end_game(uuid, uuid, uuid, integer) from public;
revoke execute on function public.insert_notification(uuid, text, text, text, text, jsonb) from public;
revoke execute on function public.update_streak(uuid) from public;
revoke execute on function public.get_session_info(uuid) from public;
revoke execute on function public.check_posting_eligibility(uuid) from public;

grant execute on function public.increment_session_count(uuid, integer, integer, numeric) to authenticated;
grant execute on function public.upgrade_version(uuid, integer, integer) to authenticated;
grant execute on function public.award_xp(uuid, integer) to authenticated;
grant execute on function public.pk_end_game(uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.insert_notification(uuid, text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_streak(uuid) to authenticated;
grant execute on function public.get_session_info(uuid) to authenticated;
grant execute on function public.check_posting_eligibility(uuid) to authenticated;

notify pgrst, 'reload schema';
