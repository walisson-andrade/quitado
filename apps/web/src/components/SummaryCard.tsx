import type { ReactNode } from "react";
import { styles } from "../styles.js";

export function SummaryCard({
  label,
  value,
  icon,
  accent,
  foot,
  progress,
  delayMs = 0,
  action,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  foot: string;
  progress?: number;
  delayMs?: number;
  action?: ReactNode;
}) {
  return (
    <div className="q-surface q-surface-hover q-rise-in" style={{ ...styles.card, animationDelay: `${delayMs}ms` }}>
      <div style={styles.cardTop}>
        <span
          style={{
            ...styles.cardLabel,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={label}
        >
          {label}
        </span>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ ...styles.cardValue, color: accent }}>{value}</div>
      {typeof progress === "number" && (
        <div style={styles.progressTrack}>
          <div
            className="q-bar-fill"
            style={{ ...styles.progressFill, width: `${progress * 100}%`, background: accent }}
          />
        </div>
      )}
      <div style={styles.cardFoot}>{foot}</div>
      {action}
    </div>
  );
}
