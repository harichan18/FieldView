"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useWakeLock() {
  const [isSupported] = useState(
    () => typeof navigator !== "undefined" && "wakeLock" in navigator
  );
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return false;

    try {
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      setIsActive(true);

      lock.addEventListener("release", () => {
        setIsActive(false);
        wakeLockRef.current = null;
      });

      return true;
    } catch (err) {
      console.warn("Wake lock request failed:", err);
      setIsActive(false);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn("Error releasing wake lock:", err);
      } finally {
        wakeLockRef.current = null;
        setIsActive(false);
      }
    }
  }, []);

  // Re-acquire lock if tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !wakeLockRef.current &&
        isSupported
      ) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isSupported, requestWakeLock, releaseWakeLock]);

  return { isSupported, isActive, requestWakeLock, releaseWakeLock };
}
