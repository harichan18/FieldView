"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePeerHost } from "@/hooks/usePeerHost";
import type { MapMarker, MapLayer } from "@/types/telemetry";
import { TopBar } from "@/components/dashboard/TopBar";
import { VideoPanel } from "@/components/dashboard/VideoPanel";
import { MapContainer } from "@/components/dashboard/MapContainer";
import { TelemetryCard } from "@/components/dashboard/TelemetryCard";
import { MarkersCard } from "@/components/dashboard/MarkersCard";
import { PairingModal } from "@/components/dashboard/PairingModal";
import {
  MapPin,
  Crosshair,
  Satellite,
  Map,
} from "lucide-react";

const STORAGE_KEY_MARKERS = "fieldview_saved_markers";

export default function DashboardPage() {
  const {
    code,
    status,
    remoteStream,
    telemetry,
    pathHistory,
    videoStats,
    regenerateCode,
  } = usePeerHost();

  const [markers, setMarkers] = useState<MapMarker[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MARKERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not load markers from localStorage:", e);
    }
    return [];
  });
  const [activeLayer, setActiveLayer] = useState<MapLayer>("street");
  const [followDevice, setFollowDevice] = useState<boolean>(true);
  const [isDropMode, setIsDropMode] = useState<boolean>(false);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Save markers to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MARKERS, JSON.stringify(markers));
    } catch (e) {
      console.warn("Could not save markers to localStorage:", e);
    }
  }, [markers]);

  const handleAddMarker = useCallback(
    (newMarker: Omit<MapMarker, "id" | "createdAt">) => {
      const marker: MapMarker = {
        ...newMarker,
        id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      setMarkers((prev) => [marker, ...prev]);
      setIsDropMode(false); // Turn off drop mode after dropping
    },
    []
  );

  const handleDeleteMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleFlyTo = useCallback((marker: MapMarker) => {
    setFollowDevice(false); // Disable auto-follow when manually inspecting a marker
    setFlyToTarget({ lat: marker.lat, lng: marker.lng });
  }, []);

  const handleImportMarkers = useCallback((imported: MapMarker[]) => {
    setMarkers((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const fresh = imported.filter((m) => !existingIds.has(m.id));
      return [...fresh, ...prev];
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm("Are you sure you want to remove all markers?")) {
      setMarkers([]);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0f] text-zinc-100">
      {/* Ops Header */}
      <TopBar
        sessionCode={code}
        status={status}
        videoStats={videoStats}
        onOpenPairing={() => setIsPairingOpen(true)}
      />

      {/* Main Workspace Layout: Responsive Grid (Desktop 65/35, Stacks on Tablet) */}
      <main className="flex-1 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
        {/* LEFT COLUMN (~65% on Desktop): Video & Stream Intelligence */}
        <section className="lg:col-span-8 flex flex-col gap-3">
          {/* Strict 16:9 Live Video Container */}
          <VideoPanel
            remoteStream={remoteStream}
            status={status}
            sessionCode={code}
            telemetry={telemetry}
            onOpenPairing={() => setIsPairingOpen(true)}
          />

          {/* Quick Telemetry Card below video for rapid eye scan */}
          <TelemetryCard telemetry={telemetry} />
        </section>

        {/* RIGHT COLUMN (~35% on Desktop): Tactical Map & Target Management */}
        <section className="lg:col-span-4 flex flex-col gap-3 min-h-[500px]">
          {/* Tactical Map Container */}
          <div className="bg-[#0e1117] border border-[#1c2333] rounded-md overflow-hidden flex flex-col flex-1 min-h-[360px] shadow-lg">
            {/* Map Action Toolbar */}
            <div className="h-10 bg-[#121622] border-b border-zinc-800 px-3 flex items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  TACTICAL MAP
                </span>
              </div>

              {/* Map Controls */}
              <div className="flex items-center gap-1">
                {/* Street / Satellite Toggle */}
                <button
                  onClick={() =>
                    setActiveLayer(activeLayer === "street" ? "satellite" : "street")
                  }
                  title={`Switch to ${activeLayer === "street" ? "Satellite" : "Street"} view`}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#181d2a] hover:bg-[#202738] border border-zinc-700/60 text-zinc-300 text-[10px] font-mono transition-colors"
                >
                  {activeLayer === "street" ? (
                    <>
                      <Satellite className="w-3 h-3 text-teal-400" />
                      <span>SAT</span>
                    </>
                  ) : (
                    <>
                      <Map className="w-3 h-3 text-teal-400" />
                      <span>MAP</span>
                    </>
                  )}
                </button>

                {/* Follow Device Toggle */}
                <button
                  onClick={() => setFollowDevice(!followDevice)}
                  title="Toggle Follow Device"
                  className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
                    followDevice
                      ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                      : "bg-[#181d2a] border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>FOLLOW</span>
                </button>

                {/* Drop Marker Mode Button */}
                <button
                  onClick={() => setIsDropMode(!isDropMode)}
                  title="Toggle Drop Marker Mode (click map to pin)"
                  className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
                    isDropMode
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse"
                      : "bg-[#181d2a] border-zinc-700/60 text-zinc-300 hover:text-teal-300"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{isDropMode ? "CLICK MAP" : "DROP PIN"}</span>
                </button>
              </div>
            </div>

            {/* Map Viewport */}
            <div className="flex-1 w-full relative min-h-[300px]">
              <MapContainer
                telemetry={telemetry}
                pathHistory={pathHistory}
                markers={markers}
                activeLayer={activeLayer}
                followDevice={followDevice}
                isDropMode={isDropMode}
                onAddMarker={handleAddMarker}
                onDeleteMarker={handleDeleteMarker}
                flyToTarget={flyToTarget}
                onFlyToComplete={() => setFlyToTarget(null)}
              />
            </div>
          </div>

          {/* Markers List & GeoJSON Card */}
          <MarkersCard
            markers={markers}
            telemetry={telemetry}
            onFlyTo={handleFlyTo}
            onDeleteMarker={handleDeleteMarker}
            onImportMarkers={handleImportMarkers}
            onClearAll={handleClearAll}
          />
        </section>
      </main>

      {/* Pairing Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        sessionCode={code}
        onRegenerateCode={regenerateCode}
      />
    </div>
  );
}
