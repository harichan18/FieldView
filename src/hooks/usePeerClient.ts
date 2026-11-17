"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type Peer from "peerjs";
import type { MediaConnection, DataConnection } from "peerjs";
import type {
  ConnectionStatus,
  DataChannelMessage,
  GpsTelemetry,
} from "@/types/telemetry";
import { formatPeerId, getPeerConfig } from "@/lib/webrtc";

interface UsePeerClientOptions {
  sessionCode: string;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ExtendedMediaTrackConstraints {
  advanced?: Array<{ torch?: boolean }>;
}

export function usePeerClient({ sessionCode }: UsePeerClientOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("waiting");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<MediaConnection | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const retryCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const establishRef = useRef<((stream: MediaStream) => Promise<void>) | null>(null);

  // Acquire camera stream with production constraints
  const acquireCamera = useCallback(
    async (mode: "environment" | "user" = facingMode): Promise<MediaStream | null> => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported or insecure context (HTTPS required).");
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16 / 9 },
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && "getCapabilities" in videoTrack) {
          const capabilities = (
            videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities
          );
          setTorchAvailable(!!capabilities?.torch);
        }

        setLocalStream(stream);
        setError(null);
        return stream;
      } catch (err: unknown) {
        console.error("Camera acquisition failed:", err);
        let msg = "Could not access camera.";
        const errorObj = err as Error;
        if (errorObj.name === "NotAllowedError" || errorObj.name === "PermissionDeniedError") {
          msg = "Camera permission was denied. Please allow camera access in browser settings.";
        } else if (errorObj.name === "NotFoundError" || errorObj.name === "DevicesNotFoundError") {
          msg = "No compatible camera found on this device.";
        } else if (errorObj.name === "NotReadableError") {
          msg = "Camera is already in use by another application.";
        } else if (!window.isSecureContext) {
          msg = "WebRTC Camera requires a secure HTTPS connection.";
        }
        setError(msg);
        return null;
      }
    },
    [facingMode]
  );

  // Switch camera front/back smoothly
  const toggleCamera = useCallback(async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);

    if (!localStream) {
      await acquireCamera(nextMode);
      return;
    }

    try {
      localStream.getTracks().forEach((track) => track.stop());

      const newStream = await acquireCamera(nextMode);
      if (!newStream) return;

      const newVideoTrack = newStream.getVideoTracks()[0];

      if (activeCallRef.current?.peerConnection && newVideoTrack) {
        const pc: RTCPeerConnection = activeCallRef.current.peerConnection;
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      if (dataConnRef.current && dataConnRef.current.open) {
        dataConnRef.current.send({
          type: "camera_meta",
          facingMode: nextMode,
        });
      }
    } catch (e) {
      console.error("Failed to switch camera:", e);
    }
  }, [facingMode, localStream, acquireCamera]);

  // Toggle flashlight / torch
  const toggleTorch = useCallback(async () => {
    if (!localStream || !torchAvailable) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      const trackWithApply = track as MediaStreamTrack & {
        applyConstraints: (constraints: ExtendedMediaTrackConstraints) => Promise<void>;
      };
      await trackWithApply.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Failed to toggle torch:", err);
    }
  }, [localStream, torchAvailable, torchOn]);

  // Handle connection drop
  const handleConnectionDrop = useCallback(() => {
    if (isStoppingRef.current) return;

    setStatus("reconnecting");
    const nextRetry = retryCountRef.current + 1;
    retryCountRef.current = nextRetry;

    // Exponential backoff: 1.5s, 3s, 6s, 10s max
    const delay = Math.min(1500 * Math.pow(1.5, nextRetry - 1), 10000);
    console.log(
      `[Client] Connection dropped. Reconnecting in ${delay}ms (attempt #${nextRetry})...`
    );

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (isStoppingRef.current || !localStream) return;
      try {
        await establishRef.current?.(localStream);
      } catch (e) {
        console.error("[Client] Reconnect attempt failed:", e);
      }
    }, delay);
  }, [localStream]);

  // Establish WebRTC Peer call & data connection
  const establishConnection = useCallback(
    async (stream: MediaStream) => {
      if (!sessionCode.trim()) {
        setError("Invalid session code.");
        return;
      }

      const targetHostPeerId = formatPeerId(sessionCode);
      const myClientId = `fieldview-cam-${Date.now().toString(36)}`;

      setStatus("connecting");
      isStoppingRef.current = false;

      const { Peer } = await import("peerjs");

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      const peer = new Peer(myClientId, getPeerConfig());
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("[Client] Registered as:", id, "Calling:", targetHostPeerId);

        const dataConn = peer.connect(targetHostPeerId, { reliable: true });
        dataConnRef.current = dataConn;

        dataConn.on("open", () => {
          console.log("[Client] Data connection open with host");
          retryCountRef.current = 0;
        });

        dataConn.on("data", (data: unknown) => {
          const msg = data as DataChannelMessage;
          if (msg.type === "ping") {
            dataConn.send({ type: "pong", timestamp: msg.timestamp });
          }
        });

        dataConn.on("close", () => {
          console.log("[Client] Data connection closed");
          handleConnectionDrop();
        });

        dataConn.on("error", (err) => {
          console.warn("[Client] Data connection error:", err);
        });

        const call = peer.call(targetHostPeerId, stream);
        activeCallRef.current = call;

        call.on("close", () => {
          console.log("[Client] Video call closed");
          handleConnectionDrop();
        });

        call.on("error", (err) => {
          console.error("[Client] Call error:", err);
          handleConnectionDrop();
        });

        if (call.peerConnection) {
          const pc: RTCPeerConnection = call.peerConnection;
          pc.onconnectionstatechange = () => {
            console.log("[Client] PC State:", pc.connectionState);
            if (pc.connectionState === "connected") {
              setStatus("live");
              retryCountRef.current = 0;
            } else if (
              pc.connectionState === "disconnected" ||
              pc.connectionState === "failed"
            ) {
              handleConnectionDrop();
            }
          };
        } else {
          setTimeout(() => {
            if (!isStoppingRef.current) setStatus("live");
          }, 1200);
        }
      });

      peer.on("error", (err) => {
        console.error("[Client] Peer error:", err);
        if (err.type === "peer-unavailable") {
          setError(
            `Session "${sessionCode}" not found. Verify the dashboard is open and code is correct.`
          );
          setStatus("disconnected");
          setIsStreaming(false);
        } else {
          handleConnectionDrop();
        }
      });
    },
    [sessionCode, handleConnectionDrop]
  );

  useEffect(() => {
    establishRef.current = establishConnection;
  }, [establishConnection]);

  // Start Streaming action
  const startStreaming = useCallback(async () => {
    setError(null);
    let stream = localStream;
    if (!stream) {
      stream = await acquireCamera();
      if (!stream) return;
    }

    setIsStreaming(true);
    await establishConnection(stream);
  }, [localStream, acquireCamera, establishConnection]);

  // Stop Streaming action
  const stopStreaming = useCallback(() => {
    isStoppingRef.current = true;
    setIsStreaming(false);
    setStatus("disconnected");

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    if (dataConnRef.current && dataConnRef.current.open) {
      try {
        dataConnRef.current.send({ type: "client_disconnect" });
      } catch {}
    }

    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }

    if (dataConnRef.current) {
      dataConnRef.current.close();
      dataConnRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  // Send GPS telemetry over the active data connection
  const sendTelemetry = useCallback((telemetry: GpsTelemetry) => {
    if (dataConnRef.current && dataConnRef.current.open) {
      try {
        dataConnRef.current.send({
          type: "gps",
          payload: telemetry,
        });
      } catch (err) {
        console.warn("[Client] Error sending telemetry:", err);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (peerRef.current) peerRef.current.destroy();
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  return {
    status,
    localStream,
    isStreaming,
    facingMode,
    torchAvailable,
    torchOn,
    error,
    startStreaming,
    stopStreaming,
    toggleCamera,
    toggleTorch,
    sendTelemetry,
    acquireCamera,
  };
}
