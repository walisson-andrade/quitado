import type { ReactNode } from "react";
import { styles } from "../styles.js";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
