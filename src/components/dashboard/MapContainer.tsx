"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { GpsTelemetry, MapMarker, MapLayer } from "@/types/telemetry";
import { Loader2 } from "lucide-react";

interface MapContainerProps {
  telemetry: GpsTelemetry | null;
  pathHistory: [number, number][];
  markers: MapMarker[];
  activeLayer: MapLayer;
  followDevice: boolean;
  isDropMode: boolean;
  onAddMarker: (marker: Omit<MapMarker, "id" | "createdAt">) => void;
  onDeleteMarker: (id: string) => void;
  flyToTarget: { lat: number; lng: number } | null;
  onFlyToComplete: () => void;
}

// Dynamically import Leaflet map with SSR disabled
const LeafletMap = dynamic(
  () => import("./LeafletMap").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] bg-[#0d1117] flex flex-col items-center justify-center text-zinc-500 gap-2 border border-zinc-800/60 rounded">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">
          INITIALIZING GEOSPATIAL ENGINE...
        </span>
      </div>
    ),
  }
);

export const MapContainer: React.FC<MapContainerProps> = (props) => {
  return <LeafletMap {...props} />;
};
