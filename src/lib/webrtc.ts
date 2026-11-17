import type { PeerOptions } from "peerjs";

const PEER_ID_PREFIX = "fieldview-";

/**
 * Generate a short, unambiguous 6-character session code.
 * Excludes easily confused characters: 0/O, 1/I.
 */
export function generateSessionCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatPeerId(code: string): string {
  return `${PEER_ID_PREFIX}${code.trim().toUpperCase()}`;
}

export function extractCodeFromPeerId(peerId: string): string {
  if (peerId.startsWith(PEER_ID_PREFIX)) {
    return peerId.slice(PEER_ID_PREFIX.length);
  }
  return peerId;
}

/**
 * Get ICE Servers configuration:
 * Includes resilient public STUN servers and optional TURN credentials from environment variables.
 */
export function getIceServers(): RTCIceServer[] {
  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USER;
  const turnPass = process.env.NEXT_PUBLIC_TURN_PASS;

  if (turnUrl) {
    if (turnUser && turnPass) {
      iceServers.push({
        urls: turnUrl,
        username: turnUser,
        credential: turnPass,
      });
    } else {
      iceServers.push({ urls: turnUrl });
    }
  }

  return iceServers;
}

export function getPeerConfig(): PeerOptions {
  return {
    debug: 1, // Warnings and errors only
    config: {
      iceServers: getIceServers(),
      sdpSemantics: "unified-plan",
    },
  };
}
