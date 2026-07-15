// src/features/moderation/modShowcase.ts
//
// Shared constant for every moderator-showcase surface (ModeratorProfile,
// ModeratorSelfProfile, ProfilePreviewModal) so the locked avatar URL only
// lives in one place. Never editable — always overrides whatever is in
// profiles.avatar/equipped_avatar for a role='moderator' account.
export const MOD_AVATAR_URL =
  'https://gnobzfxtxrtcxfhhfjni.supabase.co/storage/v1/object/public/profile-pics/Normal%20tier/3308681882ad4310930d385a6efb6a37.jpg'
