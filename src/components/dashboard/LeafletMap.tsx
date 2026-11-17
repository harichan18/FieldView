"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GpsTelemetry, MapMarker, MapLayer, MarkerCategory } from "@/types/telemetry";
import { formatCoordinates } from "@/lib/formatters";
import { Crosshair, MapPin, Trash2, X } from "lucide-react";

interface LeafletMapProps {
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

// Map helper to auto-center or fly-to
const MapController: React.FC<{
  telemetry: GpsTelemetry | null;
  followDevice: boolean;
  flyToTarget: { lat: number; lng: number } | null;
  onFlyToComplete: () => void;
  isDropMode: boolean;
  onMapClickForMarker: (lat: number, lng: number) => void;
}> = ({
  telemetry,
  followDevice,
  flyToTarget,
  onFlyToComplete,
  isDropMode,
  onMapClickForMarker,
}) => {
  const map = useMap();
  const hasInitializedCenter = useRef(false);

  // Handle map clicks in drop marker mode
  useMapEvents({
    click(e) {
      if (isDropMode) {
        onMapClickForMarker(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  // Handle fly to specific marker
  useEffect(() => {
    if (flyToTarget) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], 17, {
        animate: true,
        duration: 1.2,
      });
      onFlyToComplete();
    }
  }, [flyToTarget, map, onFlyToComplete]);

  // Handle follow device
  useEffect(() => {
    if (!telemetry) return;

    if (!hasInitializedCenter.current) {
      map.setView([telemetry.lat, telemetry.lng], 16);
      hasInitializedCenter.current = true;
      return;
    }

    if (followDevice) {
      map.panTo([telemetry.lat, telemetry.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [telemetry, followDevice, map]);

  return null;
};

// Create custom device icon with heading pointer
function createDeviceIcon(heading: number | null): L.DivIcon {
  const hasHeading = heading !== null && !isNaN(heading);
  const rotation = hasHeading ? heading : 0;

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 -ml-5 -mt-5">
      <!-- Radar pulse ring -->
      <div class="absolute w-10 h-10 rounded-full bg-teal-500/25 animate-radar-pulse"></div>
      
      <!-- Center dot -->
      <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#090a0f] border-2 border-teal-400 shadow-lg shadow-teal-500/30">
        ${
          hasHeading
            ? `<div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;" class="w-full h-full flex items-center justify-center">
                 <svg class="w-3.5 h-3.5 text-teal-400 fill-current" viewBox="0 0 24 24">
                   <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                 </svg>
               </div>`
            : `<div class="w-2.5 h-2.5 rounded-full bg-teal-400"></div>`
        }
      </div>
    </div>
  `;

  return L.divIcon({
    className: "fieldview-device-marker",
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Category styling
const CATEGORY_COLORS: Record<MarkerCategory, { bg: string; border: string; hex: string }> = {
  checkpoint: { bg: "bg-teal-500/20", border: "border-teal-400", hex: "#14b8a6" },
  target: { bg: "bg-amber-500/20", border: "border-amber-400", hex: "#f59e0b" },
  danger: { bg: "bg-red-500/20", border: "border-red-400", hex: "#ef4444" },
  observation: { bg: "bg-blue-500/20", border: "border-blue-400", hex: "#3b82f6" },
  generic: { bg: "bg-zinc-500/20", border: "border-zinc-400", hex: "#a1a1aa" },
};

function createPinIcon(category: MarkerCategory, label: string): L.DivIcon {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.generic;

  const html = `
    <div class="group relative flex flex-col items-center -ml-3 -mt-7 cursor-pointer select-none">
      <div class="w-6 h-6 rounded-full bg-[#0e1117] border-2 ${color.border} flex items-center justify-center shadow-md">
        <div class="w-2 h-2 rounded-full" style="background-color: ${color.hex}"></div>
      </div>
      <div class="w-1 h-1.5 bg-[#27272a]"></div>
      <!-- Tooltip badge -->
      <div class="absolute -top-5 px-1.5 py-0.5 rounded bg-[#090a0f]/90 border border-zinc-700 text-[10px] text-zinc-300 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    className: "fieldview-pin-marker",
    html,
    iconSize: [24, 32],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
  });
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  telemetry,
  pathHistory,
  markers,
  activeLayer,
  followDevice,
  isDropMode,
  onAddMarker,
  onDeleteMarker,
  flyToTarget,
  onFlyToComplete,
}) => {
  // Modal for creating marker
  const [pendingMarkerPos, setPendingMarkerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<MarkerCategory>("checkpoint");
  const [newNote, setNewNote] = useState("");

  const handleMapClickForMarker = useCallback((lat: number, lng: number) => {
    setPendingMarkerPos({ lat, lng });
    setNewLabel(`Point ${markers.length + 1}`);
    setNewCategory("checkpoint");
    setNewNote("");
  }, [markers.length]);

  const handleSavePendingMarker = () => {
    if (!pendingMarkerPos) return;
    onAddMarker({
      label: newLabel.trim() || `Marker #${markers.length + 1}`,
      category: newCategory,
      lat: pendingMarkerPos.lat,
      lng: pendingMarkerPos.lng,
      note: newNote.trim(),
    });
    setPendingMarkerPos(null);
  };

  // Default coordinate if no device telemetry yet (e.g. San Francisco or default center)
  const centerLat = telemetry?.lat ?? 37.7749;
  const centerLng = telemetry?.lng ?? -122.4194;

  return (
    <div className={`relative w-full h-full ${isDropMode ? "cursor-crosshair" : ""}`}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={15}
        className="w-full h-full min-h-[300px]"
        zoomControl={true}
      >
        <MapController
          telemetry={telemetry}
          followDevice={followDevice}
          flyToTarget={flyToTarget}
          onFlyToComplete={onFlyToComplete}
          isDropMode={isDropMode}
          onMapClickForMarker={handleMapClickForMarker}
        />

        {/* Tile Layer: Street vs Satellite */}
        {activeLayer === "street" ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}

        {/* Breadcrumb Trail */}
        {pathHistory.length > 1 && (
          <Polyline
            positions={pathHistory}
            pathOptions={{
              color: "#14b8a6",
              weight: 3,
              opacity: 0.65,
              dashArray: "4, 6",
            }}
          />
        )}

        {/* Live Device Position & Accuracy Circle */}
        {telemetry && (
          <>
            <Circle
              center={[telemetry.lat, telemetry.lng]}
              radius={Math.max(5, telemetry.accuracy)}
              pathOptions={{
                color: "#14b8a6",
                fillColor: "#14b8a6",
                fillOpacity: 0.12,
                weight: 1,
                dashArray: "3, 3",
              }}
            />

            <Marker
              position={[telemetry.lat, telemetry.lng]}
              icon={createDeviceIcon(telemetry.heading)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold text-teal-400 mb-1 flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>FIELD DEVICE</span>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-300">
                    {formatCoordinates(telemetry.lat, telemetry.lng).combined}
                  </div>
                  <div className="text-zinc-400 text-[10px] mt-1">
                    Accuracy: ±{telemetry.accuracy.toFixed(1)}m
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Operational Dropped Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={createPinIcon(marker.category, marker.label)}
            eventHandlers={{
              contextmenu: () => {
                // Right click deletes marker
                onDeleteMarker(marker.id);
              },
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1 mb-1.5">
                  <span className="font-semibold text-zinc-200 text-xs">
                    {marker.label}
                  </span>
                  <span
                    className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-medium"
                    style={{
                      color: CATEGORY_COLORS[marker.category].hex,
                      backgroundColor: `${CATEGORY_COLORS[marker.category].hex}15`,
                    }}
                  >
                    {marker.category}
                  </span>
                </div>
                {marker.note && (
                  <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                    {marker.note}
                  </p>
                )}
                <div className="font-mono text-[10px] text-zinc-500 mb-2">
                  {formatCoordinates(marker.lat, marker.lng).combined}
                </div>
                <button
                  onClick={() => onDeleteMarker(marker.id)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded text-red-300 text-[10px] transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Marker</span>
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Inline Create Marker Modal */}
      {pendingMarkerPos && (
        <div className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#0e1117] border border-zinc-700 rounded-md p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold tracking-wide uppercase">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>New Marker</span>
              </div>
              <button
                onClick={() => setPendingMarkerPos(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Checkpoint Alpha"
                  className="w-full px-2.5 py-1.5 bg-[#141822] border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MarkerCategory)}
                  className="w-full px-2.5 py-1.5 bg-[#141822] border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="checkpoint">Checkpoint (Teal)</option>
                  <option value="target">Target (Amber)</option>
                  <option value="danger">Danger / Hazard (Red)</option>
                  <option value="observation">Observation (Blue)</option>
                  <option value="generic">Generic (Slate)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1">
                  Coordinates
                </label>
                <div className="font-mono text-[10px] text-zinc-400 bg-[#090a0f] p-1.5 rounded border border-zinc-800">
                  {formatCoordinates(pendingMarkerPos.lat, pendingMarkerPos.lng).combined}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-zinc-400 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add operational notes..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 bg-[#141822] border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingMarkerPos(null)}
                  className="flex-1 py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePendingMarker}
                  className="flex-1 py-1.5 px-3 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors"
                >
                  Add Marker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
