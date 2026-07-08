import { useEffect, useState } from "react";
import { Check, ChevronRight, Clock } from "lucide-react";
import { resolverMesAtual } from "@quitado/calc";
import { devedoresApi } from "../api/resources.js";
import type { DevedorRow, ParcelaDevedorRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

const CORES = ["var(--q-orange)", "var(--q-teal)", "var(--q-blue)", "var(--q-purple)", "var(--q-rose)", "var(--q-gold)"];
const PREVIEW_COUNT = 4;

export function QuemMeDeve() {
  const [devedores, setDevedores] = useState<DevedorRow[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaDevedorRow[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const mesAtual = resolverMesAtual(null);

  function carregar() {
    Promise.all([devedoresApi.listar(), devedoresApi.listarParcelas()])
      .then(([d, p]) => {
        setDevedores(d);
        setParcelas(p);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function adicionarDevedor(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    await devedoresApi.criar({ nome: novoNome.trim() });
    setNovoNome("");
    carregar();
  }

  async function alternarPago(parcela: ParcelaDevedorRow) {
    await devedoresApi.marcarParcela(parcela.id, parcela.status === "pago" ? "pendente" : "pago");
    carregar();
  }

  if (carregando) return <div style={styles.panelHint}>Carregando...</div>;

  const totalPendente = parcelas.filter((p) => p.status === "pendente").reduce((acc, p) => acc + p.valorCents, 0);
  const recebidoNoMes = parcelas
    .filter((p) => p.status === "pago" && p.mesReferencia === mesAtual)
    .reduce((acc, p) => acc + p.valorCents, 0);

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Quem me deve</h3>
        <span style={styles.panelHint}>marca como pago quando cair na conta</span>
      </div>

      <div style={styles.devedoresSummaryRow}>
        <div style={styles.devedoresSummaryBox}>
          <div style={styles.devedoresSummaryLabel}>pendente total</div>
          <div style={{ ...styles.devedoresSummaryValue, color: "var(--q-orange)" }}>{fmt(totalPendente)}</div>
        </div>
        <div style={styles.devedoresSummaryBox}>
          <div style={styles.devedoresSummaryLabel}>recebido em {mesLabel(mesAtual)}</div>
          <div style={{ ...styles.devedoresSummaryValue, color: "var(--q-teal)" }}>{fmt(recebidoNoMes)}</div>
        </div>
      </div>

      {devedores.map((dev, i) => {
        const parcelasDoDevedor = parcelas
          .filter((p) => p.devedorId === dev.id)
          .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
        const cor = dev.corHex ?? CORES[i % CORES.length]!;

        return (
          <DevedorCard
            key={dev.id}
            devedor={dev}
            cor={cor}
            parcelas={parcelasDoDevedor}
            mesAtual={mesAtual}
            onTogglePago={alternarPago}
            onParcelaAdicionada={carregar}
          />
        );
      })}

      <form onSubmit={adicionarDevedor} style={styles.addPersonRow}>
        <Field label="Nova pessoa">
          <input placeholder="ex: Wesley" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={styles.input} />
        </Field>
        <button className="q-btn" type="submit" style={styles.buttonGhost}>
          Adicionar
        </button>
      </form>
    </section>
  );
}

function DevedorCard({
  devedor,
  cor,
  parcelas,
  mesAtual,
  onTogglePago,
  onParcelaAdicionada,
}: {
  devedor: DevedorRow;
  cor: string;
  parcelas: ParcelaDevedorRow[];
  mesAtual: string;
  onTogglePago: (parcela: ParcelaDevedorRow) => void;
  onParcelaAdicionada: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const totalPendente = parcelas.filter((p) => p.status === "pendente").reduce((acc, p) => acc + p.valorCents, 0);
  const totalPagas = parcelas.filter((p) => p.status === "pago").length;
  const progresso = parcelas.length > 0 ? totalPagas / parcelas.length : 0;

  const proximoIdx = parcelas.findIndex((p) => p.status === "pendente");
  const inicioPreview = proximoIdx === -1 ? Math.max(0, parcelas.length - PREVIEW_COUNT) : Math.max(0, proximoIdx - 1);
  const parcelasPreview = parcelas.slice(inicioPreview, inicioPreview + PREVIEW_COUNT);
  const ocultas = parcelas.length - parcelasPreview.length;
  const parcelasExibidas = expandido ? parcelas : parcelasPreview;

  return (
    <div style={styles.devedorCard}>
      <button className="q-btn" onClick={() => setAberto((v) => !v)} style={styles.devedorCardHead}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ChevronRight className={`q-chevron${aberto ? " aberto" : ""}`} size={16} color={cor} />
          <div style={{ ...styles.avatar, background: cor }}>{devedor.nome[0]?.toUpperCase()}</div>
          <span>
            <div style={styles.devedorNome}>{devedor.nome}</div>
            <div style={styles.devedorSub}>{fmt(totalPendente)} pendente</div>
          </span>
        </span>
        <span style={styles.devedorPagoCount}>
          {totalPagas}/{parcelas.length} pago
        </span>
      </button>

      <div className={`q-expand${aberto ? " aberto" : ""}`}>
        <div style={{ paddingTop: aberto ? 12 : 0, overflow: "hidden" }}>
          <div style={styles.progressTrack}>
            <div className="q-bar-fill" style={{ ...styles.progressFill, width: `${progresso * 100}%`, background: cor }} />
          </div>

          <div style={{ ...styles.parcelasGrid, marginTop: 10 }}>
            {parcelasExibidas.map((parcela) => {
              const isPago = parcela.status === "pago";
              const isProximo = !isPago && parcela.id === parcelas[proximoIdx]?.id;
              const isEsteMes = parcela.mesReferencia === mesAtual;
              return (
                <button
                  className="q-btn"
                  key={parcela.id}
                  onClick={() => onTogglePago(parcela)}
                  style={{
                    ...styles.parcelaChip,
                    borderColor: isPago ? "var(--q-teal)" : isProximo ? "var(--q-orange)" : "var(--q-border-input)",
                    background: isPago ? "var(--q-success-tint)" : isProximo ? "var(--q-warning-tint)" : "transparent",
                  }}
                >
                  <span style={styles.parcelaMes}>
                    {mesLabel(parcela.mesReferencia)}
                    {isProximo && isEsteMes ? " · este mês" : ""}
                  </span>
                  <span style={styles.parcelaValor}>{fmt(parcela.valorCents)}</span>
                  {isPago ? <Check size={13} color="var(--q-teal)" /> : <Clock size={13} color={isProximo ? "var(--q-orange)" : "var(--q-text-muted)"} />}
                </button>
              );
            })}
            {!expandido && ocultas > 0 && (
              <span style={styles.chipMuted}>+ {ocultas} {ocultas === 1 ? "mês" : "meses"}</span>
            )}
          </div>

          <button className="q-btn" onClick={() => setExpandido((v) => !v)} style={styles.maisParcelasBtn}>
            {expandido ? "− parcelas" : "+ parcelas"}
          </button>

          {expandido && <AdicionarParcela devedorId={devedor.id} onAdded={onParcelaAdicionada} />}
        </div>
      </div>
    </div>
  );
}

function AdicionarParcela({ devedorId, onAdded }: { devedorId: string; onAdded: () => void }) {
  const [modoLote, setModoLote] = useState(false);
  const [mes, setMes] = useState(resolverMesAtual(null));
  const [valor, setValor] = useState("");
  const [quantidadeMeses, setQuantidadeMeses] = useState("12");

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!mes || !Number.isFinite(valorCents) || valorCents <= 0) return;

    if (modoLote) {
      const quantidade = Math.max(Number(quantidadeMeses) || 1, 1);
      await devedoresApi.upsertParcelasEmLote({ devedorId, valorCents, mesInicio: mes, quantidadeMeses: quantidade });
    } else {
      await devedoresApi.upsertParcela({ devedorId, mesReferencia: mes, valorCents });
    }
    setMes(resolverMesAtual(null));
    setValor("");
    onAdded();
  }

  return (
    <form onSubmit={adicionar} style={{ marginTop: 10 }}>
      <label style={{ ...styles.cardLabel, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <input type="checkbox" checked={modoLote} onChange={(e) => setModoLote(e.target.checked)} />
        vários meses seguidos com o mesmo valor
      </label>
      <div style={styles.formRow}>
        <Field label={modoLote ? "A partir de" : "Mês"}>
          <MesInput value={mes} onChange={setMes} />
        </Field>
        <Field label="Valor (R$)">
          <input placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
        </Field>
        {modoLote && (
          <Field label="Quantidade de meses">
            <input value={quantidadeMeses} onChange={(e) => setQuantidadeMeses(e.target.value)} style={styles.inputMono} />
          </Field>
        )}
        <button className="q-btn" type="submit" style={styles.buttonGhost}>
          + adicionar
        </button>
      </div>
    </form>
  );
}
