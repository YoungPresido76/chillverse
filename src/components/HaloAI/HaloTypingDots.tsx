// src/components/HaloAI/HaloTypingDots.tsx

export default function HaloTypingDots() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--surface2)',
        borderRadius: 12,
        borderLeft: '2px solid var(--purple)',
        marginBottom: 8,
        width: 'fit-content',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span className="halo-dot" style={{ animationDelay: '0s' }} />
        <span className="halo-dot" style={{ animationDelay: '0.15s' }} />
        <span className="halo-dot" style={{ animationDelay: '0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Halo is thinking…</span>

      <style>{`
        @keyframes halo-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        .halo-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--purple);
          display: inline-block;
          animation: halo-bounce 1s infinite ease-in-out;
        }
      `}</style>
    </div>
  )
}
