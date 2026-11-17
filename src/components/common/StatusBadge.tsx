import React from "react";
import type { ConnectionStatus } from "@/types/telemetry";

interface StatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
  showDot = true,
}) => {
  const configs: Record<
    ConnectionStatus,
    { label: string; dot: string; container: string }
  > = {
    waiting: {
      label: "WAITING",
      dot: "bg-amber-400",
      container: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    },
    connecting: {
      label: "CONNECTING",
      dot: "bg-teal-400 animate-pulse",
      container: "border-teal-500/20 bg-teal-500/10 text-teal-300",
    },
    live: {
      label: "LIVE",
      dot: "bg-emerald-400",
      container: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    },
    reconnecting: {
      label: "RECONNECTING",
      dot: "bg-amber-400 animate-pulse",
      container: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    },
    disconnected: {
      label: "DISCONNECTED",
      dot: "bg-zinc-500",
      container: "border-zinc-700/40 bg-zinc-800/40 text-zinc-400",
    },
  };

  const current = configs[status] || configs.disconnected;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-mono tracking-wider uppercase select-none ${current.container} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      )}
      <span>{current.label}</span>
    </div>
  );
};
