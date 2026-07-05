import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { resolverMesAtual } from "@quitado/calc";
import { devedoresApi } from "../api/resources.js";
import type { DevedorRow, ParcelaDevedorRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

const CORES = ["var(--q-orange)", "var(--q-teal)", "var(--q-blue)", "var(--q-purple)", "var(--q-rose)", "var(--q-gold)"];

export function QuemMeDeve() {
  const [devedores, setDevedores] = useState<DevedorRow[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaDevedorRow[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [carregando, setCarregando] = useState(true);

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

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Quem me deve</h3>
        <span style={styles.panelHint}>marca como pago quando cair na conta</span>
      </div>

      <form onSubmit={adicionarDevedor} style={styles.formRow}>
        <Field label="Nome da pessoa">
          <input placeholder="ex: Wesley" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={styles.input} />
        </Field>
        <button className="q-btn" type="submit" style={styles.button}>
          Adicionar
        </button>
      </form>

      {devedores.map((dev, i) => {
        const parcelasDoDevedor = parcelas
          .filter((p) => p.devedorId === dev.id)
          .sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
        const totalPendente = parcelasDoDevedor
          .filter((p) => p.status === "pendente")
          .reduce((acc, p) => acc + p.valorCents, 0);
        const cor = dev.corHex ?? CORES[i % CORES.length]!;

        return (
          <div key={dev.id} style={styles.devedorBlock}>
            <div style={styles.devedorHead}>
              <div style={{ ...styles.avatar, background: cor }}>{dev.nome[0]?.toUpperCase()}</div>
              <div>
                <div style={styles.devedorNome}>{dev.nome}</div>
                <div style={styles.devedorSub}>{fmt(totalPendente)} pendente</div>
              </div>
            </div>
            <div style={styles.parcelasGrid}>
              {parcelasDoDevedor.map((parcela) => {
                const isPago = parcela.status === "pago";
                return (
                  <button
        className="q-btn"
                    key={parcela.id}
                    onClick={() => alternarPago(parcela)}
                    style={{
                      ...styles.parcelaChip,
                      borderColor: isPago ? "var(--q-teal)" : "var(--q-border-input)",
                      background: isPago ? "var(--q-success-tint)" : "transparent",
                    }}
                  >
                    <span style={styles.parcelaMes}>{mesLabel(parcela.mesReferencia)}</span>
                    <span style={styles.parcelaValor}>{fmt(parcela.valorCents)}</span>
                    {isPago ? <Check size={13} color="var(--q-teal)" /> : <Clock size={13} color="var(--q-text-muted)" />}
                  </button>
                );
              })}
            </div>
            <AdicionarParcela devedorId={dev.id} onAdded={carregar} />
          </div>
        );
      })}
    </section>
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
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={styles.inputMono} />
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
