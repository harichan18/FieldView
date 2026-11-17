"use client";

import React, { Suspense, useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { usePeerClient } from "@/hooks/usePeerClient";
import { useGeolocationStream } from "@/hooks/useGeolocationStream";
import { useWakeLock } from "@/hooks/useWakeLock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OrientationAlert } from "@/components/camera/OrientationAlert";
import { formatCoordinates, formatSpeed, formatHeading } from "@/lib/formatters";
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Square,
  Play,
  Crosshair,
  Compass,
  Gauge,
  AlertTriangle,
  Lock,
} from "lucide-react";

const emptySubscribe = () => () => {};

function CameraStreamingContent() {
  const searchParams = useSearchParams();
  // Support both 's' and 'code' query parameters, trimmed and uppercase
  const rawCode = searchParams.get("s") || searchParams.get("code") || "";
  const initialCode = rawCode.trim().toUpperCase();

  const [sessionInput, setSessionInput] = useState(initialCode);
  const [manualSession, setManualSession] = useState<string | null>(null);

  // Active session is either manually entered or read directly from URL query
  const activeSession = manualSession ?? initialCode;

  // Track isSecureContext without cascading effect renders
  const isSecure = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== "undefined" ? window.isSecureContext ?? true : true),
    () => true
  );

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Screen Wake Lock
  const { isActive: isWakeLockActive, requestWakeLock, releaseWakeLock } =
    useWakeLock();

  // Peer client hook
  const {
    status,
    localStream,
    isStreaming,
    facingMode,
    torchAvailable,
    torchOn,
    error: peerError,
    startStreaming,
    stopStreaming,
    toggleCamera,
    toggleTorch,
    sendTelemetry,
  } = usePeerClient({
    sessionCode: activeSession,
  });

  // Geolocation stream hook
  const {
    telemetry,
    error: geoError,
    startWatching: startGps,
    stopWatching: stopGps,
  } = useGeolocationStream({
    enableHighAccuracy: true,
    sampleIntervalMs: 1000,
    onPositionUpdate: (gps) => {
      sendTelemetry(gps);
    },
  });

  // Bind local stream to video preview element with iOS Safari compatibility
  useEffect(() => {
    if (videoPreviewRef.current) {
      const video = videoPreviewRef.current;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      if (localStream) {
        video.srcObject = localStream;
        video
          .play()
          .catch((e) => console.warn("Video preview play error:", e));
      } else {
        video.srcObject = null;
      }
    }
  }, [localStream]);

  // Handle Start Streaming action
  const handleStart = async () => {
    if (!activeSession.trim()) {
      alert("Please enter a valid session code from your dashboard.");
      return;
    }

    // 1. Request Screen Wake Lock so display never sleeps during streaming
    await requestWakeLock();

    // 2. Start high accuracy GPS tracking
    startGps();

    // 3. Start Camera and WebRTC Peer call
    await startStreaming();
  };

  // Handle Stop Streaming action
  const handleStop = () => {
    stopGps();
    releaseWakeLock();
    stopStreaming();
  };

  // Switch session code form submission
  const handleSetSession = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sessionInput.trim().toUpperCase();
    if (clean) {
      setManualSession(clean);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] bg-black overflow-hidden flex flex-col justify-between select-none">
      <OrientationAlert />

      {/* FULL-BLEED VIDEO PREVIEW (When streaming is active) */}
      {isStreaming && (
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Tactical Crosshair Reticle in center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="relative w-24 h-24 border border-teal-500/30 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <div className="absolute top-0 w-px h-3 bg-teal-400" />
              <div className="absolute bottom-0 w-px h-3 bg-teal-400" />
              <div className="absolute left-0 w-3 h-px bg-teal-400" />
              <div className="absolute right-0 w-3 h-px bg-teal-400" />
            </div>
          </div>
        </div>
      )}

      {/* TOP HUD BAR (During live streaming) */}
      {isStreaming && (
        <div className="relative z-20 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 to-transparent">
          {/* Status pill & session */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="font-mono text-xs text-zinc-300 font-semibold px-2 py-0.5 rounded bg-black/60 border border-zinc-800">
              {activeSession}
            </span>
          </div>

          {/* GPS Accuracy HUD pill */}
          <div className="flex items-center gap-2">
            {telemetry ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-teal-500/40 text-teal-300 font-mono text-xs">
                <Crosshair className="w-3.5 h-3.5 text-teal-400" />
                <span>±{telemetry.accuracy.toFixed(1)}m</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-amber-500/40 text-amber-300 font-mono text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>ACQUIRING GPS</span>
              </div>
            )}

            {isWakeLockActive && (
              <div
                title="Screen Wake Lock Active"
                className="p-1 rounded bg-black/60 border border-zinc-800 text-teal-400"
              >
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM HUD / CONTROLS (During live streaming) */}
      {isStreaming && (
        <div className="relative z-20 flex items-end justify-between p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          {/* Live Coordinates Readout */}
          <div className="font-mono text-xs text-zinc-200 bg-black/70 backdrop-blur-xs px-3 py-2 rounded border border-zinc-800/80 flex flex-col gap-0.5">
            {telemetry ? (
              <>
                <div className="text-zinc-100 font-medium">
                  {formatCoordinates(telemetry.lat, telemetry.lng).combined}
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-zinc-500" />
                    {formatSpeed(telemetry.speed).display}
                  </span>
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-zinc-500" />
                    {formatHeading(telemetry.heading).display}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-zinc-500 text-[11px]">AWAITING SATELLITE FIX...</span>
            )}
          </div>

          {/* Interactive Action Controls */}
          <div className="flex items-center gap-2">
            {/* Torch toggle (if supported by hardware) */}
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                title="Toggle Torch / Flashlight"
                className={`p-3 rounded-full border shadow-lg backdrop-blur-md transition-all ${
                  torchOn
                    ? "bg-amber-500 text-black border-amber-400"
                    : "bg-black/70 text-zinc-300 border-zinc-700"
                }`}
              >
                {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
              </button>
            )}

            {/* Flip camera button */}
            <button
              onClick={toggleCamera}
              title={`Switch camera (current: ${facingMode})`}
              className="p-3 rounded-full bg-black/70 hover:bg-black/90 text-zinc-200 border border-zinc-700 shadow-lg backdrop-blur-md transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Stop stream button */}
            <button
              onClick={handleStop}
              title="Stop Streaming"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white font-mono text-xs font-semibold uppercase tracking-wider shadow-lg shadow-red-950/50 transition-all border border-red-500"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP</span>
            </button>
          </div>
        </div>
      )}

      {/* PRE-STREAMING SETUP SCREEN (When not currently streaming) */}
      {!isStreaming && (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 z-10 bg-[#090a0f] overflow-y-auto">
          <div className="w-full max-w-md bg-[#0e1117] border border-zinc-800 rounded-lg p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center my-auto">
            {/* Tactical icon */}
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3">
              <Camera className="w-6 h-6" />
            </div>

            <h1 className="text-base sm:text-lg font-semibold tracking-wider uppercase text-zinc-100 mb-1">
              FieldView Mobile Streamer
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 max-w-sm">
              Live camera feed and real-time GPS telemetry directly to your command dashboard.
            </p>

            {/* Notice if opened on insecure HTTP */}
            {!isSecure && (
              <div className="w-full mb-4 p-3 bg-amber-950/30 border border-amber-600/50 rounded text-left flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-200 leading-normal">
                  <strong>Notice:</strong> Opened over plain HTTP. Mobile browsers strictly require HTTPS for camera and GPS access. For best results, open via your deployed Vercel HTTPS URL or an HTTPS tunnel.
                </div>
              </div>
            )}

            {/* Session Code Display / Input */}
            <form onSubmit={handleSetSession} className="w-full mb-4 space-y-2">
              <label className="block text-[10px] uppercase font-semibold text-zinc-400 tracking-wider text-left">
                TARGET DASHBOARD SESSION
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 7K2M9X"
                  maxLength={10}
                  className="flex-1 px-3 py-2 bg-[#141822] border border-zinc-700 rounded font-mono text-sm tracking-widest text-teal-400 uppercase focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition-colors"
                >
                  SET
                </button>
              </div>
            </form>

            {/* Error notifications */}
            {(peerError || geoError) && (
              <div className="w-full mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200 leading-tight">
                  {peerError || geoError}
                </div>
              </div>
            )}

            {/* One Large "Start streaming" button */}
            <button
              onClick={handleStart}
              disabled={!activeSession}
              className="w-full py-4 rounded-md bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-black font-semibold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START STREAMING</span>
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3 text-[10px] font-mono text-zinc-500 uppercase flex-wrap">
              <span>FACING: REAR</span>
              <span>•</span>
              <span>GPS: HIGH ACCURACY</span>
              <span>•</span>
              <span>WAKE LOCK: ON</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-[100dvh] bg-[#090a0f] flex items-center justify-center text-teal-400 font-mono text-xs">
          INITIALIZING MOBILE STREAMER...
        </div>
      }
    >
      <CameraStreamingContent />
    </Suspense>
  );
}
