import React from "react";

type LoadingIndicatorProps = {
  label: string;
  compact?: boolean;
};

/** Indicador visual reutilizável para ações breves do PixBee. */
export function LoadingIndicator({
  label,
  compact = false,
}: LoadingIndicatorProps) {
  return (
    <span
      className={`pixbee-loading-indicator${compact ? " compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="pixbee-loading-orbit" aria-hidden="true" />
      <span className="pixbee-loading-label">{label}</span>
    </span>
  );
}
