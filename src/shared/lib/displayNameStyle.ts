// src/shared/lib/displayNameStyle.ts
//
// Void-exclusive profile customization, part 1: display name font + colour.
// Single source of truth for the 5 selectable fonts and the colour palette,
// shared by DisplayNameStyleEditor.tsx and every surface that renders a
// player's display name (Profile, PlayerProfile, ProfilePreviewModal, Chat,
// Ranks, etc). Google Fonts themselves are loaded once in index.html.
//
// Deliberately simple, per spec: font + one solid colour, no gradients/
// effects. Gating (Void-only) happens client-side wherever the editor is
// opened from — these values are harmless to read/render for anyone.

export interface FontOption {
  id: string
  label: string
  /** CSS font-family stack, font already loaded via Google Fonts link in index.html */
  family: string
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'poppins',  label: 'Poppins',         family: "'Poppins', 'Inter', sans-serif" },
  { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'bebas',    label: 'Bebas Neue',       family: "'Bebas Neue', 'Inter', sans-serif" },
  { id: 'pacifico', label: 'Pacifico',         family: "'Pacifico', cursive" },
  { id: 'orbitron', label: 'Orbitron',         family: "'Orbitron', 'Inter', sans-serif" },
]

export function getFontFamily(fontId: string | null | undefined): string | undefined {
  if (!fontId) return undefined
  return FONT_OPTIONS.find(f => f.id === fontId)?.family
}

// One shared swatch palette used both for display-name colour and profile
// theme colour, so the two pickers feel like the same system.
export const COLOR_SWATCHES: string[] = [
  '#ff6b00', '#ff9a3c', '#ffb800', '#f5c542',
  '#3ecf8e', '#00ff87', '#00e5ff', '#4f8ef7',
  '#6c50ff', '#9b6dff', '#ff4ecd', '#ff4d8b',
  '#ff4f4f', '#ffffff', '#b8b8c4', '#1a1a24',
]

export interface NameStyleProfile {
  display_name_font?: string | null
  display_name_color?: string | null
}

/** CSS to spread onto whatever element renders a display name (works as
 *  React.CSSProperties without importing the React type here). */
export function nameStyleFor(profile: NameStyleProfile | null | undefined): { fontFamily?: string; color?: string } {
  if (!profile) return {}
  const style: { fontFamily?: string; color?: string } = {}
  const family = getFontFamily(profile.display_name_font)
  if (family) style.fontFamily = family
  if (profile.display_name_color) style.color = profile.display_name_color
  return style
}
