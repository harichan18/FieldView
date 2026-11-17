"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { usePairingLink } from "@/lib/pairing";
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  Loader2,
  Globe,
  Settings2,
} from "lucide-react";

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  onRegenerateCode: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  sessionCode,
  onRegenerateCode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showUrlSettings, setShowUrlSettings] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // Derive dynamic pairing link on client with auto-detected Wi-Fi IP or custom override
  const {
    link,
    baseUrl,
    isLocalOrInsecure,
    isReady,
    detectedLanIp,
    setCustomBaseUrl,
    resetBaseUrl,
  } = usePairingLink(sessionCode);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveUrlOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setCustomBaseUrl(urlInput);
      setShowUrlSettings(false);
    }
  };

  const handleResetUrl = () => {
    resetBaseUrl();
    setUrlInput("");
    setShowUrlSettings(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#0e1117] border border-zinc-800 rounded-lg p-5 sm:p-6 shadow-2xl relative select-none my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold tracking-wider text-zinc-100 uppercase">
              Pair Mobile Camera
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning banner when opened on localhost / 127.0.0.1 / plain http */}
        {isLocalOrInsecure && (
          <div className="mb-4 p-3 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300 text-xs flex items-start gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="leading-snug block">
                Camera and GPS need HTTPS. Open this dashboard from your Vercel URL or an HTTPS tunnel (ngrok / cloudflared) so the phone can stream.
              </span>
              {detectedLanIp && (
                <span className="text-[10px] text-zinc-400 block font-mono">
                  Auto-routed to LAN IP: {detectedLanIp} for local Wi-Fi testing.
                </span>
              )}
            </div>
          </div>
        )}

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="p-4 bg-white rounded-md shadow-md mb-3 min-w-[212px] min-h-[212px] flex items-center justify-center">
            {isReady && link ? (
              <QRCodeSVG
                value={link}
                size={180}
                level="H"
                includeMargin={false}
                fgColor="#090a0f"
                bgColor="#ffffff"
              />
            ) : (
              <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-zinc-700 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                <span className="text-xs font-mono">RESOLVING LINK...</span>
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              SESSION CODE
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-widest text-teal-400">
                {sessionCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy code"
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-teal-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pairing Link: uses single 'link' variable */}
        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
              DIRECT STREAMING URL
            </label>
            <button
              onClick={() => {
                setShowUrlSettings(!showUrlSettings);
                setUrlInput(baseUrl);
              }}
              className="text-[10px] font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              <Settings2 className="w-3 h-3" />
              <span>Change Host / Tunnel</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-[#141822] border border-zinc-800 rounded text-xs font-mono text-zinc-300 truncate">
              {link || "GENERATING LINK..."}
            </div>
            <button
              onClick={handleCopyLink}
              disabled={!link}
              className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Custom Base URL Settings drawer */}
        {showUrlSettings && (
          <form
            onSubmit={handleSaveUrlOverride}
            className="mb-4 p-3 bg-[#141824] border border-zinc-700 rounded space-y-2 text-xs"
          >
            <div className="flex items-center justify-between text-zinc-300">
              <span className="font-semibold text-[11px] uppercase tracking-wide flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                Override Host Base URL
              </span>
              <button
                type="button"
                onClick={handleResetUrl}
                className="text-[10px] font-mono text-zinc-400 hover:text-red-400"
              >
                Reset Default
              </button>
            </div>
            <div className="text-[10px] text-zinc-400 leading-tight">
              Paste your ngrok HTTPS tunnel, Cloudflare tunnel, or deployed Vercel domain:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xxxx.ngrok-free.app"
                className="flex-1 px-2.5 py-1.5 bg-[#0e1117] border border-zinc-700 rounded text-xs text-zinc-100 font-mono focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs"
              >
                Apply
              </button>
            </div>
          </form>
        )}

        {/* Quick Instructions */}
        <div className="p-3 bg-[#12151e] border border-zinc-800/80 rounded mb-4 space-y-2 text-xs text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded bg-zinc-800 text-teal-400 font-mono text-[10px] flex items-center justify-center shrink-0">
              1
            </span>
            <span>Point your phone camera at the QR code to open the streaming page.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded bg-zinc-800 text-teal-400 font-mono text-[10px] flex items-center justify-center shrink-0">
              2
            </span>
            <span>Allow Camera & GPS Location permissions when prompted.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded bg-zinc-800 text-teal-400 font-mono text-[10px] flex items-center justify-center shrink-0">
              3
            </span>
            <span>Hold phone horizontally (landscape) and tap &quot;Start Streaming&quot;.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
          <button
            onClick={onRegenerateCode}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate New Code</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
