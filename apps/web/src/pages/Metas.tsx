import { useEffect, useState } from "react";
import {
  Car, GraduationCap, Home, Pencil, Plane, Plus, ShieldAlert, ShoppingBag, Target, Trash2, X,
} from "lucide-react";
import { calcularAporteNecessario, calcularProgressoMeta, mesesRestantesMeta } from "@quitado/calc";
import { configApi, dashboardApi, metasApi } from "../api/resources.js";
import type { MetaAporteRow, MetaCategoria, MetaRow } from "../api/types.js";
import { BarraProgresso } from "../components/BarraProgresso.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

const CATEGORIA_INFO: Record<MetaCategoria, { label: string; cor: string; Icon: typeof Target }> = {
  viagem: { label: "Viagem", cor: "var(--q-teal)", Icon: Plane },
  carro: { label: "Carro", cor: "var(--q-blue)", Icon: Car },
  casa: { label: "Casa", cor: "var(--q-gold)", Icon: Home },
  educacao: { label: "Educação", cor: "var(--q-purple)", Icon: GraduationCap },
  compra: { label: "Compra", cor: "var(--q-rose)", Icon: ShoppingBag },
  emergencia: { label: "Emergência", cor: "var(--q-orange)", Icon: ShieldAlert },
  outro: { label: "Outro", cor: "var(--q-text-muted)", Icon: Target },
};

function IconeMeta({ categoria, tamanho = 34 }: { categoria: MetaCategoria; tamanho?: number }) {
  const { cor, Icon } = CATEGORIA_INFO[categoria];
  return (
    <div
      style={{
        width: tamanho, height: tamanho, borderRadius: tamanho >= 40 ? 12 : 10, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${cor} 16%, transparent)`,
      }}
    >
      <Icon size={Math.round(tamanho * 0.46)} color={cor} />
    </div>
  );
}

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

function MetaCardResumo({ meta, onAbrir }: { meta: MetaRow; onAbrir: () => void }) {
  const { cor } = CATEGORIA_INFO[meta.categoria];
  const progresso = calcularProgressoMeta(meta);
  const concluida = progresso.percentual >= 1;

  return (
    <button
      className="q-btn"
      onClick={onAbrir}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer", color: "var(--q-text)",
        background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 16,
        padding: 14, display: "flex", flexDirection: "column", gap: 10,
        boxShadow: "0 1px 0 var(--q-shadow-inset, rgba(255,255,255,0.03)) inset",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <IconeMeta categoria={meta.categoria} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta.nome}
          </div>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--q-text-faint)" }}>{(progresso.percentual * 100).toFixed(0)}% guardado</div>
        </div>
        {concluida && (
          <span style={{ fontSize: "var(--fs-tiny)", fontWeight: 700, color: "var(--q-teal)", background: "var(--q-success-tint)", border: "1px solid var(--q-teal)", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>
            Concluída ✓
          </span>
        )}
      </div>
      <BarraProgresso progresso={Math.min(progresso.percentual, 1) * 100} cor={cor} />
      <div style={{ ...styles.cardFoot, display: "flex", justifyContent: "space-between" }}>
        <span className="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(meta.acumuladoCents)} / {fmt(meta.valorAlvoCents)}</span>
        <span>{concluida ? "concluída" : `até ${mesLabel(meta.prazo)}`}</span>
      </div>
    </button>
  );
}

function MetaSheet({
  meta,
  mesAtual,
  saldoLivreCents,
  onFechar,
  onMudou,
  onRemovida,
}: {
  meta: MetaRow;
  mesAtual: string;
  saldoLivreCents: number | null;
  onFechar: () => void;
  onMudou: () => void;
  onRemovida: () => void;
}) {
  const [historico, setHistorico] = useState<MetaAporteRow[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(meta.nome);
  const [categoria, setCategoria] = useState<MetaCategoria>(meta.categoria);
  const [valorAlvo, setValorAlvo] = useState(String(meta.valorAlvoCents / 100));
  const [prazo, setPrazo] = useState(meta.prazo);
  const [aporteValor, setAporteValor] = useState("");
  const [aportando, setAportando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { cor } = CATEGORIA_INFO[meta.categoria];
  const progresso = calcularProgressoMeta(meta);
  const concluida = progresso.percentual >= 1;

  function carregarHistorico() {
    metasApi.listarAportes(meta.id).then(setHistorico);
  }

  useEffect(() => {
    carregarHistorico();
    setEditando(false);
    setNome(meta.nome);
    setCategoria(meta.categoria);
    setValorAlvo(String(meta.valorAlvoCents / 100));
    setPrazo(meta.prazo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.id]);

  const mesAtualJaContemplado = historico?.some((h) => h.mesReferencia === mesAtual) ?? false;
  const aporteSugeridoCents = calcularAporteNecessario(meta, mesAtual, mesAtualJaContemplado);
  const mesesRestantes = mesesRestantesMeta(meta.prazo, mesAtual, mesAtualJaContemplado);
  const cabeNoSaldo = saldoLivreCents !== null ? aporteSugeridoCents <= saldoLivreCents : null;

  async function guardarAporte(valorCents: number) {
    if (valorCents <= 0) return;
    setSalvando(true);
    try {
      await metasApi.registrarAporte(meta.id, { mesReferencia: mesAtual, valorCents });
      setAporteValor("");
      setAportando(false);
      carregarHistorico();
      onMudou();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await metasApi.atualizar(meta.id, {
      nome: nome.trim(),
      categoria,
      valorAlvoCents: Math.round(Number(valorAlvo.replace(",", ".")) * 100),
      prazo,
    });
    setEditando(false);
    onMudou();
  }

  async function remover() {
    if (!window.confirm(`Excluir a meta "${meta.nome}"? O histórico de aportes dela some junto.`)) return;
    await metasApi.remover(meta.id);
    onRemovida();
  }

  async function salvarEdicaoAporte(id: string, patch: { mesReferencia: string; valorCents: number }) {
    await metasApi.editarAporte(meta.id, id, patch);
    carregarHistorico();
    onMudou();
  }

  async function removerAporte(id: string) {
    await metasApi.removerAporte(meta.id, id);
    carregarHistorico();
    onMudou();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--q-scrim, rgba(5,8,16,0.65))",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div
        className="q-tab-fade"
        style={{
          width: "100%", maxWidth: "var(--app-max-width)", maxHeight: "88vh", overflowY: "auto",
          background: "var(--q-bg)", border: "1px solid var(--q-border)", borderBottom: "none",
          borderRadius: "20px 20px 0 0", padding: "10px 18px 22px",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 3, background: "var(--q-border-input)", margin: "0 auto 14px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <IconeMeta categoria={meta.categoria} tamanho={44} />
          <div style={{ flex: 1, minWidth: 0, fontSize: "var(--fs-lg)", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta.nome}
          </div>
          <button
            className="q-btn"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--q-border)", background: "var(--q-card-bg)", color: "var(--q-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        <BarraProgresso progresso={Math.min(progresso.percentual, 1) * 100} cor={cor} />

        <div style={{ display: "flex", gap: 8, margin: "14px 0 18px" }}>
          <div style={{ flex: 1, background: "var(--q-inset-bg)", border: "1px solid var(--q-border)", borderRadius: 12, padding: "9px 11px" }}>
            <div style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>guardado</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: cor }}>{fmt(meta.acumuladoCents)}</div>
          </div>
          <div style={{ flex: 1, background: "var(--q-inset-bg)", border: "1px solid var(--q-border)", borderRadius: 12, padding: "9px 11px" }}>
            <div style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>alvo</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(meta.valorAlvoCents)}</div>
          </div>
          <div style={{ flex: 1, background: "var(--q-inset-bg)", border: "1px solid var(--q-border)", borderRadius: 12, padding: "9px 11px" }}>
            <div style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>falta</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{fmt(progresso.restanteCents)}</div>
          </div>
        </div>

        {!concluida && !mesAtualJaContemplado && historico !== null && !aportando && (
          <div style={{ ...styles.panelHint, marginBottom: 8 }}>
            Pra bater em {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}, guarde{" "}
            <span style={{ color: cor, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(aporteSugeridoCents)}/mês</span>
            {cabeNoSaldo !== null && (cabeNoSaldo ? " · cabe no seu saldo livre" : " · é mais do que sobra hoje no orçamento")}
          </div>
        )}

        {mesAtualJaContemplado && (
          <div style={{ ...styles.panelHint, color: "var(--q-teal)", marginBottom: 8 }}>
            {fmt(historico?.find((h) => h.mesReferencia === mesAtual)?.valorCents ?? 0)} guardado este mês ✓
          </div>
        )}

        {aportando ? (
          <div style={{ ...styles.formRow, marginBottom: 18, alignItems: "flex-end" }}>
            <Field label="Valor (R$)">
              <input autoFocus placeholder={String(aporteSugeridoCents / 100)} value={aporteValor} onChange={(e) => setAporteValor(e.target.value)} style={styles.inputMono} />
            </Field>
            <button className="q-btn" type="button" style={styles.buttonGhost} onClick={() => setAportando(false)}>
              Cancelar
            </button>
            <button
              className="q-btn" type="button" disabled={salvando}
              style={{ ...styles.button, background: cor }}
              onClick={() => guardarAporte(Math.round(Number(aporteValor.replace(",", ".")) * 100) || aporteSugeridoCents)}
            >
              {salvando ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        ) : (
          !concluida && (
            <button
              className="q-btn" type="button"
              style={{ ...styles.button, width: "100%", marginBottom: 18, background: cor }}
              onClick={() => setAportando(true)}
            >
              Guardar aporte nessa meta
            </button>
          )
        )}

        {editando ? (
          <form onSubmit={salvarEdicao} style={{ marginBottom: 14 }}>
            <div style={styles.formRow}>
              <Field label="Nome">
                <input value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
              </Field>
              <Field label="Categoria">
                <select value={categoria} onChange={(e) => setCategoria(e.target.value as MetaCategoria)} style={{ ...styles.input, width: "100%" }}>
                  {(Object.keys(CATEGORIA_INFO) as MetaCategoria[]).map((c) => (
                    <option key={c} value={c}>{CATEGORIA_INFO[c].label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={styles.formRow}>
              <Field label="Valor alvo (R$)">
                <input value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} style={styles.inputMono} />
              </Field>
              <Field label="Prazo">
                <MesInput value={prazo} onChange={setPrazo} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="q-btn" type="button" style={{ ...styles.buttonGhost, flex: 1 }} onClick={() => setEditando(false)}>
                Cancelar
              </button>
              <button className="q-btn" type="submit" style={{ ...styles.button, flex: 1 }}>
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button className="q-btn" style={{ ...styles.buttonGhost, flex: 1 }} onClick={() => setEditando(true)}>
              <Pencil size={13} color="var(--q-blue)" style={{ marginRight: 5, verticalAlign: -2 }} />
              Editar
            </button>
            <button className="q-btn" style={{ ...styles.buttonGhost, flex: 1 }} onClick={remover}>
              <Trash2 size={13} color="var(--q-orange)" style={{ marginRight: 5, verticalAlign: -2 }} />
              Excluir meta
            </button>
          </div>
        )}

        <div style={{ fontSize: "var(--fs-xs)", color: "var(--q-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Histórico de aportes
        </div>
        {historico === null ? (
          <div style={styles.panelHint}>Carregando...</div>
        ) : historico.length === 0 ? (
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
  );
}

function NovaMeta({ onCriada }: { onCriada: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<MetaCategoria>("outro");
  const [valorAlvo, setValorAlvo] = useState("");
  const [prazo, setPrazo] = useState("");

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !prazo) return;
    await metasApi.criar({
      nome: nome.trim(),
      categoria,
      valorAlvoCents: Math.round(Number(valorAlvo.replace(",", ".")) * 100) || 0,
      prazo,
    });
    setNome("");
    setCategoria("outro");
    setValorAlvo("");
    setPrazo("");
    setAberto(false);
    onCriada();
  }

  if (!aberto) {
    return (
      <button
        className="q-btn"
        onClick={() => setAberto(true)}
        style={{
          border: "1.5px dashed var(--q-border-input)", borderRadius: 16, padding: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          color: "var(--q-text-muted)", fontWeight: 600, fontSize: "var(--fs-sm)",
          background: "transparent", cursor: "pointer", width: "100%",
        }}
      >
        <Plus size={15} />
        Nova meta
      </button>
    );
  }

  return (
    <form onSubmit={criar} className="q-surface" style={{ ...styles.panel, padding: 14, borderRadius: 16 }}>
      <div style={styles.formRow}>
        <Field label="Nome">
          <input placeholder="ex: Viagem pra Europa" value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} autoFocus />
        </Field>
        <Field label="Categoria">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as MetaCategoria)} style={{ ...styles.input, width: "100%" }}>
            {(Object.keys(CATEGORIA_INFO) as MetaCategoria[]).map((c) => (
              <option key={c} value={c}>{CATEGORIA_INFO[c].label}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={styles.formRow}>
        <Field label="Valor alvo (R$)">
          <input placeholder="10000" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} style={styles.inputMono} />
        </Field>
        <Field label="Prazo">
          <MesInput value={prazo} onChange={setPrazo} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="q-btn" type="button" style={{ ...styles.buttonGhost, flex: 1 }} onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button className="q-btn" type="submit" style={{ ...styles.button, flex: 1 }}>
          Criar meta
        </button>
      </div>
    </form>
  );
}

export function Metas() {
  const [metas, setMetas] = useState<MetaRow[]>([]);
  const [mesAtual, setMesAtual] = useState<string | null>(null);
  const [saldoLivreCents, setSaldoLivreCents] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [metaAbertaId, setMetaAbertaId] = useState<string | null>(null);

  function carregarMetas() {
    metasApi.listar().then(setMetas);
  }

  useEffect(() => {
    Promise.all([metasApi.listar(), configApi.obter(), dashboardApi.obter()])
      .then(([m, config, dashboard]) => {
        setMetas(m);
        setMesAtual(config.mesAtual);
        setSaldoLivreCents(dashboard.saldoMesAtual?.saldoCents ?? null);
      })
      .finally(() => setCarregando(false));
  }, []);

  if (carregando || !mesAtual) return <div style={styles.panelHint}>Carregando...</div>;

  const guardadoTotalCents = metas.reduce((s, m) => s + m.acumuladoCents, 0);
  const metaAberta = metas.find((m) => m.id === metaAbertaId) ?? null;

  return (
    <>
      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Metas</h3>
          <span style={styles.panelHint}>{metas.length === 0 ? "nenhuma ainda" : `${metas.length} ${metas.length === 1 ? "meta" : "metas"}`}</span>
        </div>
        {metas.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ ...styles.cardFoot, marginBottom: 2 }}>guardado no total, somando todas as metas</div>
            <div style={{ ...styles.cardValue, color: "var(--q-teal)", marginBottom: 0 }}>{fmt(guardadoTotalCents)}</div>
          </div>
        )}
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {metas.map((m) => (
          <MetaCardResumo key={m.id} meta={m} onAbrir={() => setMetaAbertaId(m.id)} />
        ))}
        <NovaMeta onCriada={carregarMetas} />
      </div>

      {metaAberta && (
        <MetaSheet
          key={metaAberta.id}
          meta={metaAberta}
          mesAtual={mesAtual}
          saldoLivreCents={saldoLivreCents}
          onFechar={() => setMetaAbertaId(null)}
          onMudou={carregarMetas}
          onRemovida={() => {
            setMetaAbertaId(null);
            carregarMetas();
          }}
        />
      )}
    </>
  );
}
