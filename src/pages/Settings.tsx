// src/pages/Settings.tsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, User, LogOut, UserPlus, Trash2,
  Calendar, Cake, Tag, Palette, Sparkles, Zap, Globe,
  Circle, Moon, EyeOff, Crown, Check, Lock, X,
} from 'lucide-react'
import { ripple } from '../lib/ripple'
import { useProfile } from '../hooks/useProfile'

/* ═══════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════ */
const CATEGORIES = [
  { id: 'account',     label: 'Account',          sub: 'Login, profile basics',       Icon: User    },
  { id: 'preferences', label: 'User Preferences',  sub: 'Live feed status',            Icon: Globe   },
]

const PRESENCE_OPTIONS = [
  { id: 'online',    label: 'Online',    desc: 'Visible to everyone, shown as active.',              color: '#3ecf8e', Icon: Circle  },
  { id: 'idle',      label: 'Idle',      desc: 'Visible, but marked as away.',                      color: '#f5c542', Icon: Moon    },
  { id: 'offline',   label: 'Offline',   desc: 'Appears offline to others.',                        color: '#888899', Icon: Circle  },
  { id: 'invisible', label: 'Invisible', desc: "Others can't search for you or add you to a game.", color: '#555566', Icon: EyeOff  },
]

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
function Row({ icon, iconBg, iconColor, label, value, danger = false, onClick }: {
  icon: React.ReactNode; iconBg: string; iconColor?: string
  label: string; value?: string; danger?: boolean; onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'ripple-wrap' : undefined}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'var(--surface)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, marginBottom:9, cursor: onClick ? 'pointer' : 'default', boxShadow:'3px 3px 9px var(--neu-dark),-2px -2px 7px var(--neu-light)' }}
    >
      <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:iconBg, color: danger ? '#ff6b6b' : iconColor }}>{icon}</div>
      <div style={{ flex:1, fontSize:13.5, fontWeight:600, color: danger ? '#ff6b6b' : 'var(--text)' }}>{label}</div>
      {value && <div style={{ fontSize:12.5, color:'var(--text-muted)' }}>{value}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:12, marginTop:20 }}>{children}</div>
}

function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:210, background:'var(--bg)', overflowY:'auto', animation:'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1) both' }}>
      <div style={{ position:'sticky', top:0, height:58, display:'flex', alignItems:'center', gap:14, padding:'0 20px', background:'rgba(17,17,19,0.90)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.05)', zIndex:50 }}>
        <button onClick={onBack} style={{ width:36, height:36, borderRadius:10, background:'var(--surface)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dim)', boxShadow:'2px 2px 6px var(--neu-dark),-1px -1px 4px var(--neu-light)' }}>
          <ArrowLeft size={15} />
        </button>
        <span style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{title}</span>
      </div>
      <div style={{ padding:'20px 20px 32px' }}>{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   ACCOUNT SUB-PAGE
═══════════════════════════════════════════════════ */
function AccountPage({ onBack, profile }: { onBack: () => void; profile: any }) {
  return (
    <SubPage title="Account" onBack={onBack}>
      <SectionTitle>Manage</SectionTitle>
      <Row icon={<LogOut size={15} />}   iconBg="rgba(255,107,0,0.12)"   iconColor="var(--accent)" label="Log out"       onClick={(e) => ripple(e as Parameters<typeof ripple>[0])} />
      <Row icon={<UserPlus size={15} />} iconBg="rgba(79,142,247,0.12)"  iconColor="#4f8ef7"       label="Add account"   onClick={(e) => ripple(e as Parameters<typeof ripple>[0])} />
      <Row icon={<Trash2 size={15} />}   iconBg="rgba(255,107,107,0.12)" label="Delete account"    danger onClick={(e) => ripple(e as Parameters<typeof ripple>[0])} />

      <SectionTitle>Account info</SectionTitle>
      <Row icon={<Calendar size={15} />} iconBg="var(--surface2)" iconColor="var(--text-dim)" label="Date joined" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—'} />
      <Row icon={<Tag size={15} />}      iconBg="var(--surface2)" iconColor="var(--text-dim)" label="Username"    value={profile?.username ?? '—'} />
      <Row icon={<Cake size={15} />}     iconBg="var(--surface2)" iconColor="var(--text-dim)" label="Version"     value="8.0" />
    </SubPage>
  )
}

/* ═══════════════════════════════════════════════════
   PREFERENCES SUB-PAGE
═══════════════════════════════════════════════════ */
function PreferencesPage({ onBack, presence, setPresence }: { onBack: () => void; presence: string; setPresence: (p: string) => void }) {
  return (
    <SubPage title="User Preferences" onBack={onBack}>
      <SectionTitle>Live feed status</SectionTitle>
      {PRESENCE_OPTIONS.map(p => (
        <div
          key={p.id}
          onClick={(e) => { ripple(e as Parameters<typeof ripple>[0]); setPresence(p.id) }}
          className="ripple-wrap"
          style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'var(--surface)', border: presence === p.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)', borderRadius:16, marginBottom:8, cursor:'pointer', boxShadow: presence === p.id ? '0 0 0 1px var(--accent)' : '3px 3px 9px var(--neu-dark),-2px -2px 7px var(--neu-light)' }}
        >
          <div style={{ width:11, height:11, borderRadius:'50%', background:p.color, boxShadow:`0 0 8px ${p.color}`, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:'var(--text)' }}>{p.label}</div>
            <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{p.desc}</div>
          </div>
          {presence === p.id && <Check size={16} color="var(--accent)" />}
        </div>
      ))}
    </SubPage>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN SETTINGS PAGE
═══════════════════════════════════════════════════ */
export default function Settings() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [presence, setPresence] = useState('online')

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

      <div style={{ maxWidth:800, margin:'0 auto' }}>
        {/* Topbar */}
        <div style={{ position:'sticky', top:0, height:58, display:'flex', alignItems:'center', gap:14, padding:'0 20px', background:'rgba(17,17,19,0.90)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.05)', zIndex:50, marginBottom:20 }}>
          <button onClick={() => navigate(-1)} style={{ width:36, height:36, borderRadius:10, background:'var(--surface)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-dim)', boxShadow:'2px 2px 6px var(--neu-dark),-1px -1px 4px var(--neu-light)' }}>
            <ArrowLeft size={15} />
          </button>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>Settings</span>
        </div>

        <div style={{ padding:'0 20px 32px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:12 }}>Categories</div>
          {CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              onClick={(e) => { ripple(e as Parameters<typeof ripple>[0]); setOpenSub(cat.id) }}
              className="ripple-wrap"
              style={{ display:'flex', alignItems:'center', gap:14, background:'var(--surface)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:18, padding:16, marginBottom:11, cursor:'pointer', boxShadow:'4px 4px 10px var(--neu-dark),-2px -2px 8px var(--neu-light)', animation:'feedIn 0.35s ease-out both', animationDelay:`${i*0.05}s` }}
            >
              <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', boxShadow:'2px 2px 6px var(--neu-dark),-1px -1px 4px var(--neu-light)' }}>
                <cat.Icon size={19} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:700, color:'var(--text)' }}>{cat.label}</div>
                <div style={{ fontSize:11.5, color:'var(--text-dim)', marginTop:2 }}>{cat.sub}</div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>

      {openSub === 'account'     && <AccountPage     onBack={() => setOpenSub(null)} profile={profile} />}
      {openSub === 'preferences' && <PreferencesPage onBack={() => setOpenSub(null)} presence={presence} setPresence={setPresence} />}

      <style>{`@keyframes feedIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </>
  )
}
