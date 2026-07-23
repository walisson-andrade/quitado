import { useEffect, useState } from "react";
import { ArrowDownRight, Check, ChevronRight, Target, TrendingUp, Wallet } from "lucide-react";
import { calcularProgressoMeta } from "@quitado/calc";
import { dashboardApi, devedoresApi, metasApi, parcelamentosApi } from "../api/resources.js";
import type { DashboardResponse, DevedorRow, MetaRow, ParcelaDevedorRow, ParcelamentoRow } from "../api/types.js";
import { BarraProgresso } from "../components/BarraProgresso.js";
import { CategoriaChart } from "../components/CategoriaChart.js";
import { DespesaChart } from "../components/DespesaChart.js";
import { GanttTimeline } from "../components/GanttTimeline.js";
import { IconBadge } from "../components/IconBadge.js";
import { OrigemChart } from "../components/OrigemChart.js";
import { SaldoChart } from "../components/SaldoChart.js";
import { SummaryCard } from "../components/SummaryCard.js";
import { fmt, mesLabel } from "../format.js";
import { META_CATEGORIA_INFO } from "../metaVisual.js";
import { styles } from "../styles.js";

export function Dashboard({ onAbrirMetas }: { onAbrirMetas?: () => void }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRow[]>([]);
  const [metas, setMetas] = useState<MetaRow[]>([]);
  const [devedores, setDevedores] = useState<DevedorRow[]>([]);
  const [parcelasDevedores, setParcelasDevedores] = useState<ParcelaDevedorRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    return Promise.all([
      dashboardApi.obter(),
      parcelamentosApi.listar(),
      metasApi.listar(),
      devedoresApi.listar(),
      devedoresApi.listarParcelas(),
    ]).then(([d, p, m, dev, pd]) => {
      setDashboard(d);
      setParcelamentos(p);
      setMetas(m);
      setDevedores(dev);
      setParcelasDevedores(pd);
    });
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, []);

  async function marcarRecebido(parcela: ParcelaDevedorRow) {
    await devedoresApi.marcarParcela(parcela.id, "pago");
    carregar();
  }

  if (carregando || !dashboard) return <div style={styles.panelHint}>Carregando...</div>;

  const saldo = dashboard.saldoMesAtual;
  const guardadoTotalCents = metas.reduce((s, m) => s + m.acumuladoCents, 0);
  const alvoTotalCents = metas.reduce((s, m) => s + m.valorAlvoCents, 0);
  const percentualTotal = alvoTotalCents > 0 ? guardadoTotalCents / alvoTotalCents : 0;

  const parcelasEsteMes = parcelasDevedores
    .filter((p) => p.status === "pendente" && p.mesReferencia === dashboard.mesAtual)
    .map((p) => ({ parcela: p, devedor: devedores.find((d) => d.id === p.devedorId) }))
    .filter((item) => item.devedor);

  return (
    <>
      {parcelasEsteMes.length > 0 && (
        <section className="q-surface" style={styles.panel}>
          <div style={styles.panelHeadRow}>
            <h3 style={styles.panelTitle}>Este mês · {mesLabel(dashboard.mesAtual)}</h3>
            <span style={styles.panelHint}>o que entra de quem te deve</span>
          </div>
          {parcelasEsteMes.map(({ parcela, devedor }) => (
            <div key={parcela.id} style={styles.esteMesRow}>
              <span>
                {devedor!.nome} paga a parcela{" "}
                <span style={styles.esteMesValor}>+{fmt(parcela.valorCents)}</span>
              </span>
              <button className="q-btn" onClick={() => marcarRecebido(parcela)} style={styles.esteMesBtn}>
                <Check size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                recebi
              </button>
            </div>
          ))}
        </section>
      )}

      <section style={styles.cardsRow}>
        <SummaryCard
          delayMs={0}
          label="Renda do mês"
          value={fmt(saldo?.rendaCents ?? 0)}
          icon={<TrendingUp size={18} color="var(--q-teal)" />}
          accent="var(--q-teal)"
          foot="salário em € à cotação do dia"
        />
        <SummaryCard
          delayMs={60}
          label="Despesas do mês"
          value={fmt(saldo?.totalDespesasCents ?? 0)}
          icon={<ArrowDownRight size={18} color="var(--q-orange)" />}
          accent="var(--q-orange)"
          foot="fixas + parcelamentos + à vista"
        />
        <SummaryCard
          delayMs={120}
          label="Saldo livre"
          value={fmt(saldo?.saldoCents ?? 0)}
          icon={<Wallet size={18} color="var(--q-gold)" />}
          accent="var(--q-gold)"
          foot={
            saldo?.recebidoDevedoresCents
              ? `depois de tudo pago · já inclui ${fmt(saldo.recebidoDevedoresCents)} recebido de quem te deve`
              : "depois de tudo pago"
          }
        />
        {metas.length > 0 ? (
          <SummaryCard
            delayMs={180}
            label={metas.length <= 2 ? metas.map((m) => m.nome).join(" · ") : `${metas.length} metas`}
            value={`${(percentualTotal * 100).toFixed(0)}%`}
            icon={<Target size={18} color="var(--q-purple)" />}
            accent="var(--q-purple)"
            foot={`${fmt(guardadoTotalCents)} guardado de ${fmt(alvoTotalCents)} no total`}
            progress={Math.min(percentualTotal, 1)}
          />
        ) : (
          <SummaryCard
            delayMs={180}
            label="Metas"
            value="—"
            icon={<Target size={18} color="var(--q-purple)" />}
            accent="var(--q-purple)"
            foot="crie sua primeira meta na aba Metas"
          />
        )}
      </section>

      {metas.length > 0 && (
        <section className="q-surface" style={styles.panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
            <div style={{ ...styles.panelHeadRow, marginBottom: 0 }}>
              <h3 style={styles.panelTitle}>Metas</h3>
              <span style={styles.panelHint}>{metas.length} {metas.length === 1 ? "ativa" : "ativas"} · toque pra abrir</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-title)", fontWeight: 600, color: "var(--q-purple)", whiteSpace: "nowrap" }}>
              {fmt(guardadoTotalCents)}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {metas.map((m) => {
              const { cor, Icon } = META_CATEGORIA_INFO[m.categoria];
              const progresso = calcularProgressoMeta(m);
              const concluida = progresso.percentual >= 1;
              return (
                <button
                  key={m.id}
                  className="q-btn"
                  onClick={onAbrirMetas}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 14,
                    padding: "11px 12px", cursor: onAbrirMetas ? "pointer" : "default", color: "var(--q-text)", textAlign: "left",
                  }}
                >
                  <IconBadge icon={Icon} cor={cor} tamanho="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "var(--fs-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.nome}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-xs)", color: "var(--q-text-muted)", flexShrink: 0 }}>
                        <span style={{ color: "var(--q-text-secondary)", fontWeight: 600 }}>{fmt(m.acumuladoCents)}</span> / {fmt(m.valorAlvoCents)}
                      </span>
                    </div>
                    <BarraProgresso progresso={Math.min(progresso.percentual, 1) * 100} cor={cor} />
                  </div>
                  {concluida ? (
                    <span
                      style={{
                        fontSize: 9, fontWeight: 700, color: "var(--q-teal)", background: "var(--q-success-tint)",
                        border: "1px solid var(--q-teal)", padding: "1px 6px", borderRadius: 999, flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  ) : (
                    <ChevronRight size={14} color="var(--q-text-faint)" style={{ flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="q-surface" style={styles.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
          <div style={{ ...styles.panelHeadRow, marginBottom: 0 }}>
            <h3 style={styles.panelTitle}>Resumo por origem</h3>
            <span style={styles.panelHint}>o que compõe as despesas deste mês</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-title)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {fmt(dashboard.porOrigem.reduce((s, o) => s + o.totalCents, 0))}
          </span>
        </div>
        <OrigemChart porOrigem={dashboard.porOrigem} />
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Saldo projetado</h3>
          <span style={styles.panelHint}>sobe conforme as dívidas terminam</span>
        </div>
        <SaldoChart projecao={dashboard.projecao} />
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Despesa projetada</h3>
          <span style={styles.panelHint}>cai conforme as dívidas terminam</span>
        </div>
        <DespesaChart projecao={dashboard.projecao} />
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Gastos por categoria</h3>
          <span style={styles.panelHint}>despesas fixas + parcelamentos ativos neste mês</span>
        </div>
        <CategoriaChart porCategoria={dashboard.porCategoria} />
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Linha do tempo das dívidas</h3>
          <span style={styles.panelHint}>quanto falta e quando termina</span>
        </div>
        <GanttTimeline meses={dashboard.projecao.map((p) => p.mes)} parcelamentos={parcelamentos} />
      </section>
    </>
  );
}
