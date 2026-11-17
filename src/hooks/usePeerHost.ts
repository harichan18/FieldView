"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type Peer from "peerjs";
import type { MediaConnection, DataConnection } from "peerjs";
import type {
  ConnectionStatus,
  DataChannelMessage,
  GpsTelemetry,
  VideoStats,
} from "@/types/telemetry";
import {
  generateSessionCode,
  formatPeerId,
  getPeerConfig,
} from "@/lib/webrtc";

export function usePeerHost() {
  const [code, setCode] = useState<string>("");
  const [status, setStatus] = useState<ConnectionStatus>("waiting");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [telemetry, setTelemetry] = useState<GpsTelemetry | null>(null);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);
  const [videoStats, setVideoStats] = useState<VideoStats>({
    resolution: "--",
    fps: 0,
    latencyMs: null,
  });

  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<MediaConnection | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);
  const isInitializingRef = useRef(false);
  const initHostRef = useRef<((targetCode?: string) => void) | null>(null);

  // Initialize Host Peer
  const initializeHost = useCallback((targetCode?: string) => {
    if (typeof window === "undefined") return;

    // Cleanup previous session if any
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    const sessionCode = targetCode || generateSessionCode();
    const fullPeerId = formatPeerId(sessionCode);

    setCode(sessionCode);
    setStatus("waiting");
    setRemoteStream(null);
    setTelemetry(null);
    setPathHistory([]);

    import("peerjs").then(({ Peer }) => {
      const peer = new Peer(fullPeerId, getPeerConfig());
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("[Host] Peer opened with ID:", id);
        setStatus("waiting");
      });

      peer.on("connection", (conn: DataConnection) => {
        console.log("[Host] Incoming data channel from:", conn.peer);
        dataConnRef.current = conn;

        conn.on("open", () => {
          console.log("[Host] Data channel open");
          setStatus((prev) => (prev === "waiting" ? "connecting" : prev));

          // Send immediate ping
          lastPingTimeRef.current = Date.now();
          conn.send({ type: "ping", timestamp: lastPingTimeRef.current });
        });

        conn.on("data", (data: unknown) => {
          const msg = data as DataChannelMessage;
          if (msg.type === "gps") {
            const gps = msg.payload;
            setTelemetry(gps);
            setPathHistory((prev) => {
              if (prev.length === 0) return [[gps.lat, gps.lng]];
              const last = prev[prev.length - 1];
              if (
                Math.abs(last[0] - gps.lat) > 0.00001 ||
                Math.abs(last[1] - gps.lng) > 0.00001
              ) {
                const updated = [...prev, [gps.lat, gps.lng] as [number, number]];
                return updated.slice(-500);
              }
              return prev;
            });
          } else if (msg.type === "ping") {
            conn.send({ type: "pong", timestamp: msg.timestamp });
          } else if (msg.type === "pong") {
            const now = Date.now();
            const rtt = Math.max(1, now - msg.timestamp);
            setVideoStats((prev) => ({
              ...prev,
              latencyMs: rtt,
            }));
          } else if (msg.type === "client_disconnect") {
            console.log("[Host] Client signaled disconnect");
            setStatus("disconnected");
            setRemoteStream(null);
          }
        });

        conn.on("close", () => {
          console.log("[Host] Data connection closed");
          setStatus((prev) => (prev === "live" ? "reconnecting" : "waiting"));
        });

        conn.on("error", (err) => {
          console.warn("[Host] Data connection error:", err);
          setStatus("reconnecting");
        });
      });

      peer.on("call", (call: MediaConnection) => {
        console.log("[Host] Incoming video call from:", call.peer);
        activeCallRef.current = call;
        setStatus("connecting");

        // Answer incoming stream (no local outgoing video needed for dashboard)
        call.answer();

        call.on("stream", (stream: MediaStream) => {
          console.log("[Host] Remote media stream received:", stream.id);
          setRemoteStream(stream);
          setStatus("live");
        });

        call.on("close", () => {
          console.log("[Host] Call closed");
          setRemoteStream(null);
          setStatus((prev) => (prev === "live" ? "reconnecting" : "waiting"));
        });

        call.on("error", (err) => {
          console.error("[Host] Call error:", err);
          setStatus("reconnecting");
        });
      });

      peer.on("disconnected", () => {
        console.warn("[Host] Disconnected from signaling server. Attempting reconnect...");
        setStatus((prev) => (prev === "live" ? "reconnecting" : "waiting"));
        setTimeout(() => {
          if (!peer.destroyed && peer.disconnected) {
            peer.reconnect();
          }
        }, 1500);
      });

      peer.on("error", (err) => {
        console.error("[Host] Peer error:", err);
        if (err.type === "unavailable-id") {
          console.warn("[Host] ID collision, generating a fresh code...");
          initHostRef.current?.();
        } else {
          setStatus((prev) => (prev === "live" ? "reconnecting" : "disconnected"));
        }
      });
    });
  }, []);

  useEffect(() => {
    initHostRef.current = initializeHost;
  }, [initializeHost]);

  // Periodic ping for RTT latency measurement & stats polling
  useEffect(() => {
    if (status !== "live") return;

    const interval = setInterval(() => {
      // 1. Data Channel Ping
      if (dataConnRef.current && dataConnRef.current.open) {
        lastPingTimeRef.current = Date.now();
        try {
          dataConnRef.current.send({
            type: "ping",
            timestamp: lastPingTimeRef.current,
          });
        } catch (e) {
          console.warn("[Host] Failed to send ping:", e);
        }
      }

      // 2. WebRTC PeerConnection stats
      if (activeCallRef.current?.peerConnection) {
        const pc: RTCPeerConnection = activeCallRef.current.peerConnection;
        pc.getStats().then((statsReport) => {
          statsReport.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              const fps = report.framesPerSecond || 0;
              const frameWidth = report.frameWidth;
              const frameHeight = report.frameHeight;

              setVideoStats((prev) => ({
                ...prev,
                fps: Math.round(fps),
                resolution:
                  frameWidth && frameHeight
                    ? `${frameWidth}x${frameHeight}`
                    : prev.resolution,
              }));
            }
          });
        }).catch(() => {});
      }
    }, 2000);

    statsIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [status]);

  // Initial mount
  useEffect(() => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    initializeHost();

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (activeCallRef.current) activeCallRef.current.close();
      if (dataConnRef.current) dataConnRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [initializeHost]);

  const regenerateCode = useCallback(() => {
    initializeHost();
  }, [initializeHost]);

  return {
    code,
    peerId: formatPeerId(code),
    status,
    remoteStream,
    telemetry,
    pathHistory,
    videoStats,
    regenerateCode,
  };
}
