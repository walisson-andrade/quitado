import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { fmt } from "../format.js";
import { styles } from "../styles.js";
import { IconBadge } from "./IconBadge.js";

export interface BarBreakdownItemDetalhe {
  nome: string;
  valorCents: number;
}

export interface BarBreakdownItem {
  key: string;
  label: string;
  totalCents: number;
  cor: string;
  icon?: LucideIcon;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {itens.map((item, i) => {
        const expandivel = !!item.itens && item.itens.length > 0;
        const estaAberto = aberto === item.key;
        const itensOrdenados = item.itens ? [...item.itens].sort((a, b) => b.valorCents - a.valorCents) : [];
        const pct = maiorTotal > 0 ? (item.totalCents / maiorTotal) * 100 : 0;

        return (
          <div
            key={item.key}
            className="q-surface"
            style={{ background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 14, padding: "11px 12px" }}
          >
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
                alignItems: "center",
                gap: 9,
                cursor: expandivel ? "pointer" : "default",
                color: "inherit",
                textAlign: "left",
              }}
              disabled={!expandivel}
            >
              {item.icon && <IconBadge icon={item.icon} cor={item.cor} tamanho="sm" />}
              {expandivel && (
                <ChevronRight className={`q-chevron${estaAberto ? " aberto" : ""}`} size={13} style={{ flexShrink: 0, color: "var(--q-text-faint)" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, lineHeight: 1.3 }}>{item.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ position: "relative", height: 6, background: "var(--q-track-bg)", borderRadius: 3, flex: 1, minWidth: 0 }}>
                    <div
                      className="q-bar-fill"
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: item.cor,
                        borderRadius: 3,
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                    {mostrarMarcadorFim && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${pct}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 11,
                          height: 11,
                          borderRadius: "50%",
                          background: item.cor,
                          border: "2.5px solid var(--q-card-bg)",
                        }}
                      />
                    )}
                  </div>
                  <span style={{ ...styles.parcelaValor, flexShrink: 0 }}>{fmt(item.totalCents)}</span>
                  {mostrarPercentual && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "var(--fs-xs)",
                        color: "var(--q-text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {somaTotal > 0 ? Math.round((item.totalCents / somaTotal) * 100) : 0}%
                    </span>
                  )}
                </div>
              </div>
            </button>
            {expandivel && (
              <div className={`q-expand${estaAberto ? " aberto" : ""}`}>
                <div style={{ padding: estaAberto ? "9px 0 0" : "0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {itensOrdenados.map((detalhe, idx) => (
                    <div key={`${detalhe.nome}-${idx}`} style={{ display: "flex", justifyContent: "space-between", paddingLeft: item.icon ? 35 : 0 }}>
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
