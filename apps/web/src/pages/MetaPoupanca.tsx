import { useEffect, useState } from "react";
import { calcularAporteNecessario, calcularProgressoMeta, mesesRestantesMeta } from "@quitado/calc";
import { configApi, dashboardApi, metaPoupancaApi } from "../api/resources.js";
import type { MetaPoupancaRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

export function MetaPoupanca() {
  const [meta, setMeta] = useState<MetaPoupancaRow | null>(null);
  const [mesAtual, setMesAtual] = useState<string | null>(null);
  const [saldoLivreCents, setSaldoLivreCents] = useState<number | null>(null);
  const [valorAlvo, setValorAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [aporteMensal, setAporteMensal] = useState("");
  const [acumulado, setAcumulado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([metaPoupancaApi.obter(), configApi.obter(), dashboardApi.obter()])
      .then(([m, config, dashboard]) => {
        setMeta(m);
        setMesAtual(config.mesAtual);
        setSaldoLivreCents(dashboard.saldoMesAtual?.saldoCents ?? null);
        if (m) {
          setValorAlvo(String(m.valorAlvoCents / 100));
          setPrazo(m.prazo);
          setAporteMensal(String(m.aporteMensalCents / 100));
          setAcumulado(String(m.acumuladoCents / 100));
        }
      })
      .finally(() => setCarregando(false));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      // "Aporte mês atual" é o valor que você acabou de reservar agora — ao
      // salvar, soma no acumulado (não é um valor planejado estático).
      const aporteMesAtualCents = Math.round(Number(aporteMensal.replace(",", ".")) * 100) || 0;
      const acumuladoAtualCents = Math.round(Number(acumulado.replace(",", ".")) * 100) || 0;
      const novoAcumuladoCents = acumuladoAtualCents + aporteMesAtualCents;

      const atualizado = await metaPoupancaApi.atualizar({
        valorAlvoCents: Math.round(Number(valorAlvo.replace(",", ".")) * 100),
        prazo,
        aporteMensalCents: 0,
        acumuladoCents: novoAcumuladoCents,
      });
      setMeta(atualizado);
      setAcumulado(String(atualizado.acumuladoCents / 100));
      setAporteMensal("");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div style={styles.panelHint}>Carregando...</div>;

  const progresso = meta ? calcularProgressoMeta(meta) : null;

  // Recalcula em cima dos campos do formulário (não só do que já foi salvo),
  // pra já mostrar a sugestão certa enquanto o usuário ainda está digitando.
  const metaRascunho: MetaPoupancaRow | null =
    mesAtual && valorAlvo && prazo
      ? {
          valorAlvoCents: Math.round(Number(valorAlvo.replace(",", ".")) * 100) || 0,
          prazo,
          aporteMensalCents: 0,
          acumuladoCents: Math.round(Number(acumulado.replace(",", ".")) * 100) || 0,
        }
      : null;
  const aporteSugeridoCents = metaRascunho && mesAtual ? calcularAporteNecessario(metaRascunho, mesAtual) : null;
  const mesesRestantes = metaRascunho && mesAtual ? mesesRestantesMeta(metaRascunho.prazo, mesAtual) : null;
  const cabeNoSaldo =
    aporteSugeridoCents !== null && saldoLivreCents !== null ? aporteSugeridoCents <= saldoLivreCents : null;

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Meta de poupança</h3>
        <span style={styles.panelHint}>acompanhamento de aporte mensal planejado</span>
      </div>

      {progresso && meta && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...styles.cardValue, color: "var(--q-purple)" }}>{(progresso.percentual * 100).toFixed(1)}%</div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${Math.min(progresso.percentual, 1) * 100}%`, background: "var(--q-purple)" }} />
          </div>
          <div style={styles.cardFoot}>
            {fmt(meta.acumuladoCents)} acumulado de {fmt(meta.valorAlvoCents)} — faltam {fmt(progresso.restanteCents)}
          </div>
        </div>
      )}

      {aporteSugeridoCents !== null && mesesRestantes !== null && (
        <div
          style={{
            ...styles.panel,
            background: "var(--q-inset-bg)",
            padding: 12,
            marginBottom: 14,
            border: `1px solid ${cabeNoSaldo === false ? "var(--q-orange)" : "var(--q-border-input)"}`,
          }}
        >
          <div style={styles.cardFoot}>
            Para bater essa meta em {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}, você precisa guardar
          </div>
          <div style={{ ...styles.cardValue, color: "var(--q-teal)", marginTop: 2 }}>{fmt(aporteSugeridoCents)}/mês</div>
          {cabeNoSaldo !== null && (
            <div style={{ ...styles.cardFoot, color: cabeNoSaldo ? "var(--q-teal)" : "var(--q-orange)", marginTop: 4 }}>
              {cabeNoSaldo
                ? `Cabe no seu saldo livre atual (${fmt(saldoLivreCents!)}/mês).`
                : `Isso é mais do que sobra hoje no seu orçamento (saldo livre: ${fmt(saldoLivreCents!)}/mês) — considere esticar o prazo.`}
            </div>
          )}
          <button
        className="q-btn"
            type="button"
            style={{ ...styles.buttonGhost, marginTop: 8, fontSize: 11, padding: "6px 10px" }}
            onClick={() => setAporteMensal(String(aporteSugeridoCents / 100))}
          >
            Usar este valor no aporte deste mês
          </button>
        </div>
      )}

      <form onSubmit={salvar}>
        <div style={styles.formRow}>
          <Field label="Valor alvo (R$)">
            <input placeholder="10000" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Prazo">
            <input type="month" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={styles.formRow}>
          <Field label="Aporte mês atual (R$)">
            <input placeholder="0,00" value={aporteMensal} onChange={(e) => setAporteMensal(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Já acumulado (R$)">
            <input placeholder="0,00" value={acumulado} onChange={(e) => setAcumulado(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={{ ...styles.panelHint, marginBottom: 10 }}>
          "Aporte mês atual" é o quanto você acabou de guardar agora — ao salvar, soma automaticamente no "Já acumulado".
        </div>
        <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%" }} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar meta"}
        </button>
      </form>
    </section>
  );
}
