"use client";

import React, { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";

export const OrientationAlert: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== "undefined") {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full bg-[#090a0f]/90 border border-teal-500/50 backdrop-blur-md shadow-xl flex items-center gap-2 text-teal-300 text-xs font-mono select-none pointer-events-none animate-pulse">
      <RotateCcw className="w-3.5 h-3.5" />
      <span>ROTATE DEVICE TO LANDSCAPE</span>
    </div>
  );
};
