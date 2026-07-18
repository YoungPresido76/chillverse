// src/features/economy/ProfileEffectPreview.tsx
//
// Discord-style "this is what others see when they view your profile"
// preview, used from the Mall's Profile Card Effect item sheet. It draws
// up your REAL profile (the same ProfilePreviewModal used everywhere else
// in the app — full header, bio, member since, etc.) and layers the
// effect's video on top of it, exactly like the reference screenshots.
//
// The video sits in its own layer with pointer-events: none, so nothing
// about interacting with the profile underneath changes — the only thing
// that has changed is a video is now playing over it. Tapping outside the
// profile card (its own backdrop) closes the preview and drops back to the
// item's buy sheet underneath, since that sheet was never unmounted.
import ProfilePreviewModal from '../profile/ProfilePreviewModal'

// Mirrors SHEET_HEIGHT_VH in ProfilePreviewModal.tsx / BUY_SHEET_HEIGHT_VH
// in Mall.tsx, so the video lines up exactly with the real sheet under it.
const SHEET_HEIGHT_VH = 85

export default function ProfileEffectPreview({
  userId, videoUrl, onClose,
}: {
  userId: string
  videoUrl: string | null
  onClose: () => void
}) {
  return (
    <>
      <ProfilePreviewModal userId={userId} onClose={onClose} />

      {/* Banner callout — sits above the sheet, same spot Discord puts it. */}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20002, background: 'rgba(20,20,24,0.92)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 20, padding: '9px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text)',
        whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}>
        This is a preview of how interesting your profile will be.
      </div>

      {/* Effect video — click-through, screen-blended so a black background
          in the source clip reads as transparent over the profile card. */}
      {videoUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 20001, pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            width: 'min(92vw, 460px)', height: `${SHEET_HEIGHT_VH}vh`,
            borderRadius: '20px 20px 0 0', overflow: 'hidden', position: 'relative',
          }}>
            <video
              src={videoUrl}
              autoPlay loop muted playsInline
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', mixBlendMode: 'screen',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
