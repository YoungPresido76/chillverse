// src/features/chat/calling/webrtcConfig.ts

/**
 * ICE server list for RTCPeerConnection.
 *
 * STUN-only (the Google servers below) is enough for two peers on open/
 * moderately-restrictive NATs to connect directly. It is NOT enough for
 * peers behind symmetric NATs or strict corporate firewalls — those need a
 * TURN relay, which requires a paid or self-hosted service (e.g. Twilio
 * Network Traversal, Cloudflare Calls, or a self-hosted coturn instance).
 *
 * No TURN credentials are available in this environment, so none are
 * hard-coded here. To add one later, set these two Vite env vars and no
 * other code needs to change:
 *   VITE_TURN_URL       e.g. "turn:turn.example.com:3478"
 *   VITE_TURN_USERNAME
 *   VITE_TURN_CREDENTIAL
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const turnUrl = import.meta.env.VITE_TURN_URL
  const turnUsername = import.meta.env.VITE_TURN_USERNAME
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential })
  }

  return servers
}

/** Builds a fresh RTCConfiguration — call this each time a new
 *  RTCPeerConnection is created rather than caching the result. */
export function getRtcConfig(): RTCConfiguration {
  return { iceServers: getIceServers() }
}
