export type ConnectionStatus =
  | "waiting"
  | "connecting"
  | "live"
  | "reconnecting"
  | "disconnected";

export interface GpsTelemetry {
  lat: number;
  lng: number;
  accuracy: number; // In meters
  speed: number | null; // In m/s
  heading: number | null; // In degrees (0-360)
  altitude: number | null; // In meters
  timestamp: number; // Epoch timestamp
}

export type MarkerCategory =
  | "checkpoint"
  | "target"
  | "danger"
  | "observation"
  | "generic";

export interface MapMarker {
  id: string;
  label: string;
  category: MarkerCategory;
  lat: number;
  lng: number;
  note?: string;
  createdAt: number;
}

export interface VideoStats {
  resolution: string;
  fps: number;
  latencyMs: number | null;
  bitrateKbps?: number;
}

export type DataChannelMessage =
  | { type: "gps"; payload: GpsTelemetry }
  | { type: "ping"; timestamp: number }
  | { type: "pong"; timestamp: number }
  | {
      type: "camera_meta";
      facingMode: "user" | "environment";
      torchAvailable?: boolean;
    }
  | { type: "client_disconnect" };

export type MapLayer = "street" | "satellite";
