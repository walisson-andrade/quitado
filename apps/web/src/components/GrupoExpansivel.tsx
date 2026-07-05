import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

export function GrupoExpansivel({
  titulo,
  totalCents,
  quantidadeItens,
  corAccent,
  abertoPorPadrao,
  children,
}: {
  titulo: string;
  totalCents: number;
  quantidadeItens: number;
  corAccent: string;
  abertoPorPadrao?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoPorPadrao ?? false);

  return (
    <div className="q-surface" style={{ marginBottom: 10, border: "1px solid var(--q-border)", borderRadius: 12, overflow: "hidden" }}>
      <button
        className="q-btn"
        onClick={() => setAberto((a) => !a)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          background: "var(--q-inset-bg)",
          border: "none",
          cursor: "pointer",
          color: "var(--q-text)",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChevronRight className={`q-chevron${aberto ? " aberto" : ""}`} size={16} color={corAccent} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-body)" }}>
            {titulo}
          </span>
          <span style={styles.panelHint}>({quantidadeItens} {quantidadeItens === 1 ? "item" : "itens"})</span>
        </span>
        <span style={{ ...styles.parcelaValor, color: corAccent, fontSize: "var(--fs-body)" }}>{fmt(totalCents)}</span>
      </button>
      <div className={`q-expand${aberto ? " aberto" : ""}`}>
        <div style={{ padding: aberto ? "10px 14px 14px" : "0 14px" }}>{children}</div>
      </div>
    </div>
  );
}
