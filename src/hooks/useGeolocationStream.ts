"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { GpsTelemetry } from "@/types/telemetry";
import { calculateBearing, calculateHaversineDistance } from "@/lib/haversine";

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  sampleIntervalMs?: number; // Throttle dispatch interval (e.g., ~1000ms)
  onPositionUpdate?: (telemetry: GpsTelemetry) => void;
}

export function useGeolocationStream({
  enableHighAccuracy = true,
  timeout = 10000,
  maximumAge = 0,
  sampleIntervalMs = 1000,
  onPositionUpdate,
}: UseGeolocationOptions = {}) {
  const [telemetry, setTelemetry] = useState<GpsTelemetry | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== "undefined" && !("geolocation" in navigator)) {
      return "Geolocation is not supported by your browser/device.";
    }
    return null;
  });
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unsupported"
  >(() => {
    if (typeof window !== "undefined" && !("geolocation" in navigator)) {
      return "unsupported";
    }
    return "prompt";
  });
  const [isWatching, setIsWatching] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastDispatchedRef = useRef<number>(0);
  const previousFixRef = useRef<GpsTelemetry | null>(null);
  const callbackRef = useRef(onPositionUpdate);

  useEffect(() => {
    callbackRef.current = onPositionUpdate;
  }, [onPositionUpdate]);

  // Check initial permission status if available
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          setPermissionState(status.state);
          status.onchange = () => {
            setPermissionState(status.state);
          };
        })
        .catch(() => {
          // Fallback if query not supported
        });
    }
  }, []);

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const now = Date.now();
      const coords = position.coords;

      // Extract raw values
      const lat = coords.latitude;
      const lng = coords.longitude;
      const accuracy = coords.accuracy;
      const speed = coords.speed !== null && !isNaN(coords.speed) ? coords.speed : null;
      let heading = coords.heading !== null && !isNaN(coords.heading) ? coords.heading : null;
      const altitude =
        coords.altitude !== null && !isNaN(coords.altitude) ? coords.altitude : null;

      // Fallback heading calculation if device doesn't provide heading (e.g. Android Chrome stationary or walking)
      if (heading === null && previousFixRef.current) {
        const prev = previousFixRef.current;
        const dist = calculateHaversineDistance(prev.lat, prev.lng, lat, lng);
        if (dist > 2.0) {
          heading = calculateBearing(prev.lat, prev.lng, lat, lng);
        } else {
          heading = prev.heading; // Retain last heading if barely moved
        }
      }

      const fix: GpsTelemetry = {
        lat,
        lng,
        accuracy,
        speed,
        heading,
        altitude,
        timestamp: position.timestamp || now,
      };

      previousFixRef.current = fix;
      setTelemetry(fix);
      setError(null);
      setPermissionState("granted");

      // Rate limit / sample dispatch for WebRTC data channel
      if (now - lastDispatchedRef.current >= sampleIntervalMs) {
        lastDispatchedRef.current = now;
        callbackRef.current?.(fix);
      }
    },
    [sampleIntervalMs]
  );

  const handleError = useCallback((geoError: GeolocationPositionError) => {
    let msg = "Failed to obtain GPS position.";
    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        msg = "Location permission was denied. Please allow GPS access in your browser settings.";
        setPermissionState("denied");
        break;
      case geoError.POSITION_UNAVAILABLE:
        msg = "GPS signal unavailable. Ensure location services are turned ON.";
        break;
      case geoError.TIMEOUT:
        msg = "GPS fix request timed out. Searching for satellites...";
        break;
    }
    setError(msg);
  }, []);

  const startWatching = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    try {
      const id = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });
      watchIdRef.current = id;
      setIsWatching(true);
    } catch (e) {
      setError("Failed to start geolocation watcher.");
      console.error(e);
    }
  }, [enableHighAccuracy, timeout, maximumAge, handlePosition, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    telemetry,
    error,
    permissionState,
    isWatching,
    startWatching,
    stopWatching,
  };
}
