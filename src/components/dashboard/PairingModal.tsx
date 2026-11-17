"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, RefreshCw, Smartphone } from "lucide-react";

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

  if (!isOpen) return null;

  const cameraUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/camera?s=${sessionCode}`
      : `https://fieldview.app/camera?s=${sessionCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cameraUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e1117] border border-zinc-800 rounded-lg p-6 shadow-2xl relative select-none">
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

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="p-4 bg-white rounded-md shadow-md mb-3">
            <QRCodeSVG
              value={cameraUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#090a0f"
              bgColor="#ffffff"
            />
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

        {/* Pairing Link */}
        <div className="mb-5 space-y-1.5">
          <label className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
            DIRECT STREAMING URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-[#141822] border border-zinc-800 rounded text-xs font-mono text-zinc-300 truncate">
              {cameraUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
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

        {/* Quick Instructions */}
        <div className="p-3 bg-[#12151e] border border-zinc-800/80 rounded mb-5 space-y-2 text-xs text-zinc-400">
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
