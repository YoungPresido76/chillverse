// src/features/profile/VoidProfileEdit.tsx
//
// Void-exclusive "fully customizable profile" feature. Deliberately tiny by
// design (per spec): two rows only —
//   1. Display Name Font & Dye  → pick 1 of 5 fonts + 1 solid colour
//   2. Profile Theme            → pick 1 solid colour, used as this
//                                  profile's page background for anyone
//                                  viewing it (self or others)
// No gradients, no "effect" types — just font + colour, matching the brief.
//
// Entry point: a glowing "Edit Profile with Void" button on Profile.tsx,
// shown only when isProActive(profile) && profile.pro_tier === 'void'.
import { useState, useEffect } from 'react'
import type React from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, Type, Palette, Check } from 'lucide-react'
import { supabase } from '../../shared/lib/supabase'
import { ripple } from '../../shared/lib/ripple'
import { FONT_OPTIONS, COLOR_SWATCHES } from '../../shared/lib/displayNameStyle'
import type { Profile } from '../../shared/types'

export interface VoidProfileSavedFields {
  display_name_font: string | null
  display_name_color: string | null
  profile_theme_color: string | null
}

interface VoidProfileEditProps {
  profile: Profile
  onClose: () => void
  onSaved: (updates: VoidProfileSavedFields) => void
  onToast: (msg: string) => void
}

type Screen = 'list' | 'name-style' | 'theme'

// ── Shared modal chrome (matches EditProfileModal's slide-up sheet) ──
function Sheet({
  title, onBack, children,
}: {
  title: string
  onBack: () => void
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20002, background: 'var(--bg)',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.32s cubic-bezier(0.34,1.0,0.64,1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button type="button" onClick={onBack}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface)', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{title}</span>
        <div style={{ width: 34 }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 28px' }}>
        {children}
      </div>
    </div>
  )
}

function ColorPalette({
  value, onChange,
}: {
  value: string | null
  onChange: (hex: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
      {COLOR_SWATCHES.map(hex => (
        <button key={hex} type="button" onClick={(e) => { ripple(e); onChange(hex) }}
          style={{
            width: '100%', aspectRatio: '1', borderRadius: 12, background: hex,
            border: value === hex ? '2px solid var(--text)' : '1px solid var(--border)',
            boxShadow: value === hex ? '0 0 0 3px rgba(255,255,255,0.12)' : 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {value === hex && <Check size={14} color={hex === '#ffffff' || hex === '#f5c542' ? '#000' : '#fff'} />}
        </button>
      ))}
    </div>
  )
}

export default function VoidProfileEdit({ profile, onClose, onSaved, onToast }: VoidProfileEditProps) {
  const [screen, setScreen] = useState<Screen>('list')
  const [saving, setSaving] = useState(false)

  const [font, setFont] = useState<string | null>(profile.display_name_font ?? null)
  const [nameColor, setNameColor] = useState<string | null>(profile.display_name_color ?? null)
  const [themeColor, setThemeColor] = useState<string | null>(profile.profile_theme_color ?? null)

  async function saveNameStyle() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ display_name_font: font, display_name_color: nameColor })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { onToast(error.message); return }
    onSaved({ display_name_font: font, display_name_color: nameColor, profile_theme_color: profile.profile_theme_color ?? null })
    onToast('Display name style updated')
    setScreen('list')
  }

  async function saveTheme() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ profile_theme_color: themeColor })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { onToast(error.message); return }
    onSaved({ display_name_font: profile.display_name_font ?? null, display_name_color: profile.display_name_color ?? null, profile_theme_color: themeColor })
    onToast('Profile theme updated')
    setScreen('list')
  }

  const previewFamily = FONT_OPTIONS.find(f => f.id === font)?.family

  return createPortal(
    <>
      {screen === 'list' && (
        <Sheet title="Edit Profile with Void" onBack={onClose}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
            Void-exclusive customization. Changes here show on your profile for everyone who views it.
          </p>

          <button type="button" onClick={(e) => { ripple(e); setScreen('name-style') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid rgba(155,109,255,0.3)', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(155,109,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Type size={16} style={{ color: '#9b6dff' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Display Name Font &amp; Dye</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {font ? FONT_OPTIONS.find(f => f.id === font)?.label : 'Default'}{nameColor ? ` · ${nameColor}` : ''}
                </div>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </button>

          <button type="button" onClick={(e) => { ripple(e); setScreen('theme') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid rgba(155,109,255,0.3)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(155,109,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Palette size={16} style={{ color: '#9b6dff' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Profile Theme</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{themeColor ?? 'Default'}</div>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </Sheet>
      )}

      {screen === 'name-style' && (
        <Sheet title="Display Name Font & Dye" onBack={() => setScreen('list')}>
          {/* Live preview */}
          <div style={{ padding: '20px 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 22, textAlign: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: previewFamily, color: nameColor ?? 'var(--text)' }}>
              {profile.display_name || profile.username}
            </span>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Font</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {FONT_OPTIONS.map(opt => (
              <button key={opt.id} type="button" onClick={(e) => { ripple(e); setFont(opt.id) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, background: font === opt.id ? 'rgba(155,109,255,0.14)' : 'var(--surface)', border: font === opt.id ? '1px solid rgba(155,109,255,0.5)' : '1px solid var(--border)', cursor: 'pointer' }}>
                <span style={{ fontFamily: opt.family, fontSize: 17, color: 'var(--text)' }}>{opt.label}</span>
                {font === opt.id && <Check size={15} style={{ color: '#9b6dff' }} />}
              </button>
            ))}
            <button type="button" onClick={(e) => { ripple(e); setFont(null) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, background: font === null ? 'rgba(155,109,255,0.14)' : 'var(--surface)', border: font === null ? '1px solid rgba(155,109,255,0.5)' : '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>Default (app font)</span>
              {font === null && <Check size={15} style={{ color: '#9b6dff' }} />}
            </button>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Colour</p>
          <ColorPalette value={nameColor} onChange={setNameColor} />

          <button type="button" onClick={(e) => { ripple(e); saveNameStyle() }} disabled={saving} className="btn-primary"
            style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800, marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </Sheet>
      )}

      {screen === 'theme' && (
        <Sheet title="Profile Theme" onBack={() => setScreen('list')}>
          <div style={{ height: 70, borderRadius: 16, background: themeColor ?? 'var(--bg)', border: '1px solid var(--border)', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11.5, color: themeColor ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', fontWeight: 700 }}>
              {themeColor ? 'This is your profile background' : 'Default background'}
            </span>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Colour</p>
          <ColorPalette value={themeColor} onChange={setThemeColor} />

          <button type="button" onClick={(e) => { ripple(e); setThemeColor(null) }}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: 13, fontWeight: 700, marginTop: 14, cursor: 'pointer' }}>
            Reset to default
          </button>

          <button type="button" onClick={(e) => { ripple(e); saveTheme() }} disabled={saving} className="btn-primary"
            style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 800, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </Sheet>
      )}
    </>,
    document.body,
  )
}
