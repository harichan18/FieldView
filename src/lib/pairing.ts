"use client";

import { useSyncExternalStore, useEffect, useMemo } from "react";

export interface PairingLinkInfo {
  link: string;
  isLocalOrInsecure: boolean;
  isReady: boolean;
}

const emptySubscribe = () => () => {};

/**
 * Builds the pairing link at runtime on the client only.
 * Respects NEXT_PUBLIC_BASE_URL if set, otherwise uses window.location.origin.
 * Never falls back to a placeholder domain.
 */
export function getPairingUrl(sessionCode: string): string {
  if (typeof window === "undefined" || !sessionCode) {
    return "";
  }

  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const baseUrl = envBase
    ? envBase.replace(/\/+$/, "")
    : window.location.origin;

  const code = encodeURIComponent(sessionCode.trim().toUpperCase());
  return `${baseUrl}/camera?s=${code}`;
}

/**
 * Hook to compute the pairing link on the client and check if the dashboard
 * is running on localhost, 127.0.0.1, or insecure HTTP without an HTTPS public base URL.
 */
export function usePairingLink(sessionCode: string): PairingLinkInfo {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const info = useMemo(() => {
    if (!isClient || !sessionCode) {
      return {
        link: "",
        isLocalOrInsecure: false,
        isReady: false,
      };
    }

    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
    const baseUrl = envBase
      ? envBase.replace(/\/+$/, "")
      : window.location.origin;

    const code = encodeURIComponent(sessionCode.trim().toUpperCase());
    const link = `${baseUrl}/camera?s=${code}`;

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";
    const isInsecureHttp = protocol === "http:";

    const hasHttpsOverride = !!envBase && envBase.startsWith("https://");
    const isLocalOrInsecure = (isLocalHost || isInsecureHttp) && !hasHttpsOverride;

    return {
      link,
      isLocalOrInsecure,
      isReady: true,
    };
  }, [isClient, sessionCode]);

  useEffect(() => {
    if (info.link) {
      console.log("[FieldView] Generated pairing link:", info.link);
    }
  }, [info.link]);

  return info;
}
