import { useEffect, useState } from "react";
import { ArrowDownRight, Target, TrendingUp, Wallet } from "lucide-react";
import { calcularAporteNecessario, calcularProgressoMeta } from "@quitado/calc";
import { dashboardApi, metaPoupancaApi, parcelamentosApi } from "../api/resources.js";
import type { DashboardResponse, MetaPoupancaRow, ParcelamentoRow } from "../api/types.js";
import { CategoriaChart } from "../components/CategoriaChart.js";
import { GanttTimeline } from "../components/GanttTimeline.js";
import { OrigemChart } from "../components/OrigemChart.js";
import { SaldoChart } from "../components/SaldoChart.js";
import { SummaryCard } from "../components/SummaryCard.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

export function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRow[]>([]);
  const [meta, setMeta] = useState<MetaPoupancaRow | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.obter(), parcelamentosApi.listar(), metaPoupancaApi.obter()])
      .then(([d, p, m]) => {
        setDashboard(d);
        setParcelamentos(p);
        setMeta(m);
      })
      .finally(() => setCarregando(false));
  }, []);

  if (carregando || !dashboard) return <div style={styles.panelHint}>Carregando...</div>;

  const saldo = dashboard.saldoMesAtual;
  const progressoMeta = meta ? calcularProgressoMeta(meta) : null;
  const aporteSugeridoCents = meta ? calcularAporteNecessario(meta, dashboard.mesAtual) : null;

  return (
    <>
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
        {meta && progressoMeta ? (
          <SummaryCard
            delayMs={180}
            label={`Meta: ${fmt(meta.valorAlvoCents)}`}
            value={`${(progressoMeta.percentual * 100).toFixed(1)}%`}
            icon={<Target size={18} color="var(--q-purple)" />}
            accent="var(--q-purple)"
            foot={`precisa guardar ${fmt(aporteSugeridoCents ?? 0)}/mês até ${mesLabel(meta.prazo)}`}
            progress={Math.min(progressoMeta.percentual, 1)}
          />
        ) : (
          <SummaryCard
            delayMs={180}
            label="Meta de poupança"
            value="—"
            icon={<Target size={18} color="var(--q-purple)" />}
            accent="var(--q-purple)"
            foot="configure sua meta na aba correspondente"
          />
        )}
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Resumo por origem</h3>
          <span style={styles.panelHint}>fatura Inter, Nubank, custo fixo e outros parcelamentos neste mês</span>
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
          <h3 style={styles.panelTitle}>Linha do tempo das dívidas</h3>
          <span style={styles.panelHint}>cada barra some quando a última parcela é paga</span>
        </div>
        <GanttTimeline meses={dashboard.projecao.map((p) => p.mes)} parcelamentos={parcelamentos} />
      </section>

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Gastos por categoria</h3>
          <span style={styles.panelHint}>despesas fixas + parcelamentos ativos neste mês</span>
        </div>
        <CategoriaChart porCategoria={dashboard.porCategoria} />
      </section>
    </>
  );
}
