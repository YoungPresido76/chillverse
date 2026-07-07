// src/features/chat/calling/types.ts

/** Mirrors the `type` check constraint on public.calls. */
export type CallType = 'audio' | 'video'

/** Mirrors the `status` check constraint on public.calls. */
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended' | 'canceled'

/** A row from public.calls, as selected by the client. */
export interface CallRow {
  id: string
  room_id: string
  caller_id: string
  callee_id: string
  type: CallType
  status: CallStatus
  started_at: string | null
  ended_at: string | null
  created_at: string
}

/** Minimal profile info needed to render a caller/callee name + avatar in the
 *  ringing banner and call screen, without pulling in Chat.tsx's full types. */
export interface CallParticipant {
  id: string
  username: string
  display_name: string | null
  avatar: string
}

/** The calling feature's local state machine. Distinct from CallStatus (the DB
 *  column) because a few of these ('connecting') never touch the database —
 *  they only describe what THIS client's RTCPeerConnection is doing right now. */
export type CallPhase =
  | 'idle'
  | 'dialing'      // I called someone, waiting for them to accept
  | 'ringing'      // someone is calling me, waiting for me to answer
  | 'connecting'   // accepted, WebRTC handshake in progress
  | 'connected'    // media flowing
  | 'ended'        // brief terminal state shown before returning to 'idle'

/** Messages exchanged over the per-call Realtime Broadcast channel
 *  (`call-signal:<callId>`). Never persisted — signaling is ephemeral. */
export type CallSignal =
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { kind: 'hangup' }

export interface ActiveCallState {
  phase: CallPhase
  call: CallRow | null
  otherParticipant: CallParticipant | null
  /** true if `call.caller_id === myId` — determines who creates the SDP offer. */
  isCaller: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isMuted: boolean
  /** Call duration in seconds, ticking while phase === 'connected'. */
  durationSeconds: number
  /** true once the person has minimized the full-screen call UI to a small
   *  persistent bar so they can navigate the rest of the app while the call
   *  (and its WebRTC connection) keeps running underneath. */
  isMinimized: boolean
}
