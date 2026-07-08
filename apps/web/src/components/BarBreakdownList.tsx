import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

export interface BarBreakdownItemDetalhe {
  nome: string;
  valorCents: number;
}

export interface BarBreakdownItem {
  key: string;
  label: string;
  totalCents: number;
  cor: string;
  itens?: BarBreakdownItemDetalhe[];
}

export function BarBreakdownList({
  itens,
  vazio,
  mostrarPercentual,
  mostrarMarcadorFim,
}: {
  itens: BarBreakdownItem[];
  vazio: string;
  mostrarPercentual?: boolean;
  mostrarMarcadorFim?: boolean;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (itens.length === 0) {
    return <div style={styles.panelHint}>{vazio}</div>;
  }

  const maiorTotal = Math.max(...itens.map((i) => i.totalCents));
  const somaTotal = itens.reduce((s, i) => s + i.totalCents, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {itens.map((item, i) => {
        const expandivel = !!item.itens && item.itens.length > 0;
        const estaAberto = aberto === item.key;
        const itensOrdenados = item.itens ? [...item.itens].sort((a, b) => b.valorCents - a.valorCents) : [];

        return (
          <div key={item.key}>
            <button
              className="q-btn"
              type="button"
              onClick={expandivel ? () => setAberto(estaAberto ? null : item.key) : undefined}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                cursor: expandivel ? "pointer" : "default",
                color: "inherit",
                textAlign: "left",
              }}
              disabled={!expandivel}
            >
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--q-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                {expandivel && <ChevronRight className={`q-chevron${estaAberto ? " aberto" : ""}`} size={12} />}
                {item.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...styles.parcelaValor }}>{fmt(item.totalCents)}</span>
                {mostrarPercentual && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "var(--fs-xs)",
                      color: "var(--q-text-muted)",
                      width: 34,
                      textAlign: "right",
                    }}
                  >
                    {somaTotal > 0 ? Math.round((item.totalCents / somaTotal) * 100) : 0}%
                  </span>
                )}
              </span>
            </button>
            <div style={{ position: "relative", height: 8, background: "var(--q-track-bg)", borderRadius: 4 }}>
              <div
                className="q-bar-fill"
                style={{
                  height: "100%",
                  width: `${(item.totalCents / maiorTotal) * 100}%`,
                  background: item.cor,
                  borderRadius: 4,
                  animationDelay: `${i * 60}ms`,
                }}
              />
              {mostrarMarcadorFim && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(item.totalCents / maiorTotal) * 100}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: item.cor,
                    border: "2.5px solid var(--q-card-bg)",
                  }}
                />
              )}
            </div>
            {expandivel && (
              <div className={`q-expand${estaAberto ? " aberto" : ""}`}>
                <div style={{ padding: estaAberto ? "8px 4px 2px" : "0 4px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {itensOrdenados.map((detalhe, idx) => (
                    <div key={`${detalhe.nome}-${idx}`} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ ...styles.panelHint, color: "var(--q-text-detail)" }}>{detalhe.nome}</span>
                      <span style={{ fontSize: "var(--fs-xs)", fontFamily: "'JetBrains Mono', monospace", color: "var(--q-text-secondary)" }}>
                        {fmt(detalhe.valorCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
