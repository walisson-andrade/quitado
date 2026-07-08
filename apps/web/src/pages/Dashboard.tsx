import { useEffect, useState } from "react";
import { ArrowDownRight, Check, Target, TrendingUp, Wallet } from "lucide-react";
import { calcularAporteNecessario, calcularProgressoMeta } from "@quitado/calc";
import { dashboardApi, devedoresApi, metaPoupancaApi, parcelamentosApi } from "../api/resources.js";
import type { DashboardResponse, DevedorRow, MetaPoupancaRow, ParcelaDevedorRow, ParcelamentoRow } from "../api/types.js";
import { CategoriaChart } from "../components/CategoriaChart.js";
import { DespesaChart } from "../components/DespesaChart.js";
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
  const [devedores, setDevedores] = useState<DevedorRow[]>([]);
  const [parcelasDevedores, setParcelasDevedores] = useState<ParcelaDevedorRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [guardandoAporte, setGuardandoAporte] = useState(false);

  function carregar() {
    return Promise.all([
      dashboardApi.obter(),
      parcelamentosApi.listar(),
      metaPoupancaApi.obter(),
      devedoresApi.listar(),
      devedoresApi.listarParcelas(),
    ]).then(([d, p, m, dev, pd]) => {
      setDashboard(d);
      setParcelamentos(p);
      setMeta(m);
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

  const mesAtual = dashboard.mesAtual;
  const saldo = dashboard.saldoMesAtual;
  const progressoMeta = meta ? calcularProgressoMeta(meta) : null;
  const jaGuardadoEsteMesCents = saldo?.aportesMetaCents ?? 0;
  const aporteSugeridoCents = meta ? calcularAporteNecessario(meta, mesAtual, jaGuardadoEsteMesCents > 0) : null;

  async function guardarAporteSugerido() {
    if (!aporteSugeridoCents || aporteSugeridoCents <= 0) return;
    setGuardandoAporte(true);
    try {
      await metaPoupancaApi.registrarAporte({ mesReferencia: mesAtual, valorCents: aporteSugeridoCents });
      await carregar();
    } finally {
      setGuardandoAporte(false);
    }
  }

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
        {meta && progressoMeta ? (
          <SummaryCard
            delayMs={180}
            label={`Meta: ${fmt(meta.valorAlvoCents)}`}
            value={`${(progressoMeta.percentual * 100).toFixed(1)}%`}
            icon={<Target size={18} color="var(--q-purple)" />}
            accent="var(--q-purple)"
            foot={`precisa guardar ${fmt(aporteSugeridoCents ?? 0)}/mês até ${mesLabel(meta.prazo)}`}
            progress={Math.min(progressoMeta.percentual, 1)}
            action={
              aporteSugeridoCents && aporteSugeridoCents > 0 ? (
                jaGuardadoEsteMesCents > 0 ? (
                  <div style={{ ...styles.cardFoot, color: "var(--q-teal)", marginTop: 8 }}>
                    {fmt(jaGuardadoEsteMesCents)} guardado este mês ✓
                  </div>
                ) : (
                  <button
                    className="q-btn"
                    type="button"
                    onClick={guardarAporteSugerido}
                    disabled={guardandoAporte}
                    style={{ ...styles.buttonGhost, marginTop: 8, width: "100%", padding: "6px 10px", fontSize: 11 }}
                  >
                    {guardandoAporte ? "Guardando..." : `Guardar ${fmt(aporteSugeridoCents)} este mês`}
                  </button>
                )
              ) : undefined
            }
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
