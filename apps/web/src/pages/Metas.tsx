import { useEffect, useState } from "react";
import {
  Car, ChevronRight, GraduationCap, Home, Pencil, Plane, Plus, ShieldAlert, ShoppingBag, Target, Trash2,
} from "lucide-react";
import { calcularAporteNecessario, calcularProgressoMeta, mesesRestantesMeta } from "@quitado/calc";
import { configApi, dashboardApi, metasApi } from "../api/resources.js";
import type { MetaAporteRow, MetaCategoria, MetaRow } from "../api/types.js";
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

function MetaCard({
  meta,
  mesAtual,
  saldoLivreCents,
  onMudou,
  onRemovida,
}: {
  meta: MetaRow;
  mesAtual: string;
  saldoLivreCents: number | null;
  onMudou: () => void;
  onRemovida: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<MetaAporteRow[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(meta.nome);
  const [categoria, setCategoria] = useState<MetaCategoria>(meta.categoria);
  const [valorAlvo, setValorAlvo] = useState(String(meta.valorAlvoCents / 100));
  const [prazo, setPrazo] = useState(meta.prazo);
  const [aporteValor, setAporteValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { label, cor, Icon } = CATEGORIA_INFO[meta.categoria];
  const progresso = calcularProgressoMeta(meta);
  const concluida = progresso.percentual >= 1;

  function carregarHistorico() {
    metasApi.listarAportes(meta.id).then(setHistorico);
  }

  function alternar() {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (abrindo && historico === null) carregarHistorico();
  }

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
    <div className="q-surface" style={{ border: "1px solid var(--q-border)", borderRadius: 12, overflow: "hidden" }}>
      <button
        className="q-btn"
        onClick={alternar}
        style={{
          width: "100%", display: "flex", flexDirection: "column", gap: 8,
          padding: "12px 14px", background: "var(--q-inset-bg)", border: "none",
          cursor: "pointer", color: "var(--q-text)", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ChevronRight className={`q-chevron${aberto ? " aberto" : ""}`} size={15} color={cor} style={{ flexShrink: 0 }} />
          <div
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex",
              alignItems: "center", justifyContent: "center", background: "var(--q-card-bg)",
            }}
          >
            <Icon size={15} color={cor} />
          </div>
          <span style={{ flex: 1, minWidth: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {meta.nome}
          </span>
          {concluida && (
            <span style={{ fontSize: "var(--fs-tiny)", fontWeight: 700, color: "var(--q-teal)", background: "var(--q-success-tint)", border: "1px solid var(--q-teal)", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>
              Concluída ✓
            </span>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-sm)", fontWeight: 600, flexShrink: 0 }}>
            {(progresso.percentual * 100).toFixed(0)}%
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${Math.min(progresso.percentual, 1) * 100}%`, background: cor }} />
        </div>
        <div style={{ ...styles.cardFoot, display: "flex", justifyContent: "space-between" }}>
          <span>{fmt(meta.acumuladoCents)} de {fmt(meta.valorAlvoCents)}</span>
          <span>{concluida ? "concluída" : `até ${mesLabel(meta.prazo)}`}</span>
        </div>
      </button>

      <div className={`q-expand${aberto ? " aberto" : ""}`}>
        <div style={{ padding: aberto ? "14px" : "0 14px", overflow: "hidden" }}>
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
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)" }}>guardado</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: cor }}>{fmt(meta.acumuladoCents)}</div>
                </div>
                <div style={{ flex: 1, background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)" }}>falta</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(progresso.restanteCents)}</div>
                </div>
              </div>

              {!concluida && historico !== null && (
                <div style={{ ...styles.panel, background: "var(--q-card-bg)", padding: 10, marginBottom: 14, border: `1px solid ${cabeNoSaldo === false ? "var(--q-orange)" : "var(--q-border-input)"}` }}>
                  <div style={styles.cardFoot}>
                    Pra bater em {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}, guarde
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: cor, marginTop: 2 }}>{fmt(aporteSugeridoCents)}/mês</div>
                  {mesAtualJaContemplado ? (
                    <div style={{ ...styles.cardFoot, color: "var(--q-teal)", marginTop: 4 }}>{fmt(historico.find((h) => h.mesReferencia === mesAtual)?.valorCents ?? 0)} guardado este mês ✓</div>
                  ) : (
                    <>
                      {cabeNoSaldo !== null && (
                        <div style={{ ...styles.cardFoot, color: cabeNoSaldo ? "var(--q-teal)" : "var(--q-orange)", marginTop: 4 }}>
                          {cabeNoSaldo ? "cabe no seu saldo livre atual" : "é mais do que sobra hoje no orçamento"}
                        </div>
                      )}
                      <button
                        className="q-btn" type="button"
                        disabled={salvando}
                        style={{ ...styles.buttonGhost, marginTop: 8, width: "100%", padding: "7px 10px", fontSize: 11 }}
                        onClick={() => guardarAporte(aporteSugeridoCents)}
                      >
                        {salvando ? "Guardando..." : `Guardar ${fmt(aporteSugeridoCents)} este mês`}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div style={styles.formRow}>
                <Field label="Guardar outro valor (R$)">
                  <input placeholder="0,00" value={aporteValor} onChange={(e) => setAporteValor(e.target.value)} style={styles.inputMono} />
                </Field>
                <button
                  className="q-btn" type="button" disabled={salvando}
                  style={{ ...styles.buttonGhost, alignSelf: "flex-end" }}
                  onClick={() => guardarAporte(Math.round(Number(aporteValor.replace(",", ".")) * 100) || 0)}
                >
                  Guardar
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10, marginBottom: 4 }}>
                <button className="q-btn" style={{ ...styles.buttonGhost, flex: 1 }} onClick={() => setEditando(true)}>
                  <Pencil size={13} color="var(--q-blue)" style={{ marginRight: 5, verticalAlign: -2 }} />
                  Editar
                </button>
                <button className="q-btn" style={{ ...styles.buttonGhost, flex: 1 }} onClick={remover}>
                  <Trash2 size={13} color="var(--q-orange)" style={{ marginRight: 5, verticalAlign: -2 }} />
                  Excluir meta
                </button>
              </div>

              <div style={{ ...styles.panelHint, marginTop: 10, marginBottom: 4, fontWeight: 600 }}>Histórico</div>
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
            </>
          )}
        </div>
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
          border: "1.5px dashed var(--q-border-input)", borderRadius: 12, padding: 14,
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
    <form onSubmit={criar} className="q-surface" style={{ ...styles.panel, padding: 14 }}>
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
          <MetaCard key={m.id} meta={m} mesAtual={mesAtual} saldoLivreCents={saldoLivreCents} onMudou={carregarMetas} onRemovida={carregarMetas} />
        ))}
        <NovaMeta onCriada={carregarMetas} />
      </div>
    </>
  );
}
