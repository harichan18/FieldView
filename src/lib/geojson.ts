import type { MapMarker } from "@/types/telemetry";

export interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat] per GeoJSON RFC 7946
  };
  properties: {
    id: string;
    label: string;
    category: string;
    note?: string;
    createdAt: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export function exportMarkersToGeoJSON(markers: MapMarker[]): string {
  const collection: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [m.lng, m.lat],
      },
      properties: {
        id: m.id,
        label: m.label,
        category: m.category,
        note: m.note,
        createdAt: m.createdAt,
      },
    })),
  };

  return JSON.stringify(collection, null, 2);
}

export function importMarkersFromGeoJSON(jsonString: string): MapMarker[] {
  const parsed = JSON.parse(jsonString) as GeoJsonFeatureCollection;

  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Invalid GeoJSON format: expected FeatureCollection");
  }

  const markers: MapMarker[] = [];

  for (const feature of parsed.features) {
    if (
      feature.type === "Feature" &&
      feature.geometry?.type === "Point" &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length >= 2
    ) {
      const [lng, lat] = feature.geometry.coordinates;
      if (typeof lat === "number" && typeof lng === "number") {
        const props = feature.properties || {};
        markers.push({
          id: props.id || `marker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          label: props.label || "Imported Marker",
          category: (props.category as MapMarker["category"]) || "checkpoint",
          lat,
          lng,
          note: props.note || "",
          createdAt: props.createdAt || Date.now(),
        });
      }
    }
  }

  return markers;
}

export function downloadGeoJSONFile(
  markers: MapMarker[],
  filename = "fieldview-markers.geojson"
): void {
  const content = exportMarkersToGeoJSON(markers);
  const blob = new Blob([content], { type: "application/geo+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
