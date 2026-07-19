// src/features/chat/calling/CallContext.tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../../../shared/lib/supabase'
import { getRtcConfig } from './webrtcConfig'
import { getMediaErrorMessage } from '../getMediaErrorMessage'
import { notifyMissedCall } from '../../achievements/achievements'
import IncomingCallRinger from './IncomingCallRinger'
import CallScreen from './CallScreen'
import MinimizedCallBar from './MinimizedCallBar'
import type { ActiveCallState, CallParticipant, CallRow, CallSignal, CallType } from './types'

const RING_TIMEOUT_MS = 45_000 // caller marks the call 'missed' if unanswered this long

const INITIAL_STATE: ActiveCallState = {
  phase: 'idle',
  call: null,
  otherParticipant: null,
  isCaller: false,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  durationSeconds: 0,
  isMinimized: false,
}

interface CallContextValue extends ActiveCallState {
  /** Places an outgoing call. `roomId` must be a DM room both users are already
   *  members of (enforced by RLS) — Global Chat has no calling entry point. */
  startCall: (roomId: string, callee: CallParticipant, type: CallType) => Promise<void>
  acceptCall: () => Promise<void>
  declineCall: () => Promise<void>
  /** Ends a call in any phase: cancels an outgoing ring, or hangs up a connected call. */
  endCall: () => Promise<void>
  toggleMute: () => void
  /** Collapses the full-screen call UI to a small persistent bar so the person
   *  can navigate the rest of the app — the call itself (WebRTC connection,
   *  timers, signaling) is completely unaffected, since it already lives in
   *  this provider mounted at the AppLayout level, above the page router. */
  minimizeCall: () => void
  restoreCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

/** Consumed by StartCallButton (in Chat.tsx's DM header) to place calls, and by
 *  anything else that ever needs to know "is a call currently active". */
export function useCall(): CallContextValue {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall() must be used within a <CallProvider>')
  return ctx
}

async function fetchParticipant(userId: string): Promise<CallParticipant | null> {
  const { data } = await supabase.from('profiles').select('id, username, display_name, avatar').eq('id', userId).single()
  return data ?? null
}

interface CallProviderProps {
  myId: string | null
  children: ReactNode
}

/** Mounted once in AppLayout so calls can be received from anywhere in the app,
 *  not just while the Chat page happens to be open — matching how a phone call
 *  or WhatsApp call rings regardless of which app/screen you're on. */
export default function CallProvider({ myId, children }: CallProviderProps) {
  const [state, setState] = useState<ActiveCallState>(INITIAL_STATE)

  // Independent of ActiveCallState on purpose: teardown() resets state to
  // INITIAL_STATE (which zeroes out state.error) the instant a call ends, so
  // an error set right before/alongside a teardown call would be wiped before
  // ever rendering, or shown for a single flash frame at best. This survives
  // the reset and is shown as a toast even after phase has returned to idle.
  const [callError, setCallError] = useState<string | null>(null)
  useEffect(() => {
    if (!callError) return
    const t = setTimeout(() => setCallError(null), 6000)
    return () => clearTimeout(t)
  }, [callError])

  // Mutable refs for things that must survive re-renders but shouldn't trigger
  // them, and that every callback below needs the CURRENT value of (avoiding
  // stale closures without re-subscribing realtime channels on every render).
  const stateRef = useRef(state)
  stateRef.current = state

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remoteDescriptionSetRef = useRef(false)

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null }
  }, [])

  const clearDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null }
  }, [])

  /** Full teardown: stops media tracks, closes the peer connection, leaves the
   *  signaling channel, clears timers, and resets to idle. Safe to call from
   *  any phase, any number of times. */
  const teardown = useCallback(() => {
    clearRingTimeout()
    clearDurationTimer()
    remoteDescriptionSetRef.current = false
    pendingIceCandidatesRef.current = []

    localStreamRef.current?.getTracks().forEach(track => track.stop())
    localStreamRef.current = null

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current)
      signalChannelRef.current = null
    }

    setState(INITIAL_STATE)
  }, [clearRingTimeout, clearDurationTimer])

  /** Marks the call row as ended with a given terminal status, best-effort —
   *  UI teardown happens locally regardless of whether this write succeeds. */
  const setCallStatus = useCallback(async (callId: string, status: 'accepted' | 'declined' | 'missed' | 'ended' | 'canceled') => {
    const patch: { status: string; started_at?: string; ended_at?: string } = { status }
    if (status === 'accepted') patch.started_at = new Date().toISOString()
    if (status === 'declined' || status === 'missed' || status === 'ended' || status === 'canceled') {
      patch.ended_at = new Date().toISOString()
    }
    const { error } = await supabase.from('calls').update(patch).eq('id', callId)
    if (error) console.error('Failed to update call status:', error.message)
  }, [])

  /** Sends the local RTCPeerConnection's queued ICE candidates once the
   *  signaling channel is confirmed open, and forwards new ones as they arrive. */
  const wireIceForwarding = useCallback((pc: RTCPeerConnection, channel: ReturnType<typeof supabase.channel>) => {
    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      const signal: CallSignal = { kind: 'ice-candidate', candidate: event.candidate.toJSON() }
      channel.send({ type: 'broadcast', event: 'signal', payload: signal })
    }
  }, [])

  const applyRemoteIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceCandidatesRef.current
    pendingIceCandidatesRef.current = []
    for (const candidate of queued) {
      try { await pc.addIceCandidate(candidate) } catch (err) { console.error('Failed to add buffered ICE candidate:', err) }
    }
  }, [])

  /** Handles every signal received on the per-call broadcast channel, for
   *  whichever side of the call this client is on. */
  const handleSignal = useCallback(async (signal: CallSignal) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (signal.kind === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      remoteDescriptionSetRef.current = true
      await applyRemoteIceCandidates(pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      signalChannelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { kind: 'answer', sdp: answer } satisfies CallSignal })
      setState(s => ({ ...s, phase: 'connecting' }))
    } else if (signal.kind === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      remoteDescriptionSetRef.current = true
      await applyRemoteIceCandidates(pc)
    } else if (signal.kind === 'ice-candidate') {
      if (remoteDescriptionSetRef.current) {
        try { await pc.addIceCandidate(signal.candidate) } catch (err) { console.error('Failed to add ICE candidate:', err) }
      } else {
        pendingIceCandidatesRef.current.push(signal.candidate)
      }
    } else if (signal.kind === 'hangup') {
      teardown()
    }
  }, [applyRemoteIceCandidates, teardown])

  /** Builds the RTCPeerConnection + local media for either side of a call,
   *  wires ontrack/onicecandidate, and returns it. Caller attaches an offer
   *  flow; callee attaches an answer flow — both share this setup step. */
  const createPeerConnection = useCallback(async (type: CallType, channel: ReturnType<typeof supabase.channel>) => {
    const constraints: MediaStreamConstraints = { audio: true, video: type === 'video' }
    const localStream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = localStream

    const pc = new RTCPeerConnection(getRtcConfig())
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream))

    const remoteStream = new MediaStream()
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => remoteStream.addTrack(track))
      setState(s => ({ ...s, remoteStream }))
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setState(s => (s.phase === 'connected' ? s : { ...s, phase: 'connected' }))
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (stateRef.current.phase !== 'idle' && stateRef.current.phase !== 'ended') {
          setCallError('Call connection lost.')
          teardown()
        }
      }
    }

    wireIceForwarding(pc, channel)
    peerConnectionRef.current = pc
    return { pc, localStream }
  }, [wireIceForwarding, teardown])

  // ── Outgoing call ──────────────────────────────────────────────────
  const startCall = useCallback(async (roomId: string, callee: CallParticipant, type: CallType) => {
    if (!myId || stateRef.current.phase !== 'idle') return

    const { data: inserted, error } = await supabase
      .from('calls')
      .insert({ room_id: roomId, caller_id: myId, callee_id: callee.id, type })
      .select('id, room_id, caller_id, callee_id, type, status, started_at, ended_at, created_at')
      .single()

    if (error || !inserted) {
      setCallError('Could not start the call.')
      return
    }
    const call = inserted as CallRow

    setState({ ...INITIAL_STATE, phase: 'dialing', call, otherParticipant: callee, isCaller: true })

    // Missed-call timeout — if the callee hasn't answered by RING_TIMEOUT_MS,
    // the caller (who is guaranteed to still be around to do it) marks it missed
    // and notifies them, matching phone/WhatsApp "missed call" behavior. The
    // in-chat "Missed call" message itself is written by a DB trigger
    // (migration 0010) the instant the status update below lands, so it's
    // guaranteed exactly-once regardless of which side's client is open.
    ringTimeoutRef.current = setTimeout(() => {
      if (stateRef.current.call?.id === call.id && stateRef.current.phase === 'dialing') {
        setCallStatus(call.id, 'missed')
        notifyMissedCall(myId, callee.id).catch(console.error)
        teardown()
      }
    }, RING_TIMEOUT_MS)

    // Join the signaling channel now and wait for the callee to join before
    // sending the offer — Realtime Broadcast has no delivery guarantee to a
    // channel nobody has subscribed to yet, so sending blind would drop it.
    const channel = supabase.channel(`call-signal:${call.id}`, { config: { presence: { key: myId } } })
    signalChannelRef.current = channel
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => { handleSignal(payload as CallSignal) })
      .on('presence', { event: 'sync' }, () => {
        const peers = Object.keys(channel.presenceState()).filter(id => id !== myId)
        if (peers.length === 0) return
        ;(async () => {
          // Guard against re-sending the offer if presence sync fires again
          // (e.g. the callee's connection briefly drops and re-syncs).
          const pc = peerConnectionRef.current
          if (!pc || pc.signalingState !== 'stable' || pc.localDescription) return
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel.send({ type: 'broadcast', event: 'signal', payload: { kind: 'offer', sdp: offer } satisfies CallSignal })
        })()
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ ready: true })
      })

    try {
      await createPeerConnection(type, channel)
    } catch (err) {
      setCallError(getMediaErrorMessage(err, 'call'))
      await setCallStatus(call.id, 'canceled')
      teardown()
    }
  }, [myId, createPeerConnection, handleSignal, setCallStatus, teardown])

  // ── Incoming call: accept ────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { call } = stateRef.current
    if (!call || !myId) return
    clearRingTimeout()

    const channel = supabase.channel(`call-signal:${call.id}`, { config: { presence: { key: myId } } })
    signalChannelRef.current = channel
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => { handleSignal(payload as CallSignal) })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ ready: true })
      })

    try {
      await createPeerConnection(call.type, channel)
      setState(s => ({ ...s, phase: 'connecting' }))
      await setCallStatus(call.id, 'accepted')
    } catch (err) {
      setCallError(getMediaErrorMessage(err, 'call'))
      await setCallStatus(call.id, 'declined')
      teardown()
    }
  }, [myId, createPeerConnection, handleSignal, setCallStatus, clearRingTimeout, teardown])

  // ── Incoming call: decline ───────────────────────────────────────────
  const declineCall = useCallback(async () => {
    const { call } = stateRef.current
    clearRingTimeout()
    if (call) await setCallStatus(call.id, 'declined')
    teardown()
  }, [clearRingTimeout, setCallStatus, teardown])

  // ── Hang up (any phase) ───────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const { call, phase } = stateRef.current
    if (!call) { teardown(); return }
    signalChannelRef.current?.send({ type: 'broadcast', event: 'signal', payload: { kind: 'hangup' } satisfies CallSignal })
    if (phase === 'dialing') await setCallStatus(call.id, 'canceled')
    else if (phase === 'ringing') await setCallStatus(call.id, 'declined')
    else await setCallStatus(call.id, 'ended')
    teardown()
  }, [setCallStatus, teardown])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const nextMuted = !stateRef.current.isMuted
    stream.getAudioTracks().forEach(track => { track.enabled = !nextMuted })
    setState(s => ({ ...s, isMuted: nextMuted }))
  }, [])

  // Purely a UI-visibility toggle — the WebRTC connection, media streams, and
  // signaling channel are untouched, since they already live in this provider
  // (mounted once in AppLayout, above the page router) rather than in
  // whatever page happened to start the call.
  const minimizeCall = useCallback(() => { setState(s => ({ ...s, isMinimized: true })) }, [])
  const restoreCall = useCallback(() => { setState(s => ({ ...s, isMinimized: false })) }, [])

  // Call-duration ticker — starts the moment WebRTC reports 'connected'.
  useEffect(() => {
    if (state.phase === 'connected' && !durationIntervalRef.current) {
      const startedAt = Date.now()
      durationIntervalRef.current = setInterval(() => {
        setState(s => ({ ...s, durationSeconds: Math.floor((Date.now() - startedAt) / 1000) }))
      }, 1000)
    }
    if (state.phase !== 'connected') clearDurationTimer()
  }, [state.phase, clearDurationTimer])

  // ── App-wide listener: incoming calls, and status changes on MY current call ──
  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel(`calls-listener:${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${myId}` }, async (payload) => {
        const row = payload.new as CallRow
        if (stateRef.current.phase !== 'idle') {
          // Busy on another call — auto-decline as "missed" rather than leaving it ringing forever.
          await setCallStatus(row.id, 'missed')
          return
        }
        const caller = await fetchParticipant(row.caller_id)
        setState({ ...INITIAL_STATE, phase: 'ringing', call: row, otherParticipant: caller, isCaller: false })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `callee_id=eq.${myId}` }, (payload) => {
        const row = payload.new as CallRow
        if (stateRef.current.call?.id !== row.id) return
        if (row.status === 'accepted') return // driven locally by acceptCall(), not by the echo
        if (['declined', 'canceled', 'ended', 'missed'].includes(row.status) && stateRef.current.phase !== 'idle') {
          teardown() // the caller hung up before/while we were still ringing or connected
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `caller_id=eq.${myId}` }, (payload) => {
        const row = payload.new as CallRow
        if (stateRef.current.call?.id !== row.id) return
        if (row.status === 'accepted' && stateRef.current.phase === 'dialing') {
          clearRingTimeout()
          setState(s => ({ ...s, phase: 'connecting' }))
        } else if (['declined', 'ended'].includes(row.status) && stateRef.current.phase !== 'idle') {
          teardown() // the callee declined, or hung up before we saw a 'hangup' broadcast
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [myId, setCallStatus, teardown, clearRingTimeout])

  // Full cleanup if the provider itself unmounts mid-call (e.g. sign-out).
  useEffect(() => () => teardown(), [teardown])

  const value: CallContextValue = {
    ...state,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    minimizeCall,
    restoreCall,
  }

  const isCallScreenActive = state.phase === 'dialing' || state.phase === 'connecting' || state.phase === 'connected'

  return (
    <CallContext.Provider value={value}>
      {children}
      {state.phase === 'ringing' && <IncomingCallRinger />}
      {isCallScreenActive && (state.isMinimized ? <MinimizedCallBar /> : <CallScreen />)}
      {callError && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:10000,
          maxWidth:'min(92vw, 420px)', padding:'12px 16px', borderRadius:12,
          background:'rgba(30,10,10,0.95)', border:'1px solid rgba(255,79,79,0.3)',
          color:'#ff6b6b', fontSize:13, fontWeight:600, textAlign:'center',
          boxShadow:'var(--elev-popover)', backdropFilter:'blur(10px)',
        }}>
          {callError}
        </div>
      )}
    </CallContext.Provider>
  )
}
