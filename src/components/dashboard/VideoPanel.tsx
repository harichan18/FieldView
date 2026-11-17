"use client";

import React, { useRef, useState, useEffect } from "react";
import type { ConnectionStatus, GpsTelemetry } from "@/types/telemetry";
import { formatCoordinates, formatSpeed, formatHeading } from "@/lib/formatters";
import { usePairingLink } from "@/lib/pairing";
import { QRCodeSVG } from "qrcode.react";
import {
  Camera,
  Maximize,
  Minimize,
  Copy,
  Check,
  Compass,
  Gauge,
  Crosshair,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface VideoPanelProps {
  remoteStream: MediaStream | null;
  status: ConnectionStatus;
  sessionCode: string;
  telemetry: GpsTelemetry | null;
  onOpenPairing: () => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  remoteStream,
  status,
  sessionCode,
  telemetry,
  onOpenPairing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentUtcTime, setCurrentUtcTime] = useState("");
  const [showHud, setShowHud] = useState(true);

  // Derive dynamic pairing link on client with zero hardcoded domain
  const { link, isLocalOrInsecure, isReady, detectedLanIp } = usePairingLink(sessionCode);

  // Bind remote stream to HTMLVideoElement
  useEffect(() => {
    if (videoRef.current) {
      if (remoteStream) {
        videoRef.current.srcObject = remoteStream;
        videoRef.current
          .play()
          .catch((err) => console.warn("Video play error:", err));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // Real-time ticking UTC clock for tactical overlay
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentUtcTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Snapshot PNG export with tactical watermark
  const handleSnapshot = () => {
    if (!videoRef.current || !remoteStream) return;
    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Render tactical watermark on snapshot
    const pad = 24;
    ctx.fillStyle = "rgba(9, 10, 15, 0.75)";
    ctx.fillRect(pad, canvas.height - pad - 60, 480, 52);
    ctx.strokeStyle = "rgba(20, 184, 166, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, canvas.height - pad - 60, 480, 52);

    ctx.fillStyle = "#14b8a6";
    ctx.font = "bold 16px monospace";
    ctx.fillText("FIELDVIEW RECON CAPTURE", pad + 16, canvas.height - pad - 34);

    ctx.fillStyle = "#e4e4e7";
    ctx.font = "13px monospace";
    const coordText = telemetry
      ? formatCoordinates(telemetry.lat, telemetry.lng).combined
      : "NO GPS FIX";
    ctx.fillText(`${currentUtcTime} | ${coordText}`, pad + 16, canvas.height - pad - 16);

    // Download PNG
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `fieldview-snapshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setSnapshotFeedback(true);
    setTimeout(() => setSnapshotFeedback(false), 1500);
  };

  const handleCopyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isLive = status === "live" && remoteStream;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[#000000] border border-[#1c2333] rounded-md overflow-hidden flex items-center justify-center select-none shadow-2xl group"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-contain ${isLive ? "block" : "hidden"}`}
      />

      {/* Snapshot Flash Overlay */}
      {snapshotFeedback && (
        <div className="absolute inset-0 bg-white/30 z-30 pointer-events-none transition-opacity duration-300" />
      )}

      {/* LIVE OVERLAYS (Shown when stream is active) */}
      {isLive && (
        <>
          {/* Top-Left: Live Indicator & Timestamp */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded bg-[#090a0f]/80 backdrop-blur-xs border border-zinc-800 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-red-400 font-semibold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300 text-[11px] tabular-nums">
              {currentUtcTime}
            </span>
          </div>

          {/* Top-Right: Action Tools (Snapshot, HUD Toggle, Fullscreen) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              onClick={() => setShowHud(!showHud)}
              title="Toggle HUD Telemetry"
              className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                showHud
                  ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                  : "bg-[#090a0f]/80 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              HUD
            </button>

            <button
              onClick={handleSnapshot}
              title="Capture Snapshot PNG"
              className="p-1.5 rounded bg-[#090a0f]/80 backdrop-blur-xs border border-zinc-800 hover:border-teal-500/50 text-zinc-300 hover:text-teal-300 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="p-1.5 rounded bg-[#090a0f]/80 backdrop-blur-xs border border-zinc-800 hover:border-teal-500/50 text-zinc-300 hover:text-teal-300 transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Bottom-Left: Live Tactical HUD Overlay */}
          {showHud && telemetry && (
            <div className="absolute bottom-3 left-3 z-20 px-3 py-2 rounded bg-[#090a0f]/85 backdrop-blur-xs border border-zinc-800/80 text-zinc-200 font-mono text-[11px] flex flex-col gap-1 pointer-events-none">
              <div className="flex items-center gap-2 text-teal-400 font-semibold text-[10px] tracking-wider uppercase">
                <Crosshair className="w-3.5 h-3.5" />
                <span>DEVICE TELEMETRY</span>
              </div>
              <div className="text-zinc-100 tabular-nums font-medium">
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
                <span>±{telemetry.accuracy.toFixed(1)}m</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* EMPTY / PAIRING STATE (Shown when waiting or disconnected) */}
      {!isLive && (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-md w-full">
          {/* Warning banner when opened on localhost / 127.0.0.1 / plain http */}
          {isLocalOrInsecure && (
            <div className="w-full max-w-sm mb-4 px-3 py-2 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300 text-xs text-left flex items-start gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="leading-snug block">
                  Camera and GPS need HTTPS. Open this dashboard from your Vercel URL or an HTTPS tunnel (ngrok / cloudflared) so the phone can stream.
                </span>
                {detectedLanIp && (
                  <span className="text-[10px] text-zinc-400 block font-mono">
                    Auto-routed to LAN IP: {detectedLanIp} for local Wi-Fi.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* QR Code Container */}
          <div className="relative mb-5 p-3 rounded-lg bg-[#0e1117] border border-zinc-800 shadow-xl">
            {isReady && link ? (
              <QRCodeSVG
                value={link}
                size={140}
                level="M"
                includeMargin={false}
                fgColor="#14b8a6"
                bgColor="transparent"
              />
            ) : (
              <div className="w-[140px] h-[140px] flex flex-col items-center justify-center text-zinc-500 gap-1.5">
                <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                <span className="text-[10px] font-mono">RESOLVING...</span>
              </div>
            )}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-300 uppercase tracking-wider">
              SCAN TO PAIR
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-200 uppercase">
              Field Camera Feed Offline
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Scan the QR code with your mobile camera or open the streaming link
              to initiate the live WebRTC stream.
            </p>
          </div>

          {/* Displayed Link and Copy Button using the exact same 'link' variable */}
          <div className="w-full flex items-center justify-center gap-2 max-w-sm mb-3">
            <div className="flex-1 px-3 py-1.5 bg-[#0e1117] border border-zinc-800 rounded font-mono text-xs text-teal-400 tracking-wider truncate text-left">
              {link || (sessionCode ? `fieldview-${sessionCode}` : "GENERATING...")}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!link}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-medium transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={onOpenPairing}
              title="Expand QR Code"
              className="px-3 py-1.5 rounded bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 text-xs font-medium transition-colors"
            >
              Expand
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono">
            <span>STUN: ACTIVE</span>
            <span>•</span>
            <span>AWAITING STREAM</span>
          </div>
        </div>
      )}
    </div>
  );
};
