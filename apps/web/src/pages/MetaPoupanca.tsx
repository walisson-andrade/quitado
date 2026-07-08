import { useEffect, useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { calcularAporteNecessario, calcularProgressoMeta, mesesRestantesMeta } from "@quitado/calc";
import { configApi, dashboardApi, metaPoupancaApi } from "../api/resources.js";
import type { MetaAporteRow, MetaPoupancaRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

function LinhaHistoricoAporte({
  item,
  onSalvarEdicao,
  onRemover,
}: {
  item: MetaAporteRow;
  onSalvarEdicao: (patch: { mesReferencia: string; valorCents: number }) => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [mesReferencia, setMesReferencia] = useState(item.mesReferencia);
  const [valor, setValor] = useState(String(item.valorCents / 100));

  function salvar() {
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!mesReferencia || !Number.isFinite(valorCents) || valorCents <= 0) return;
    onSalvarEdicao({ mesReferencia, valorCents });
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={styles.formRow}>
          <Field label="Mês">
            <MesInput value={mesReferencia} onChange={setMesReferencia} />
          </Field>
          <Field label="Valor (R$)">
            <input value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="q-btn" style={{ ...styles.buttonGhost, flex: 1 }} onClick={() => setEditando(false)}>
            Cancelar
          </button>
          <button className="q-btn" style={{ ...styles.button, flex: 1 }} onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.listRow}>
      <span>{mesLabel(item.mesReferencia)}</span>
      <div style={styles.listRowActions}>
        <span style={{ ...styles.parcelaValor, color: "var(--q-teal)" }}>{fmt(item.valorCents)}</span>
        <button className="q-btn" style={{ ...styles.buttonGhost, padding: 8 }} onClick={() => setEditando(true)} aria-label="Editar">
          <Pencil size={14} color="var(--q-blue)" />
        </button>
        <button className="q-btn" style={{ ...styles.buttonGhost, padding: 8 }} onClick={onRemover} aria-label="Remover">
          <Trash2 size={14} color="var(--q-orange)" />
        </button>
      </div>
    </div>
  );
}

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
  const [historico, setHistorico] = useState<MetaAporteRow[]>([]);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  function carregarHistorico() {
    metaPoupancaApi.listarAportes().then(setHistorico);
  }

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
    carregarHistorico();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      // "Aporte mês atual" é o valor que você acabou de reservar agora — vira
      // um registro no histórico (com o mês) e soma no acumulado no servidor,
      // pra não ter risco de somar duas vezes se o campo "Já acumulado" também
      // mudou nessa mesma tela.
      const aporteMesAtualCents = Math.round(Number(aporteMensal.replace(",", ".")) * 100) || 0;
      let acumuladoCents = Math.round(Number(acumulado.replace(",", ".")) * 100) || 0;

      if (aporteMesAtualCents > 0 && mesAtual) {
        const { meta: metaAposAporte } = await metaPoupancaApi.registrarAporte({
          mesReferencia: mesAtual,
          valorCents: aporteMesAtualCents,
        });
        acumuladoCents = metaAposAporte.acumuladoCents;
      }

      const atualizado = await metaPoupancaApi.atualizar({
        valorAlvoCents: Math.round(Number(valorAlvo.replace(",", ".")) * 100),
        prazo,
        aporteMensalCents: 0,
        acumuladoCents,
      });
      setMeta(atualizado);
      setAcumulado(String(atualizado.acumuladoCents / 100));
      setAporteMensal("");
      carregarHistorico();
    } finally {
      setSalvando(false);
    }
  }

  // Editar/remover um aporte do histórico ajusta o acumulado no servidor
  // (ex: precisou tirar parte da grana pra uma emergência) — refletimos o
  // "Já acumulado" de volta aqui pra tela e a meta ficarem consistentes.
  async function salvarEdicaoAporte(id: string, patch: { mesReferencia: string; valorCents: number }) {
    const { meta: metaAtualizada } = await metaPoupancaApi.editarAporte(id, patch);
    setMeta(metaAtualizada);
    setAcumulado(String(metaAtualizada.acumuladoCents / 100));
    carregarHistorico();
  }

  async function removerAporte(id: string) {
    const { meta: metaAtualizada } = await metaPoupancaApi.removerAporte(id);
    setMeta(metaAtualizada);
    setAcumulado(String(metaAtualizada.acumuladoCents / 100));
    carregarHistorico();
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
  // Já existe aporte salvo pro mês atual no histórico? Se sim, esse mês já
  // está contabilizado no acumulado e não entra de novo na conta de meses
  // restantes — não usa o campo "Aporte mês atual" (ainda não salvo), senão
  // a sugestão mudaria sozinha assim que o usuário começasse a digitar nele.
  const mesAtualJaContemplado = mesAtual ? historico.some((h) => h.mesReferencia === mesAtual) : false;
  const aporteSugeridoCents =
    metaRascunho && mesAtual ? calcularAporteNecessario(metaRascunho, mesAtual, mesAtualJaContemplado) : null;
  const mesesRestantes =
    metaRascunho && mesAtual ? mesesRestantesMeta(metaRascunho.prazo, mesAtual, mesAtualJaContemplado) : null;
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
            <MesInput value={prazo} onChange={setPrazo} />
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

      <button
        className="q-btn"
        type="button"
        onClick={() => setHistoricoAberto((v) => !v)}
        style={{ ...styles.maisParcelasBtn, marginTop: 14, display: "flex", alignItems: "center", gap: 4 }}
      >
        <ChevronRight className={`q-chevron${historicoAberto ? " aberto" : ""}`} size={13} color="var(--q-text-muted)" />
        histórico do que já guardei
      </button>

      <div className={`q-expand${historicoAberto ? " aberto" : ""}`}>
        <div style={{ paddingTop: historicoAberto ? 10 : 0, overflow: "hidden" }}>
          {historico.length === 0 ? (
            <div style={styles.panelHint}>Nenhum aporte registrado ainda.</div>
          ) : (
            historico.map((item) => (
              <LinhaHistoricoAporte
                key={item.id}
                item={item}
                onSalvarEdicao={(patch) => salvarEdicaoAporte(item.id, patch)}
                onRemover={() => removerAporte(item.id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
