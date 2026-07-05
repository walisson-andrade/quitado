import type { ReactNode } from "react";
import { styles } from "../styles.js";

export function NavBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`q-nav-btn${active ? " ativo" : ""}`}
      onClick={onClick}
      style={{ ...styles.navBtn, color: active ? "var(--q-teal)" : "var(--q-text-muted)" }}
    >
      {icon}
      <span style={styles.navLabel}>{label}</span>
      <span className="q-nav-dot" />
    </button>
  );
}
