import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  calcularTotalParcelamentosNoMesHibrido,
  parcelamentoContaNoMes,
  valorDespesaFixaNoMes,
  valorParcelamentoNoMesHibrido,
} from "@quitado/calc";
import {
  cartoesApi,
  configApi,
  contaPagamentosApi,
  despesaFixaOverridesApi,
  despesasFixasApi,
  faturasApi,
  parcelamentosApi,
} from "../api/resources.js";
import type { CartaoRow, ContaPagamentoRow, DespesaFixaOverrideRow, DespesaFixaRow, ParcelamentoRow } from "../api/types.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

interface ContaItem {
  tipo: "despesa_fixa" | "cartao" | "parcelamento";
  id: string;
  nome: string;
  diaVencimento: number | null;
  valorCents: number | null;
}

export function ContasAPagar() {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixaRow[]>([]);
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRow[]>([]);
  const [cartoes, setCartoes] = useState<CartaoRow[]>([]);
  const [pagamentos, setPagamentos] = useState<ContaPagamentoRow[]>([]);
  const [ultimaFaturaPorOrigem, setUltimaFaturaPorOrigem] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<DespesaFixaOverrideRow[]>([]);
  const [mesAtual, setMesAtual] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pagasAberto, setPagasAberto] = useState(false);

  async function carregar() {
    const [df, parcelamentosRows, cartoesRows, config, ultimaFatura] = await Promise.all([
      despesasFixasApi.listar(),
      parcelamentosApi.listar(),
      cartoesApi.listar(),
      configApi.obter(),
      faturasApi.ultimaPorOrigem(),
    ]);
    setDespesasFixas(df);
    setParcelamentos(parcelamentosRows);
    setCartoes(cartoesRows);
    setUltimaFaturaPorOrigem(ultimaFatura);
    setMesAtual(config.mesAtual);
    setPagamentos(await contaPagamentosApi.listar(config.mesAtual));
    setOverrides(await despesaFixaOverridesApi.listar(config.mesAtual));
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, []);

  async function alternarPago(item: ContaItem, statusAtual: "pendente" | "pago") {
    if (!mesAtual) return;
    await contaPagamentosApi.marcar({
      despesaFixaId: item.tipo === "despesa_fixa" ? item.id : null,
      cartaoId: item.tipo === "cartao" ? item.id : null,
      parcelamentoId: item.tipo === "parcelamento" ? item.id : null,
      mesReferencia: mesAtual,
      status: statusAtual === "pago" ? "pendente" : "pago",
    });
    carregar();
  }

  if (carregando || !mesAtual) return <div style={styles.panelHint}>Carregando...</div>;
  const mes = mesAtual;
  const hoje = new Date().getDate();
  const mesAbrev = mesLabel(mes).split("/")[0]!.toUpperCase();

  // Só empréstimos/financiamentos cadastrados manualmente viram item da lista —
  // compras de cartão (origem = nome do banco) já entram somadas na fatura do cartão.
  const emprestimosAtivos = parcelamentos.filter(
    (p) => (p.origem === "manual" || p.origem == null) && parcelamentoContaNoMes(p, mes, mes, ultimaFaturaPorOrigem),
  );

  function valorCartaoNoMes(nomeCartao: string): number | null {
    const doCartao = parcelamentos.filter((p) => p.origem === nomeCartao);
    if (doCartao.length === 0) return null;
    return calcularTotalParcelamentosNoMesHibrido(doCartao, mes, mes, ultimaFaturaPorOrigem);
  }

  const itens: ContaItem[] = [
    ...despesasFixas
      .filter((d) => d.ativo)
      .map((d) => ({
        tipo: "despesa_fixa" as const,
        id: d.id,
        nome: d.nome,
        diaVencimento: d.diaVencimento,
        valorCents: valorDespesaFixaNoMes(d, mes, overrides),
      })),
    ...emprestimosAtivos.map((p) => ({
      tipo: "parcelamento" as const,
      id: p.id,
      nome: p.nome,
      diaVencimento: p.diaVencimento,
      valorCents: valorParcelamentoNoMesHibrido(p, mes, mes, ultimaFaturaPorOrigem),
    })),
    ...cartoes
      .filter((c) => c.ativo)
      .map((c) => ({ tipo: "cartao" as const, id: c.id, nome: c.nome, diaVencimento: c.diaVencimento, valorCents: valorCartaoNoMes(c.nome) })),
  ];

  const statusPorChave = new Map(
    pagamentos.map((p) => [
      p.despesaFixaId ? `df:${p.despesaFixaId}` : p.cartaoId ? `c:${p.cartaoId}` : `p:${p.parcelamentoId}`,
      p.status,
    ]),
  );
  function statusDe(item: ContaItem): "pendente" | "pago" {
    const chave = item.tipo === "despesa_fixa" ? `df:${item.id}` : item.tipo === "cartao" ? `c:${item.id}` : `p:${item.id}`;
    return (statusPorChave.get(chave) as "pendente" | "pago" | undefined) ?? "pendente";
  }

  // Ordena por data — só pendentes ficam na linha do tempo principal, pagas
  // saem pra uma seção recolhível separada (fica no mesmo lugar, não some no fim).
  const pendentesComDia = itens
    .filter((i) => statusDe(i) === "pendente" && i.diaVencimento != null)
    .sort((a, b) => a.diaVencimento! - b.diaVencimento!);
  const pendentesSemDia = itens.filter((i) => statusDe(i) === "pendente" && i.diaVencimento == null);
  const listaOrdenada = [...pendentesComDia, ...pendentesSemDia];
  const pagas = itens
    .filter((i) => statusDe(i) === "pago")
    .sort((a, b) => (a.diaVencimento ?? 99) - (b.diaVencimento ?? 99));

  const totalMes = itens.reduce((s, i) => s + (i.valorCents ?? 0), 0);
  const totalPago = itens.filter((i) => statusDe(i) === "pago").reduce((s, i) => s + (i.valorCents ?? 0), 0);
  const faltaPagar = Math.max(totalMes - totalPago, 0);
  const segmentos = [...listaOrdenada, ...pagas].filter((i) => i.valorCents != null);

  function LinhaTimeline({ item }: { item: ContaItem }) {
    const status = statusDe(item);
    const isPago = status === "pago";
    const semDia = item.diaVencimento == null;
    const isVencido = !isPago && !semDia && item.diaVencimento! < hoje;

    let badgeBg = "var(--q-inset-bg)";
    let badgeBorder = "var(--q-border-input)";
    let badgeColor = "var(--q-text)";
    let statusColor = "var(--q-gold)";
    let statusTexto = `vence dia ${item.diaVencimento}`;

    if (isPago) {
      badgeBg = "var(--q-success-tint)";
      badgeBorder = "var(--q-teal)";
      badgeColor = "var(--q-teal)";
      statusColor = "var(--q-teal)";
      statusTexto = "pago ✓";
    } else if (semDia) {
      badgeColor = "var(--q-text-faint)";
      statusColor = "var(--q-text-faint)";
      statusTexto = "sem dia definido";
    } else if (isVencido) {
      badgeBg = "var(--q-orange)";
      badgeBorder = "var(--q-orange)";
      badgeColor = "var(--q-on-accent)";
      statusColor = "var(--q-orange)";
      statusTexto = `venceu dia ${item.diaVencimento}`;
    }

    return (
      <div style={styles.timelineRow}>
        <div style={{ ...styles.timelineBadge, background: badgeBg, border: `1.5px solid ${badgeBorder}`, color: badgeColor }}>
          {semDia ? (
            <>
              <span style={styles.timelineBadgeDia}>—</span>
              <span style={styles.timelineBadgeMes}>DEFINIR</span>
            </>
          ) : (
            <>
              <span style={styles.timelineBadgeDia}>{String(item.diaVencimento).padStart(2, "0")}</span>
              <span style={styles.timelineBadgeMes}>{mesAbrev}</span>
            </>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...styles.timelineNome,
              color: isPago ? "var(--q-text-faint)" : "var(--q-text)",
              textDecoration: isPago ? "line-through" : "none",
            }}
          >
            {item.nome}
          </div>
          <div style={{ ...styles.timelineStatus, color: statusColor }}>{statusTexto}</div>
        </div>
        <span
          style={{
            ...styles.timelineValor,
            color: isPago ? "var(--q-text-faint)" : item.valorCents != null ? "var(--q-text)" : "var(--q-text-faint)",
            textDecoration: isPago ? "line-through" : "none",
          }}
        >
          {item.valorCents != null ? fmt(item.valorCents) : "fatura variável"}
        </span>
        <button
          className="q-btn"
          onClick={() => alternarPago(item, status)}
          aria-label={isPago ? "Marcar como pendente" : "Marcar como pago"}
          title={isPago ? "Marcar como pendente" : "Marcar como pago"}
          style={{
            ...styles.timelineCheckbox,
            background: isPago ? "var(--q-teal)" : "transparent",
            border: `2px solid ${isPago ? "var(--q-teal)" : "var(--q-border-input)"}`,
          }}
        >
          {isPago && <Check size={14} color="var(--q-on-accent)" strokeWidth={3} />}
        </button>
      </div>
    );
  }

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Linha do tempo</h3>
        <span style={styles.panelHint}>Ordenado por data, trilho de calendário. Toque na linha inteira. Pagas ficam na seção recolhível.</span>
      </div>

      <div style={styles.timelineSummaryLabel}>falta pagar</div>
      <div style={{ ...styles.timelineSummaryValor, color: "var(--q-orange)" }}>{fmt(faltaPagar)}</div>
      <div style={styles.timelineSummaryPago}>
        {fmt(totalPago)} pago de {fmt(totalMes)}
      </div>
      {segmentos.length > 0 && (
        <div style={styles.timelineSegmentedBar}>
          {segmentos.map((s) => (
            <div
              key={`${s.tipo}-${s.id}`}
              style={{ ...styles.timelineSegment, background: statusDe(s) === "pago" ? "var(--q-teal)" : "var(--q-track-bg)" }}
            />
          ))}
        </div>
      )}

      {pagas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            className="q-btn"
            onClick={() => setPagasAberto((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <ChevronRight className={`q-chevron${pagasAberto ? " aberto" : ""}`} size={14} color="var(--q-teal)" />
            <span style={{ ...styles.timelineSummaryLabel, color: "var(--q-teal)" }}>pagas · {pagas.length}</span>
          </button>
          <div className={`q-expand${pagasAberto ? " aberto" : ""}`}>
            <div style={{ paddingTop: pagasAberto ? 6 : 0, overflow: "hidden" }}>
              {pagas.map((item) => (
                <LinhaTimeline key={`${item.tipo}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {listaOrdenada.length === 0 ? (
          <div style={styles.panelHint}>
            Nenhuma conta cadastrada ainda. Configure o dia de vencimento nas despesas fixas e empréstimos (aba Despesas) ou nos cartões (aba
            Config).
          </div>
        ) : (
          listaOrdenada.map((item) => <LinhaTimeline key={`${item.tipo}-${item.id}`} item={item} />)
        )}
      </div>
    </section>
  );
}
