import { useState } from "react";
import { fmt, mesLabel } from "../format.js";
import type { DashboardResponse } from "../api/types.js";

export function DespesaChart({ projecao }: { projecao: DashboardResponse["projecao"] }) {
  const [selecionado, setSelecionado] = useState(projecao.length - 1);
  if (projecao.length === 0) return null;
  const max = Math.max(...projecao.map((p) => p.saldo.totalDespesasCents), 1);
  const primeiro = projecao[0]!;
  const meio = projecao[Math.floor(projecao.length / 2)]!;
  const ultimo = projecao[projecao.length - 1]!;
  const atual = projecao[selecionado] ?? ultimo;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)" }}>
          {mesLabel(atual.mes)}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-xs)", color: "var(--q-orange)", fontWeight: 600 }}>
          {fmt(atual.saldo.totalDespesasCents)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
        {projecao.map((p, idx) => {
          const ehSelecionado = idx === selecionado;
          const h = Math.max((p.saldo.totalDespesasCents / max) * 100, 3);
          return (
            <button
              key={p.mes}
              className="q-btn"
              onClick={() => setSelecionado(idx)}
              aria-label={`${mesLabel(p.mes)}: ${fmt(p.saldo.totalDespesasCents)}`}
              style={{
                flex: ehSelecionado ? 1.15 : 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                className="q-col-fill"
                style={{
                  width: "100%",
                  height: `${ehSelecionado ? h * 0.92 : h}%`,
                  borderRadius: "6px 6px 3px 3px",
                  background: ehSelecionado
                    ? "linear-gradient(180deg, var(--q-orange), color-mix(in oklab, var(--q-orange) 60%, var(--q-bg)))"
                    : "var(--q-track-bg)",
                  border: ehSelecionado ? "none" : "1px solid var(--q-border)",
                  transition: "height 0.2s ease, background 0.2s ease",
                }}
              />
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)" }}>
          {mesLabel(primeiro.mes)}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)" }}>
          {mesLabel(meio.mes)}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-tiny)", color: "var(--q-orange)" }}>
          {mesLabel(ultimo.mes)}
        </span>
      </div>
    </div>
  );
}
