"use client";

import React, { useState } from "react";
import type { ConnectionStatus, VideoStats } from "@/types/telemetry";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  QrCode,
  Copy,
  Check,
  Activity,
  Signal,
  Video,
} from "lucide-react";

interface TopBarProps {
  sessionCode: string;
  status: ConnectionStatus;
  videoStats: VideoStats;
  onOpenPairing: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  sessionCode,
  status,
  videoStats,
  onOpenPairing,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-[#0a0d13] border-b border-[#1c2333] px-4 flex items-center justify-between gap-4 select-none flex-wrap sm:flex-nowrap">
      {/* Brand & Ops Wordmark */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-widest text-zinc-100 uppercase">
                FieldView
              </span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                OPS
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
              TELEMETRY + LIVE FEED
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block h-6 w-px bg-zinc-800" />

        {/* Session Code Display */}
        {sessionCode && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#121620] border border-zinc-800 rounded">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              SESSION:
            </span>
            <span className="font-mono text-xs font-bold text-teal-400 tracking-widest">
              {sessionCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Copy session code"
              className="ml-1 p-0.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Center / Right: Connection Status & Stream Telemetry */}
      <div className="flex items-center gap-3">
        {/* Status Pill */}
        <StatusBadge status={status} />

        {/* Latency Readout */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#121620] border border-zinc-800 rounded font-mono text-[11px]">
          <Signal className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] uppercase text-zinc-400">RTT:</span>
          <span
            className={`font-semibold tabular-nums ${
              videoStats.latencyMs === null
                ? "text-zinc-500"
                : videoStats.latencyMs < 100
                ? "text-emerald-400"
                : videoStats.latencyMs < 250
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {videoStats.latencyMs !== null ? `${videoStats.latencyMs}ms` : "--"}
          </span>
        </div>

        {/* Resolution & FPS Readout */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[#121620] border border-zinc-800 rounded font-mono text-[11px]">
          <Video className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-400 text-[10px] uppercase">STREAM:</span>
          <span className="text-zinc-200 tabular-nums">
            {videoStats.resolution}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-teal-400 tabular-nums">
            {videoStats.fps > 0 ? `${videoStats.fps} FPS` : "--"}
          </span>
        </div>

        {/* Pairing Button */}
        <button
          onClick={onOpenPairing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/30 text-teal-300 text-xs font-medium transition-all"
        >
          <QrCode className="w-3.5 h-3.5 text-teal-400" />
          <span>Pair Phone</span>
        </button>
      </div>
    </header>
  );
};
