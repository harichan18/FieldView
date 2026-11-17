"use client";

import React, { useSyncExternalStore } from "react";
import type { GpsTelemetry } from "@/types/telemetry";
import {
  formatCoordinates,
  formatSpeed,
  formatHeading,
  formatAccuracy,
  formatRelativeAge,
} from "@/lib/formatters";
import {
  Compass,
  Gauge,
  Crosshair,
} from "lucide-react";

interface TelemetryCardProps {
  telemetry: GpsTelemetry | null;
}

// React 19 external store subscriber for real-time 1s ticking clock
function subscribeToClock(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getClockSnapshot() {
  return Date.now();
}

function getServerClockSnapshot() {
  return 0;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({ telemetry }) => {
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );

  if (!telemetry) {
    return (
      <div className="bg-[#0e1117] border border-[#1c2333] rounded-md p-4 select-none">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              DEVICE TELEMETRY
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">NO FIX</span>
        </div>
        <div className="py-6 text-center text-xs text-zinc-500 font-mono">
          AWAITING GPS TELEMETRY FROM FIELD DEVICE...
        </div>
      </div>
    );
  }

  const effectiveNow = now || telemetry.timestamp;
  const coords = formatCoordinates(telemetry.lat, telemetry.lng);
  const speed = formatSpeed(telemetry.speed);
  const heading = formatHeading(telemetry.heading);
  const accuracy = formatAccuracy(telemetry.accuracy);
  const age = formatRelativeAge(telemetry.timestamp, effectiveNow);

  const isStale = effectiveNow - telemetry.timestamp > 8000;

  return (
    <div className="bg-[#0e1117] border border-[#1c2333] rounded-md p-3.5 select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-teal-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
            DEVICE TELEMETRY
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Signal freshness indicator with CSS pulse key */}
          <span
            key={telemetry.timestamp}
            className={`w-2 h-2 rounded-full transition-all animate-ping duration-700 ${
              isStale ? "bg-amber-500" : "bg-teal-400"
            }`}
          />
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${
              isStale ? "text-amber-400" : "text-zinc-400"
            }`}
          >
            {isStale ? `STALE (${age})` : age}
          </span>
        </div>
      </div>

      {/* Grid of metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Latitude */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5">
            LATITUDE
          </div>
          <div className="font-mono text-xs font-medium text-zinc-100 tabular-nums">
            {coords.latStr}
          </div>
        </div>

        {/* Longitude */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5">
            LONGITUDE
          </div>
          <div className="font-mono text-xs font-medium text-zinc-100 tabular-nums">
            {coords.lngStr}
          </div>
        </div>

        {/* GPS Accuracy */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5 flex items-center justify-between">
            <span>ACCURACY</span>
            <span
              className={`text-[9px] uppercase font-mono px-1 rounded ${
                accuracy.tier === "high"
                  ? "text-emerald-400 bg-emerald-950/40"
                  : accuracy.tier === "good"
                  ? "text-teal-400 bg-teal-950/40"
                  : accuracy.tier === "moderate"
                  ? "text-amber-400 bg-amber-950/40"
                  : "text-red-400 bg-red-950/40"
              }`}
            >
              {accuracy.tier}
            </span>
          </div>
          <div className="font-mono text-xs font-medium text-zinc-200 tabular-nums">
            {accuracy.text}
          </div>
        </div>

        {/* Speed */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-zinc-400" />
            <span>GROUND SPEED</span>
          </div>
          <div className="font-mono text-xs font-medium text-zinc-100 tabular-nums">
            {speed.display}
          </div>
        </div>

        {/* Heading */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5 flex items-center gap-1">
            <Compass className="w-3 h-3 text-zinc-400" />
            <span>HEADING</span>
          </div>
          <div className="font-mono text-xs font-medium text-zinc-100 tabular-nums">
            {heading.display}
          </div>
        </div>

        {/* Altitude */}
        <div className="p-2 rounded bg-[#131722] border border-zinc-800/80">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider mb-0.5">
            ALTITUDE
          </div>
          <div className="font-mono text-xs font-medium text-zinc-200 tabular-nums">
            {telemetry.altitude !== null ? `${Math.round(telemetry.altitude)} m MSL` : "--"}
          </div>
        </div>
      </div>
    </div>
  );
};
