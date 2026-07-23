import { useState } from "react";
import { ChevronRight, CreditCard, Home, Layers } from "lucide-react";
import { diffMeses, mesFinalParcelamento, parcelaAindaAtiva, parcelaNoMes } from "@quitado/calc";
import type { MesReferencia } from "@quitado/shared-types";
import { fmt, mesLabel } from "../format.js";
import type { ParcelamentoRow } from "../api/types.js";
import { BarraProgresso } from "./BarraProgresso.js";
import { IconBadge } from "./IconBadge.js";
import { corPorOrigem } from "./OrigemChart.js";

const CORES = ["var(--q-gold)", "var(--q-orange)", "var(--q-teal)", "var(--q-blue)", "var(--q-purple)", "var(--q-rose)"];

interface ItemComputado {
  p: ParcelamentoRow;
  cor: string;
  faltaCents: number | null;
  mesFim: MesReferencia | null;
  mesesAteFim: number | null;
}

function calcularItens(parcelamentos: ParcelamentoRow[], mesAtual: MesReferencia, corDe: (p: ParcelamentoRow, i: number) => string) {
  return parcelamentos
    .filter((p) => parcelaAindaAtiva(p, mesAtual))
    .map((p, i) => {
      const parcelaAgora = parcelaNoMes(p, mesAtual);
      const faltam = p.continuaIndefinidamente ? null : Math.max(p.parcelaTotal - parcelaAgora + 1, 0);
      const mesFim = p.continuaIndefinidamente ? null : mesFinalParcelamento(p);
      const mesesAteFim = mesFim ? diffMeses(mesAtual, mesFim) : null;
      return {
        p,
        cor: corDe(p, i),
        faltaCents: faltam !== null ? faltam * p.valorParcelaCents : null,
        mesFim,
        mesesAteFim,
      };
    });
}

function comProgresso<T extends { mesesAteFim: number | null }>(itens: T[]) {
  const maxMesesAteFim = Math.max(...itens.map((it) => it.mesesAteFim ?? 0), 1);
  return itens.map((it) => ({
    ...it,
    progresso: it.mesesAteFim === null ? 100 : Math.max((1 - it.mesesAteFim / maxMesesAteFim) * 100, 4),
  }));
}

function ordenarPorFim<T extends { mesFim: MesReferencia | null }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const fimA = a.mesFim ?? "9999-99";
    const fimB = b.mesFim ?? "9999-99";
    return fimA.localeCompare(fimB);
  });
}

function LinhaDivida({ nome, cor, progresso, faltaCents, mesFim, indefinido }: { nome: string; cor: string; progresso: number; faltaCents: number | null; mesFim: MesReferencia | null; indefinido: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "var(--fs-sm)", color: "var(--q-text-secondary)", fontWeight: 500, lineHeight: 1.3 }}>{nome}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-xs)", color: "var(--q-text-muted)" }}>
        {mesFim && faltaCents !== null ? `falta ${fmt(faltaCents)} · até ${mesLabel(mesFim)}` : "sem prazo definido"}
      </span>
      <BarraProgresso progresso={progresso} cor={cor} indefinido={indefinido} />
    </div>
  );
}

function bucketDoCartao(origem: string | null): string {
  if (origem && origem !== "manual") return origem;
  return "fixo";
}

/**
 * Cada dívida vira uma barra de progresso com "falta X · até mês Y" explícito
 * — some da lista assim que a última parcela é paga. O preenchimento reflete
 * proximidade no tempo (quem termina antes fica com a barra mais cheia), não
 * a razão parcela-atual/total — assim a lista, já ordenada por término, desce
 * visualmente como uma diagonal em vez de pular entre cheia e vazia.
 *
 * Alternando pro modo "por cartão", as dívidas de uma mesma fatura/cartão
 * viram um único grupo (cor consistente com o Resumo por origem), ordenado
 * pelo cartão que termina de ser pago primeiro — abrir o grupo revela as
 * dívidas individuais daquele cartão.
 */
export function GanttTimeline({ meses, parcelamentos }: { meses: MesReferencia[]; parcelamentos: ParcelamentoRow[] }) {
  const [porCartao, setPorCartao] = useState(true);
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null);

  const mesAtual = meses[0];
  if (!mesAtual || parcelamentos.length === 0) return null;

  const itensBase = calcularItens(parcelamentos, mesAtual, (_p, i) => CORES[i % CORES.length]!);
  if (itensBase.length === 0) return null;

  const toggle = (
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      <button
        className="q-btn"
        onClick={() => setPorCartao(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: "var(--fs-xs)",
          fontWeight: 600,
          cursor: "pointer",
          border: `1px solid ${porCartao ? "var(--q-teal)" : "var(--q-border)"}`,
          background: porCartao ? "var(--q-teal-bg, rgba(45, 212, 191, 0.12))" : "transparent",
          color: porCartao ? "var(--q-teal)" : "var(--q-text-secondary)",
        }}
      >
        <CreditCard size={13} /> Por cartão
      </button>
      <button
        className="q-btn"
        onClick={() => setPorCartao(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 999,
          fontSize: "var(--fs-xs)",
          fontWeight: 600,
          cursor: "pointer",
          border: `1px solid ${!porCartao ? "var(--q-teal)" : "var(--q-border)"}`,
          background: !porCartao ? "var(--q-teal-bg, rgba(45, 212, 191, 0.12))" : "transparent",
          color: !porCartao ? "var(--q-teal)" : "var(--q-text-secondary)",
        }}
      >
        <Layers size={13} /> Por dívida
      </button>
    </div>
  );

  if (!porCartao) {
    const itens = comProgresso(ordenarPorFim(itensBase));
    return (
      <div>
        {toggle}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {itens.map(({ p, cor, progresso, faltaCents, mesFim }) => (
            <LinhaDivida
              key={p.id}
              nome={p.nome}
              cor={cor}
              progresso={progresso}
              faltaCents={faltaCents}
              mesFim={mesFim}
              indefinido={p.continuaIndefinidamente}
            />
          ))}
        </div>
      </div>
    );
  }

  const grupos = new Map<string, ItemComputado[]>();
  for (const item of calcularItens(parcelamentos, mesAtual, () => "")) {
    const chave = bucketDoCartao(item.p.origem);
    const lista = grupos.get(chave) ?? [];
    lista.push(item);
    grupos.set(chave, lista);
  }

  const gruposCalculados = Array.from(grupos.entries()).map(([origem, itens]) => {
    const temIndefinido = itens.some((it) => it.mesesAteFim === null);
    const mesFim = temIndefinido ? null : itens.reduce<MesReferencia | null>((max, it) => (!max || (it.mesFim && it.mesFim > max) ? it.mesFim! : max), null);
    const mesesAteFim = mesFim ? diffMeses(mesAtual, mesFim) : null;
    const faltaCents = temIndefinido ? null : itens.reduce((acc, it) => acc + (it.faltaCents ?? 0), 0);
    return {
      origem,
      label: origem === "fixo" ? "Custos Fixos" : origem,
      cor: corPorOrigem(origem),
      itens: ordenarPorFim(itens),
      mesFim,
      mesesAteFim,
      faltaCents,
      indefinido: temIndefinido,
    };
  });

  const gruposComProgresso = comProgresso(ordenarPorFim(gruposCalculados));

  return (
    <div>
      {toggle}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {gruposComProgresso.map((g) => {
          const aberto = cartaoAberto === g.origem;
          return (
            <div key={g.origem} className="q-surface" style={{ border: "1px solid var(--q-border)", borderRadius: 14, overflow: "hidden" }}>
              <button
                className="q-btn"
                onClick={() => setCartaoAberto(aberto ? null : g.origem)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "12px 14px",
                  background: "var(--q-inset-bg)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--q-text)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <IconBadge icon={g.origem === "fixo" ? Home : CreditCard} cor={g.cor} tamanho="sm" />
                    <ChevronRight className={`q-chevron${aberto ? " aberto" : ""}`} size={15} color={g.cor} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-sm)", lineHeight: 1.3, minWidth: 0 }}>
                      {g.label}
                    </span>
                  </span>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingLeft: 59 }}>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--q-text-faint)", flexShrink: 0 }}>
                      {g.itens.length} {g.itens.length === 1 ? "dívida" : "dívidas"}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-xs)", color: "var(--q-text-muted)", flexShrink: 0, textAlign: "right" }}>
                      {g.mesFim && g.faltaCents !== null ? `falta ${fmt(g.faltaCents)} · até ${mesLabel(g.mesFim)}` : "sem prazo definido"}
                    </span>
                  </span>
                </div>
                <BarraProgresso progresso={g.progresso} cor={g.cor} indefinido={g.indefinido} />
              </button>
              <div className={`q-expand${aberto ? " aberto" : ""}`}>
                <div style={{ padding: aberto ? "12px 14px 14px" : "0 14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {comProgresso(g.itens).map(({ p, faltaCents, mesFim, progresso }) => (
                      <LinhaDivida
                        key={p.id}
                        nome={p.nome}
                        cor={g.cor}
                        progresso={progresso}
                        faltaCents={faltaCents}
                        mesFim={mesFim}
                        indefinido={p.continuaIndefinidamente}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
