"use client";

import React, { useRef } from "react";
import type { MapMarker, GpsTelemetry } from "@/types/telemetry";
import { calculateHaversineDistance, formatDistance } from "@/lib/haversine";
import { formatCoordinates } from "@/lib/formatters";
import {
  downloadGeoJSONFile,
  importMarkersFromGeoJSON,
} from "@/lib/geojson";
import {
  MapPin,
  Trash2,
  Download,
  Upload,
  Crosshair,
} from "lucide-react";

interface MarkersCardProps {
  markers: MapMarker[];
  telemetry: GpsTelemetry | null;
  onFlyTo: (marker: MapMarker) => void;
  onDeleteMarker: (id: string) => void;
  onImportMarkers: (imported: MapMarker[]) => void;
  onClearAll: () => void;
}

export const MarkersCard: React.FC<MarkersCardProps> = ({
  markers,
  telemetry,
  onFlyTo,
  onDeleteMarker,
  onImportMarkers,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadGeoJSONFile(markers);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importMarkersFromGeoJSON(text);
        if (imported.length > 0) {
          onImportMarkers(imported);
        }
      } catch (err) {
        alert("Failed to parse GeoJSON file. Check file format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset
  };

  const CATEGORY_COLORS: Record<string, string> = {
    checkpoint: "#14b8a6",
    target: "#f59e0b",
    danger: "#ef4444",
    observation: "#3b82f6",
    generic: "#a1a1aa",
  };

  return (
    <div className="bg-[#0e1117] border border-[#1c2333] rounded-md p-3.5 select-none flex flex-col flex-1">
      {/* Header & GeoJSON Tools */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal-400" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-200">
            FIELD MARKERS ({markers.length})
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            disabled={markers.length === 0}
            title="Export GeoJSON"
            className="flex items-center gap-1 px-2 py-1 bg-[#131722] hover:bg-[#1c2233] disabled:opacity-40 border border-zinc-800 rounded text-zinc-300 text-[10px] font-mono transition-colors"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span>EXPORT</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import GeoJSON"
            className="flex items-center gap-1 px-2 py-1 bg-[#131722] hover:bg-[#1c2233] border border-zinc-800 rounded text-zinc-300 text-[10px] font-mono transition-colors"
          >
            <Upload className="w-3 h-3 text-zinc-400" />
            <span>IMPORT</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.geojson,application/geo+json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Markers List */}
      <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
        {markers.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            NO MARKERS PLACED. ACTIVATE &quot;DROP MARKER&quot; ON MAP TO PIN TARGETS.
          </div>
        ) : (
          markers.map((marker) => {
            const hexColor = CATEGORY_COLORS[marker.category] || "#a1a1aa";

            // Compute distance from live device if telemetry exists
            let distanceStr = "--";
            if (telemetry) {
              const meters = calculateHaversineDistance(
                telemetry.lat,
                telemetry.lng,
                marker.lat,
                marker.lng
              );
              distanceStr = formatDistance(meters);
            }

            return (
              <div
                key={marker.id}
                className="group flex items-center justify-between p-2 rounded bg-[#131722] hover:bg-[#181d2a] border border-zinc-800/80 transition-colors gap-2"
              >
                <div
                  className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                  onClick={() => onFlyTo(marker)}
                  title="Click to center map on marker"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: hexColor }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {marker.label}
                      </span>
                      <span
                        className="text-[9px] uppercase font-mono px-1 py-0.2 rounded"
                        style={{
                          color: hexColor,
                          backgroundColor: `${hexColor}15`,
                        }}
                      >
                        {marker.category}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 truncate">
                      {formatCoordinates(marker.lat, marker.lng).combined}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Live distance from device */}
                  <div
                    className="font-mono text-[11px] font-semibold text-teal-400 tabular-nums text-right"
                    title="Live distance from field device"
                  >
                    {distanceStr}
                  </div>

                  {/* Fly to button */}
                  <button
                    onClick={() => onFlyTo(marker)}
                    title="Fly to marker"
                    className="p-1 rounded text-zinc-400 hover:text-teal-400 transition-colors"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteMarker(marker.id)}
                    title="Delete marker"
                    className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear all footer if multiple markers */}
      {markers.length > 2 && (
        <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClearAll}
            className="text-[10px] uppercase font-mono text-zinc-500 hover:text-red-400 transition-colors"
          >
            Clear All Markers
          </button>
        </div>
      )}
    </div>
  );
};
