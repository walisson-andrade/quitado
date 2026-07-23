import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { fmt } from "../format.js";
import { styles } from "../styles.js";
import { IconBadge } from "./IconBadge.js";

export function GrupoExpansivel({
  titulo,
  totalCents,
  quantidadeItens,
  corAccent,
  icon,
  abertoPorPadrao,
  renderHeader,
  children,
}: {
  titulo?: string;
  totalCents?: number;
  quantidadeItens?: number;
  corAccent: string;
  icon?: LucideIcon;
  abertoPorPadrao?: boolean;
  renderHeader?: (aberto: boolean) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoPorPadrao ?? false);

  return (
    <div className="q-surface" style={{ marginBottom: 10, border: "1px solid var(--q-border)", borderRadius: 14, overflow: "hidden" }}>
      <button
        className="q-btn"
        onClick={() => setAberto((a) => !a)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: "var(--q-inset-bg)",
          border: "none",
          cursor: "pointer",
          color: "var(--q-text)",
          textAlign: "left",
        }}
      >
        {renderHeader ? (
          renderHeader(aberto)
        ) : (
          <>
            <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
              {icon && <IconBadge icon={icon} cor={corAccent} tamanho="sm" />}
              <ChevronRight className={`q-chevron${aberto ? " aberto" : ""}`} size={16} color={corAccent} style={{ flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-body)", lineHeight: 1.3 }}>
                  {titulo}
                </span>
                <span style={styles.panelHint}>
                  {quantidadeItens} {quantidadeItens === 1 ? "item" : "itens"}
                </span>
              </span>
            </span>
            <span style={{ ...styles.parcelaValor, color: corAccent, fontSize: "var(--fs-body)", flexShrink: 0 }}>{fmt(totalCents ?? 0)}</span>
          </>
        )}
      </button>
      <div className={`q-expand${aberto ? " aberto" : ""}`}>
        <div style={{ padding: aberto ? "10px 14px 14px" : "0 14px" }}>{children}</div>
      </div>
    </div>
  );
}
