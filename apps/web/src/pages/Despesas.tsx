import { useEffect, useState } from "react";
import { Coins, Pencil, Trash2 } from "lucide-react";
import { CATEGORIA_LABEL, categorizarAutomaticamente, parcelamentoContaNoMes, resolverMesAtual } from "@quitado/calc";
import { configApi, despesaFixaOverridesApi, despesasFixasApi, faturasApi, parcelamentosApi } from "../api/resources.js";
import type { DespesaFixaOverrideRow, DespesaFixaRow, ParcelamentoRow } from "../api/types.js";
import { CategoriaSelect } from "../components/CategoriaSelect.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { corPorOrigem } from "../components/OrigemChart.js";
import { GrupoExpansivel } from "../components/GrupoExpansivel.js";
import { fmt, mesLabel } from "../format.js";
import { styles } from "../styles.js";

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

function CategoriaMiniSelect({ nome, valor, onChange }: { nome: string; valor: string | null; onChange: (v: string | null) => void }) {
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        ...styles.buttonGhost,
        padding: "6px 8px",
        fontFamily: "'Inter', sans-serif",
        fontSize: "var(--fs-xs)",
        width: 168,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title="Categoria"
    >
      <option value="" style={optionStyle}>auto: {CATEGORIA_LABEL[categorizarAutomaticamente(nome)]}</option>
      {Object.entries(CATEGORIA_LABEL).map(([slug, label]) => (
        <option key={slug} value={slug} style={optionStyle}>
          {label}
        </option>
      ))}
    </select>
  );
}

function LinhaParcelamento({
  item,
  onMudarCategoria,
  onSalvarEdicao,
  onRemover,
}: {
  item: ParcelamentoRow;
  onMudarCategoria: (categoria: string | null) => void;
  onSalvarEdicao: (patch: {
    nome: string;
    valorParcelaCents: number;
    parcelaAtual: number;
    parcelaTotal: number;
    continuaIndefinidamente: boolean;
    diaVencimento: number | null;
  }) => void;
  onRemover: () => void;
}) {
  const ehManual = item.origem === "manual" || item.origem == null;
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [valor, setValor] = useState(String(item.valorParcelaCents / 100));
  const [parcelaAtual, setParcelaAtual] = useState(String(item.parcelaAtual));
  const [parcelaTotal, setParcelaTotal] = useState(String(item.parcelaTotal));
  const [continuaIndefinidamente, setContinuaIndefinidamente] = useState(item.continuaIndefinidamente);
  const [diaVencimento, setDiaVencimento] = useState(item.diaVencimento ? String(item.diaVencimento) : "");

  function salvar() {
    const valorParcelaCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorParcelaCents) || valorParcelaCents <= 0) return;
    const dia = diaVencimento.trim() ? Math.min(Math.max(Number(diaVencimento), 1), 31) : null;
    onSalvarEdicao({
      nome: nome.trim(),
      valorParcelaCents,
      parcelaAtual: Number(parcelaAtual) || 1,
      parcelaTotal: Number(parcelaTotal) || 1,
      continuaIndefinidamente,
      diaVencimento: dia,
    });
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={styles.formRow}>
          <Field label="Nome">
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Valor da parcela (R$)">
            <input value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={styles.formRow}>
          <Field label="Parcela atual">
            <input value={parcelaAtual} onChange={(e) => setParcelaAtual(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Total de parcelas">
            <input value={parcelaTotal} onChange={(e) => setParcelaTotal(e.target.value)} style={styles.inputMono} />
          </Field>
          {ehManual && (
            <Field label="Dia venc.">
              <input placeholder="ex: 08" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} style={styles.inputMono} />
            </Field>
          )}
        </div>
        <label style={{ ...styles.cardLabel, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={continuaIndefinidamente} onChange={(e) => setContinuaIndefinidamente(e.target.checked)} />
          sem término definido (financiamento)
        </label>
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
      <div style={styles.listRowMain}>
        <span>
          {item.nome}
          {ehManual && item.diaVencimento && <span style={styles.panelHint}> · dia {item.diaVencimento}</span>}
        </span>
        <span style={styles.parcelaValor}>
          {fmt(item.valorParcelaCents)}
          {item.continuaIndefinidamente ? " · sem término" : ` · parcela ${item.parcelaAtual}/${item.parcelaTotal}`}
        </span>
      </div>
      <div style={styles.listRowActions}>
        <CategoriaMiniSelect nome={item.nome} valor={item.categoria} onChange={onMudarCategoria} />
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

function LinhaDespesaFixa({
  item,
  mesAtual,
  override,
  onMudarCategoria,
  onSalvarEdicao,
  onDesativar,
  onRemover,
  onSalvarOverride,
  onRemoverOverride,
}: {
  item: DespesaFixaRow;
  mesAtual: string;
  override: DespesaFixaOverrideRow | null;
  onMudarCategoria: (categoria: string | null) => void;
  onSalvarEdicao: (patch: { nome: string; valorCents: number; diaVencimento: number | null }) => void;
  onDesativar: () => void;
  onRemover: () => void;
  onSalvarOverride: (valorCents: number) => void;
  onRemoverOverride: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [valor, setValor] = useState(String(item.valorCents / 100));
  const [diaVencimento, setDiaVencimento] = useState(item.diaVencimento ? String(item.diaVencimento) : "");
  const [editandoOverride, setEditandoOverride] = useState(false);
  const [valorOverride, setValorOverride] = useState(override ? String(override.valorCents / 100) : "");

  function salvar() {
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorCents) || valorCents <= 0) return;
    const dia = diaVencimento.trim() ? Math.min(Math.max(Number(diaVencimento), 1), 31) : null;
    onSalvarEdicao({ nome: nome.trim(), valorCents, diaVencimento: dia });
    setEditando(false);
  }

  function salvarOverride() {
    const valorCents = Math.round(Number(valorOverride.replace(",", ".")) * 100);
    if (!Number.isFinite(valorCents) || valorCents <= 0) return;
    onSalvarOverride(valorCents);
    setEditandoOverride(false);
  }

  if (editando) {
    return (
      <div style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={styles.formRow}>
          <Field label="Nome">
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Valor (R$)">
            <input value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Dia venc.">
            <input placeholder="ex: 10" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} style={styles.inputMono} />
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
    <div style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={styles.listRowMain}>
          <span>
            {item.nome}
            {item.diaVencimento && <span style={styles.panelHint}> · dia {item.diaVencimento}</span>}
          </span>
          <span style={{ ...styles.parcelaValor, color: override ? "var(--q-orange)" : undefined }}>
            {fmt(override ? override.valorCents : item.valorCents)}
            {override && <span style={styles.panelHint}> · personalizado esse mês (normal {fmt(item.valorCents)})</span>}
          </span>
        </div>
        <div style={styles.listRowActions}>
          <CategoriaMiniSelect nome={item.nome} valor={item.categoria} onChange={onMudarCategoria} />
          <button
            className="q-btn"
            style={{ ...styles.buttonGhost, padding: 8 }}
            onClick={() => setEditandoOverride((v) => !v)}
            aria-label="Valor diferente esse mês"
            title="Valor diferente esse mês"
          >
            <Coins size={14} color={override ? "var(--q-orange)" : "var(--q-text-muted)"} />
          </button>
          <button className="q-btn" style={{ ...styles.buttonGhost, padding: 8 }} onClick={() => setEditando(true)} aria-label="Editar">
            <Pencil size={14} color="var(--q-blue)" />
          </button>
          <button className="q-btn" style={styles.buttonGhost} onClick={onDesativar}>
            Desativar
          </button>
          <button className="q-btn" style={{ ...styles.buttonGhost, padding: 8 }} onClick={onRemover} aria-label="Remover">
            <Trash2 size={14} color="var(--q-orange)" />
          </button>
        </div>
      </div>
      {editandoOverride && (
        <div style={styles.formRow}>
          <Field label={`Valor só em ${mesLabel(mesAtual)} (R$)`}>
            <input placeholder={String(item.valorCents / 100)} value={valorOverride} onChange={(e) => setValorOverride(e.target.value)} style={styles.inputMono} />
          </Field>
          <button className="q-btn" style={styles.button} onClick={salvarOverride}>
            Salvar
          </button>
          {override && (
            <button
              className="q-btn"
              style={styles.buttonGhost}
              onClick={() => {
                onRemoverOverride();
                setEditandoOverride(false);
                setValorOverride("");
              }}
            >
              Voltar ao normal
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Despesas() {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixaRow[]>([]);
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRow[]>([]);
  const [ultimaFaturaPorOrigem, setUltimaFaturaPorOrigem] = useState<Record<string, string>>({});
  const [mesAtual, setMesAtual] = useState(resolverMesAtual(null));
  const [overrides, setOverrides] = useState<DespesaFixaOverrideRow[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const [d, p, config, ultimaFatura] = await Promise.all([
      despesasFixasApi.listar(),
      parcelamentosApi.listar(),
      configApi.obter(),
      faturasApi.ultimaPorOrigem(),
    ]);
    setDespesasFixas(d);
    setParcelamentos(p);
    setMesAtual(config.mesAtual);
    setUltimaFaturaPorOrigem(ultimaFatura);
    setOverrides(await despesaFixaOverridesApi.listar(config.mesAtual));
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, []);

  async function salvarOverride(despesaFixaId: string, valorCents: number) {
    await despesaFixaOverridesApi.salvar({ despesaFixaId, mesReferencia: mesAtual, valorCents });
    carregar();
  }
  async function removerOverride(overrideId: string) {
    await despesaFixaOverridesApi.remover(overrideId);
    carregar();
  }

  if (carregando) return <div style={styles.panelHint}>Carregando...</div>;

  const despesasFixasAtivas = despesasFixas.filter((d) => d.ativo);
  const parcelamentosAtivos = parcelamentos.filter((p) =>
    parcelamentoContaNoMes(p, mesAtual, mesAtual, ultimaFaturaPorOrigem),
  );

  // Cada cartão/banco de fatura importada (Inter, Nubank, ou um nome
  // customizado como "Nubank Walisson") vira seu próprio grupo — só cai em
  // "Custos Fixos" quem não veio de fatura nenhuma (origem "manual" ou null).
  const fixoParcelamentos = parcelamentosAtivos.filter((p) => !p.origem || p.origem === "manual");
  const origensCartao = Array.from(
    new Set(parcelamentosAtivos.filter((p) => p.origem && p.origem !== "manual").map((p) => p.origem!)),
  ).sort();
  const itensPorOrigem = new Map(origensCartao.map((origem) => [origem, parcelamentosAtivos.filter((p) => p.origem === origem)]));

  const valorEfetivoDespesaFixa = (d: DespesaFixaRow) => overrides.find((o) => o.despesaFixaId === d.id)?.valorCents ?? d.valorCents;
  const totalFixo =
    despesasFixasAtivas.reduce((acc, d) => acc + valorEfetivoDespesaFixa(d), 0) +
    fixoParcelamentos.reduce((acc, p) => acc + p.valorParcelaCents, 0);
  const totalCartoes = origensCartao.reduce(
    (acc, origem) => acc + itensPorOrigem.get(origem)!.reduce((s, p) => s + p.valorParcelaCents, 0),
    0,
  );
  const totalGeral = totalFixo + totalCartoes;

  const ehAVista = (p: ParcelamentoRow) => p.parcelaTotal === 1 && !p.continuaIndefinidamente;

  async function mudarCategoriaParcelamento(id: string, categoria: string | null) {
    await parcelamentosApi.atualizar(id, { categoria });
    carregar();
  }
  async function salvarEdicaoParcelamento(
    id: string,
    patch: {
      nome: string;
      valorParcelaCents: number;
      parcelaAtual: number;
      parcelaTotal: number;
      continuaIndefinidamente: boolean;
      diaVencimento: number | null;
    },
  ) {
    await parcelamentosApi.atualizar(id, patch);
    carregar();
  }
  async function removerParcelamento(id: string) {
    await parcelamentosApi.remover(id);
    carregar();
  }
  async function mudarCategoriaDespesaFixa(id: string, categoria: string | null) {
    await despesasFixasApi.atualizar(id, { categoria });
    carregar();
  }
  async function salvarEdicaoDespesaFixa(id: string, patch: { nome: string; valorCents: number; diaVencimento: number | null }) {
    await despesasFixasApi.atualizar(id, patch);
    carregar();
  }
  async function desativarDespesaFixa(item: DespesaFixaRow) {
    await despesasFixasApi.atualizar(item.id, { ativo: false });
    carregar();
  }
  async function removerDespesaFixa(id: string) {
    await despesasFixasApi.remover(id);
    carregar();
  }

  return (
    <>
      <section className="q-surface" style={styles.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
          <div style={{ ...styles.panelHeadRow, marginBottom: 0 }}>
            <h3 style={styles.panelTitle}>Despesas</h3>
            <span style={styles.panelHint}>agrupado por origem — clique pra abrir e conferir os itens</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-title)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {fmt(totalGeral)}
          </span>
        </div>

        {origensCartao.map((origem) => {
          const itens = itensPorOrigem.get(origem)!;
          const total = itens.reduce((acc, p) => acc + p.valorParcelaCents, 0);
          return (
            <GrupoExpansivel key={origem} titulo={`Fatura ${origem}`} totalCents={total} quantidadeItens={itens.length} corAccent={corPorOrigem(origem)}>
              <GrupoDeCompras
                itens={itens}
                ehAVista={ehAVista}
                onMudarCategoria={mudarCategoriaParcelamento}
                onSalvarEdicao={salvarEdicaoParcelamento}
                onRemover={removerParcelamento}
              />
            </GrupoExpansivel>
          );
        })}

        <GrupoExpansivel
          titulo="Custos Fixos"
          totalCents={totalFixo}
          quantidadeItens={despesasFixasAtivas.length + fixoParcelamentos.length}
          corAccent={corPorOrigem("fixo")}
        >
          {despesasFixasAtivas.length > 0 && (
            <>
              <div style={{ ...styles.panelHint, marginBottom: 4 }}>Despesas fixas (sem prazo)</div>
              {despesasFixasAtivas.map((item) => (
                <LinhaDespesaFixa
                  key={item.id}
                  item={item}
                  mesAtual={mesAtual}
                  override={overrides.find((o) => o.despesaFixaId === item.id) ?? null}
                  onMudarCategoria={(c) => mudarCategoriaDespesaFixa(item.id, c)}
                  onSalvarEdicao={(patch) => salvarEdicaoDespesaFixa(item.id, patch)}
                  onDesativar={() => desativarDespesaFixa(item)}
                  onRemover={() => removerDespesaFixa(item.id)}
                  onSalvarOverride={(valorCents) => salvarOverride(item.id, valorCents)}
                  onRemoverOverride={() => {
                    const o = overrides.find((ov) => ov.despesaFixaId === item.id);
                    if (o) removerOverride(o.id);
                  }}
                />
              ))}
            </>
          )}
          {fixoParcelamentos.length > 0 && (
            <>
              <div style={{ ...styles.panelHint, marginTop: 12, marginBottom: 4 }}>Parcelamentos / financiamentos</div>
              {fixoParcelamentos.map((item) => (
                <LinhaParcelamento
                  key={item.id}
                  item={item}
                  onMudarCategoria={(c) => mudarCategoriaParcelamento(item.id, c)}
                  onSalvarEdicao={(patch) => salvarEdicaoParcelamento(item.id, patch)}
                  onRemover={() => removerParcelamento(item.id)}
                />
              ))}
            </>
          )}
        </GrupoExpansivel>
      </section>

      <AdicionarDespesaFixa onAdded={carregar} />
      <AdicionarParcelamento mesAtual={mesAtual} onAdded={carregar} />
    </>
  );
}

function GrupoDeCompras({
  itens,
  ehAVista,
  onMudarCategoria,
  onSalvarEdicao,
  onRemover,
}: {
  itens: ParcelamentoRow[];
  ehAVista: (p: ParcelamentoRow) => boolean;
  onMudarCategoria: (id: string, categoria: string | null) => void;
  onSalvarEdicao: (
    id: string,
    patch: {
      nome: string;
      valorParcelaCents: number;
      parcelaAtual: number;
      parcelaTotal: number;
      continuaIndefinidamente: boolean;
      diaVencimento: number | null;
    },
  ) => void;
  onRemover: (id: string) => void;
}) {
  const aVista = itens.filter(ehAVista);
  const parceladas = itens.filter((i) => !ehAVista(i));

  if (itens.length === 0) {
    return <div style={styles.panelHint}>Nenhum item ativo neste mês.</div>;
  }

  return (
    <>
      {aVista.length > 0 && (
        <>
          <div style={{ ...styles.panelHint, marginBottom: 4 }}>Compras à vista (1x — somem no mês que vem)</div>
          {aVista.map((item) => (
            <LinhaParcelamento
              key={item.id}
              item={item}
              onMudarCategoria={(c) => onMudarCategoria(item.id, c)}
              onSalvarEdicao={(patch) => onSalvarEdicao(item.id, patch)}
              onRemover={() => onRemover(item.id)}
            />
          ))}
        </>
      )}
      {parceladas.length > 0 && (
        <>
          <div style={{ ...styles.panelHint, marginTop: 12, marginBottom: 4 }}>Contas parceladas</div>
          {parceladas.map((item) => (
            <LinhaParcelamento
              key={item.id}
              item={item}
              onMudarCategoria={(c) => onMudarCategoria(item.id, c)}
              onSalvarEdicao={(patch) => onSalvarEdicao(item.id, patch)}
              onRemover={() => onRemover(item.id)}
            />
          ))}
        </>
      )}
    </>
  );
}

function AdicionarDespesaFixa({ onAdded }: { onAdded: () => void }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [diaVencimento, setDiaVencimento] = useState("");

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorCents) || valorCents <= 0) return;
    const dia = diaVencimento.trim() ? Math.min(Math.max(Number(diaVencimento), 1), 31) : null;
    await despesasFixasApi.criar({ nome: nome.trim(), valorCents, categoria, ativo: true, diaVencimento: dia });
    setNome("");
    setValor("");
    setCategoria(null);
    setDiaVencimento("");
    onAdded();
  }

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>+ Nova despesa fixa</h3>
        <span style={styles.panelHint}>sem prazo pra acabar (ex: aluguel, mercado)</span>
      </div>
      <form onSubmit={adicionar} style={styles.formRow}>
        <Field label="Nome">
          <input placeholder="ex: Aluguel" value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Valor (R$)">
          <input placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
        </Field>
        <Field label="Dia venc.">
          <input placeholder="ex: 10" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} style={styles.inputMono} />
        </Field>
        <Field label="Categoria">
          <CategoriaSelect value={categoria} onChange={setCategoria} />
        </Field>
        <button className="q-btn" type="submit" style={styles.button}>
          Adicionar
        </button>
      </form>
    </section>
  );
}

function AdicionarParcelamento({ mesAtual, onAdded }: { mesAtual: string; onAdded: () => void }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [parcelaAtual, setParcelaAtual] = useState("1");
  const [parcelaTotal, setParcelaTotal] = useState("1");
  const [mesInicio, setMesInicio] = useState(mesAtual);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [continuaIndefinidamente, setContinuaIndefinidamente] = useState(false);
  const [diaVencimento, setDiaVencimento] = useState("");

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const valorParcelaCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorParcelaCents) || valorParcelaCents <= 0) return;
    const dia = diaVencimento.trim() ? Math.min(Math.max(Number(diaVencimento), 1), 31) : null;

    await parcelamentosApi.criar({
      nome: nome.trim(),
      valorParcelaCents,
      parcelaAtual: Number(parcelaAtual) || 1,
      parcelaTotal: Number(parcelaTotal) || 1,
      mesInicio,
      origem: "manual",
      cartaoOrigem: null,
      categoria,
      continuaIndefinidamente,
      diaVencimento: dia,
    });
    setNome("");
    setValor("");
    setParcelaAtual("1");
    setParcelaTotal("1");
    setCategoria(null);
    setDiaVencimento("");
    setMesInicio(mesAtual);
    onAdded();
  }

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>+ Novo parcelamento/empréstimo</h3>
        <span style={styles.panelHint}>tem prazo pra acabar — some sozinho quando a última parcela é paga</span>
      </div>
      <form onSubmit={adicionar}>
        <div style={styles.formRow}>
          <Field label="Nome">
            <input placeholder="ex: Financiamento carro" value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Valor da parcela (R$)">
            <input placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={styles.formRow}>
          <Field label="Parcela atual">
            <input value={parcelaAtual} onChange={(e) => setParcelaAtual(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Total de parcelas">
            <input value={parcelaTotal} onChange={(e) => setParcelaTotal(e.target.value)} style={styles.inputMono} />
          </Field>
          <Field label="Categoria">
            <CategoriaSelect value={categoria} onChange={setCategoria} />
          </Field>
        </div>
        <div style={styles.formRow}>
          <Field label="Mês a que se refere a parcela atual">
            <MesInput value={mesInicio} onChange={setMesInicio} />
          </Field>
          <Field label="Dia venc.">
            <input placeholder="ex: 08" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} style={styles.inputMono} />
          </Field>
        </div>
        <div style={{ ...styles.formRow, alignItems: "center" }}>
          <label style={{ ...styles.cardLabel, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={continuaIndefinidamente} onChange={(e) => setContinuaIndefinidamente(e.target.checked)} />
            sem término definido (financiamento)
          </label>
          <button className="q-btn" type="submit" style={styles.button}>
            Adicionar
          </button>
        </div>
      </form>
    </section>
  );
}
