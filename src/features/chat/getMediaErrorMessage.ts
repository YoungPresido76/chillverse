// src/features/chat/getMediaErrorMessage.ts

/**
 * navigator.mediaDevices.getUserMedia() rejects with a DOMException whose
 * `.name` tells you exactly why — but every call site in this codebase was
 * catching it and showing one generic "microphone access is required"
 * message regardless of cause, which makes a Permissions-Policy block (fixed
 * at the browser level, before any prompt ever appears), a user's prior
 * "Block" tap (persists across reloads independent of any header), and a
 * genuinely missing microphone all look identical to test against.
 */
export function getMediaErrorMessage(err: unknown, kind: 'voice note' | 'call'): string {
  const action = kind === 'call' ? 'make or answer a call' : 'record a voice note'

  if (!(err instanceof DOMException)) {
    return `Something went wrong trying to access your microphone. Please try again.`
  }

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      // Covers BOTH a Permissions-Policy header block and a previously-denied
      // site permission — the browser gives the same error name for both, so
      // the message below covers the fix for each.
      return `Microphone access is blocked for this site. Tap the lock/info icon next to the address bar → Permissions → Microphone → Allow, then reload the page and try again.`
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return `No microphone was found on this device.`
    case 'NotReadableError':
    case 'TrackStartError':
      return `Your microphone is already in use by another app. Close it and try again.`
    case 'SecurityError':
      return `Microphone access isn't allowed on this page (it must be loaded over HTTPS).`
    case 'AbortError':
      return `Microphone access was interrupted. Please try again.`
    default:
      return `Couldn't access your microphone to ${action}. Please check your browser and device permissions and try again.`
  }
}
