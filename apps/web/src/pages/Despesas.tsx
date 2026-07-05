import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { CATEGORIA_LABEL, categorizarAutomaticamente, parcelamentoContaNoMes, resolverMesAtual } from "@quitado/calc";
import { configApi, despesasFixasApi, faturasApi, parcelamentosApi } from "../api/resources.js";
import type { DespesaFixaRow, ParcelamentoRow } from "../api/types.js";
import { CategoriaSelect } from "../components/CategoriaSelect.js";
import { Field } from "../components/Field.js";
import { COR_POR_ORIGEM } from "../components/OrigemChart.js";
import { GrupoExpansivel } from "../components/GrupoExpansivel.js";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

function CategoriaMiniSelect({ nome, valor, onChange }: { nome: string; valor: string | null; onChange: (v: string | null) => void }) {
  return (
    <select
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{ ...styles.buttonGhost, padding: "6px 8px", fontFamily: "'Inter', sans-serif", fontSize: "var(--fs-xs)" }}
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
  }) => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [valor, setValor] = useState(String(item.valorParcelaCents / 100));
  const [parcelaAtual, setParcelaAtual] = useState(String(item.parcelaAtual));
  const [parcelaTotal, setParcelaTotal] = useState(String(item.parcelaTotal));
  const [continuaIndefinidamente, setContinuaIndefinidamente] = useState(item.continuaIndefinidamente);

  function salvar() {
    const valorParcelaCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorParcelaCents) || valorParcelaCents <= 0) return;
    onSalvarEdicao({
      nome: nome.trim(),
      valorParcelaCents,
      parcelaAtual: Number(parcelaAtual) || 1,
      parcelaTotal: Number(parcelaTotal) || 1,
      continuaIndefinidamente,
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
        <span>{item.nome}</span>
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
  onMudarCategoria,
  onSalvarEdicao,
  onDesativar,
  onRemover,
}: {
  item: DespesaFixaRow;
  onMudarCategoria: (categoria: string | null) => void;
  onSalvarEdicao: (patch: { nome: string; valorCents: number }) => void;
  onDesativar: () => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [valor, setValor] = useState(String(item.valorCents / 100));

  function salvar() {
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorCents) || valorCents <= 0) return;
    onSalvarEdicao({ nome: nome.trim(), valorCents });
    setEditando(false);
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
      <div style={styles.listRowMain}>
        <span>{item.nome}</span>
        <span style={styles.parcelaValor}>{fmt(item.valorCents)}</span>
      </div>
      <div style={styles.listRowActions}>
        <CategoriaMiniSelect nome={item.nome} valor={item.categoria} onChange={onMudarCategoria} />
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
  );
}

export function Despesas() {
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixaRow[]>([]);
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRow[]>([]);
  const [ultimaFaturaPorOrigem, setUltimaFaturaPorOrigem] = useState<Record<string, string>>({});
  const [mesAtual, setMesAtual] = useState(resolverMesAtual(null));
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    Promise.all([despesasFixasApi.listar(), parcelamentosApi.listar(), configApi.obter(), faturasApi.ultimaPorOrigem()])
      .then(([d, p, config, ultimaFatura]) => {
        setDespesasFixas(d);
        setParcelamentos(p);
        setMesAtual(config.mesAtual);
        setUltimaFaturaPorOrigem(ultimaFatura);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  if (carregando) return <div style={styles.panelHint}>Carregando...</div>;

  const despesasFixasAtivas = despesasFixas.filter((d) => d.ativo);
  const parcelamentosAtivos = parcelamentos.filter((p) =>
    parcelamentoContaNoMes(p, mesAtual, mesAtual, ultimaFaturaPorOrigem),
  );

  const interItens = parcelamentosAtivos.filter((p) => p.origem === "Inter");
  const nubankItens = parcelamentosAtivos.filter((p) => p.origem === "Nubank");
  const fixoParcelamentos = parcelamentosAtivos.filter((p) => p.origem !== "Inter" && p.origem !== "Nubank");

  const totalInter = interItens.reduce((acc, p) => acc + p.valorParcelaCents, 0);
  const totalNubank = nubankItens.reduce((acc, p) => acc + p.valorParcelaCents, 0);
  const totalFixo =
    despesasFixasAtivas.reduce((acc, d) => acc + d.valorCents, 0) +
    fixoParcelamentos.reduce((acc, p) => acc + p.valorParcelaCents, 0);

  const ehAVista = (p: ParcelamentoRow) => p.parcelaTotal === 1 && !p.continuaIndefinidamente;

  async function mudarCategoriaParcelamento(id: string, categoria: string | null) {
    await parcelamentosApi.atualizar(id, { categoria });
    carregar();
  }
  async function salvarEdicaoParcelamento(
    id: string,
    patch: { nome: string; valorParcelaCents: number; parcelaAtual: number; parcelaTotal: number; continuaIndefinidamente: boolean },
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
  async function salvarEdicaoDespesaFixa(id: string, patch: { nome: string; valorCents: number }) {
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
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Despesas</h3>
          <span style={styles.panelHint}>agrupado por origem — clique pra abrir e conferir os itens</span>
        </div>

        <GrupoExpansivel titulo="Fatura Inter" totalCents={totalInter} quantidadeItens={interItens.length} corAccent={COR_POR_ORIGEM.Inter!} abertoPorPadrao>
          <GrupoDeCompras
            itens={interItens}
            ehAVista={ehAVista}
            onMudarCategoria={mudarCategoriaParcelamento}
            onSalvarEdicao={salvarEdicaoParcelamento}
            onRemover={removerParcelamento}
          />
        </GrupoExpansivel>

        <GrupoExpansivel titulo="Fatura Nubank" totalCents={totalNubank} quantidadeItens={nubankItens.length} corAccent={COR_POR_ORIGEM.Nubank!}>
          <GrupoDeCompras
            itens={nubankItens}
            ehAVista={ehAVista}
            onMudarCategoria={mudarCategoriaParcelamento}
            onSalvarEdicao={salvarEdicaoParcelamento}
            onRemover={removerParcelamento}
          />
        </GrupoExpansivel>

        <GrupoExpansivel
          titulo="Custos Fixos"
          totalCents={totalFixo}
          quantidadeItens={despesasFixasAtivas.length + fixoParcelamentos.length}
          corAccent={COR_POR_ORIGEM.fixo!}
        >
          {despesasFixasAtivas.length > 0 && (
            <>
              <div style={{ ...styles.panelHint, marginBottom: 4 }}>Despesas fixas (sem prazo)</div>
              {despesasFixasAtivas.map((item) => (
                <LinhaDespesaFixa
                  key={item.id}
                  item={item}
                  onMudarCategoria={(c) => mudarCategoriaDespesaFixa(item.id, c)}
                  onSalvarEdicao={(patch) => salvarEdicaoDespesaFixa(item.id, patch)}
                  onDesativar={() => desativarDespesaFixa(item)}
                  onRemover={() => removerDespesaFixa(item.id)}
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
    patch: { nome: string; valorParcelaCents: number; parcelaAtual: number; parcelaTotal: number; continuaIndefinidamente: boolean },
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

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const valorCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorCents) || valorCents <= 0) return;
    await despesasFixasApi.criar({ nome: nome.trim(), valorCents, categoria, ativo: true });
    setNome("");
    setValor("");
    setCategoria(null);
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

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const valorParcelaCents = Math.round(Number(valor.replace(",", ".")) * 100);
    if (!nome.trim() || !Number.isFinite(valorParcelaCents) || valorParcelaCents <= 0) return;

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
    });
    setNome("");
    setValor("");
    setParcelaAtual("1");
    setParcelaTotal("1");
    setCategoria(null);
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
            <input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} style={{ ...styles.inputMono, width: "100%" }} />
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
