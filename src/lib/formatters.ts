/**
 * Format decimal degrees with cardinal direction.
 * E.g., 37.774929, -122.419416 -> 37.774929° N, 122.419416° W
 */
export function formatCoordinates(lat: number, lng: number): {
  latStr: string;
  lngStr: string;
  combined: string;
} {
  const latCard = lat >= 0 ? "N" : "S";
  const lngCard = lng >= 0 ? "E" : "W";
  const latStr = `${Math.abs(lat).toFixed(6)}° ${latCard}`;
  const lngStr = `${Math.abs(lng).toFixed(6)}° ${lngCard}`;

  return {
    latStr,
    lngStr,
    combined: `${latStr}, ${lngStr}`,
  };
}

/**
 * Format coordinate into Degrees, Minutes, Seconds (DMS).
 */
export function formatDMS(coordinate: number, isLatitude: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  const direction = isLatitude
    ? coordinate >= 0
      ? "N"
      : "S"
    : coordinate >= 0
    ? "E"
    : "W";

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

/**
 * Format speed in m/s to km/h and mph.
 */
export function formatSpeed(speedMs: number | null): {
  kmh: string;
  mph: string;
  display: string;
} {
  if (speedMs === null || isNaN(speedMs) || speedMs < 0) {
    return { kmh: "0.0", mph: "0.0", display: "0.0 km/h" };
  }
  const kmhVal = speedMs * 3.6;
  const mphVal = speedMs * 2.23694;

  return {
    kmh: kmhVal.toFixed(1),
    mph: mphVal.toFixed(1),
    display: `${kmhVal.toFixed(1)} km/h`,
  };
}

/**
 * Converts heading degrees (0-360) into 16-wind compass cardinal.
 */
export function formatHeading(headingDeg: number | null): {
  degrees: string;
  cardinal: string;
  display: string;
} {
  if (headingDeg === null || isNaN(headingDeg) || headingDeg < 0) {
    return { degrees: "--", cardinal: "--", display: "--" };
  }

  const normalized = (headingDeg % 360 + 360) % 360;
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(normalized / 22.5) % 16;
  const cardinal = directions[index];

  return {
    degrees: `${Math.round(normalized)}°`,
    cardinal,
    display: `${Math.round(normalized)}° ${cardinal}`,
  };
}

/**
 * Formats GPS accuracy with tactical quality tier.
 */
export function formatAccuracy(accuracyMeters: number): {
  text: string;
  tier: "high" | "good" | "moderate" | "poor";
} {
  const text = `±${accuracyMeters.toFixed(1)}m`;
  if (accuracyMeters <= 5) return { text, tier: "high" };
  if (accuracyMeters <= 15) return { text, tier: "good" };
  if (accuracyMeters <= 30) return { text, tier: "moderate" };
  return { text, tier: "poor" };
}

/**
 * Formats last update age in seconds.
 */
export function formatRelativeAge(timestamp: number, now = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec === 0) return "<1s ago";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}
