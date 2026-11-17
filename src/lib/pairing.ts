"use client";

import { useSyncExternalStore, useEffect, useState, useMemo, useCallback } from "react";

export interface PairingLinkInfo {
  link: string;
  baseUrl: string;
  isLocalOrInsecure: boolean;
  isReady: boolean;
  detectedLanIp: string | null;
  setCustomBaseUrl: (url: string) => void;
  resetBaseUrl: () => void;
}

const emptySubscribe = () => () => {};

const STORAGE_KEY_CUSTOM_BASE = "fieldview_custom_base_url";

export function usePairingLink(sessionCode: string): PairingLinkInfo {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [detectedLanIp, setDetectedLanIp] = useState<string | null>(null);
  const [customBaseUrl, setCustomBaseUrlState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_BASE) || "";
    } catch {
      return "";
    }
  });

  // Fetch local LAN IP from internal API when running on localhost
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      fetch("/api/network-ip")
        .then((res) => res.json())
        .then((data) => {
          if (data?.localIp) {
            setDetectedLanIp(data.localIp);
          }
        })
        .catch(() => {});
    }
  }, []);

  const setCustomBaseUrl = useCallback((url: string) => {
    const clean = url.trim().replace(/\/+$/, "");
    setCustomBaseUrlState(clean);
    try {
      if (clean) {
        localStorage.setItem(STORAGE_KEY_CUSTOM_BASE, clean);
      } else {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_BASE);
      }
    } catch {}
  }, []);

  const resetBaseUrl = useCallback(() => {
    setCustomBaseUrlState("");
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_BASE);
    } catch {}
  }, []);

  const info = useMemo(() => {
    if (!isClient || !sessionCode) {
      return {
        link: "",
        baseUrl: "",
        isLocalOrInsecure: false,
        isReady: false,
        detectedLanIp: null,
      };
    }

    // Determine Base URL in priority:
    // 1. User manual override (via UI or localStorage)
    // 2. NEXT_PUBLIC_BASE_URL (env var)
    // 3. Auto-detected LAN IP (if on localhost, replace 'localhost' with actual Wi-Fi IP so phone can connect!)
    // 4. window.location.origin (e.g. on Vercel deployment https://app.vercel.app)
    let baseUrl = "";
    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();

    if (customBaseUrl) {
      baseUrl = customBaseUrl.replace(/\/+$/, "");
    } else if (envBase) {
      baseUrl = envBase.replace(/\/+$/, "");
    } else if (
      detectedLanIp &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      const port = window.location.port ? `:${window.location.port}` : "";
      baseUrl = `${window.location.protocol}//${detectedLanIp}${port}`;
    } else {
      baseUrl = window.location.origin;
    }

    const code = encodeURIComponent(sessionCode.trim().toUpperCase());
    const link = `${baseUrl}/camera?s=${code}`;

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";
    const isInsecureHttp = protocol === "http:";

    const isSecureUrl = baseUrl.startsWith("https://");
    const isLocalOrInsecure = (isLocalHost || isInsecureHttp) && !isSecureUrl;

    return {
      link,
      baseUrl,
      isLocalOrInsecure,
      isReady: true,
      detectedLanIp,
    };
  }, [isClient, sessionCode, customBaseUrl, detectedLanIp]);

  useEffect(() => {
    if (info.link) {
      console.log("[FieldView] Generated pairing link:", info.link);
    }
  }, [info.link]);

  return {
    ...info,
    setCustomBaseUrl,
    resetBaseUrl,
  };
}
