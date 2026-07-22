import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, Copy, LogOut, Pencil, Trash2, UserPlus } from "lucide-react";
import { authApi, cartoesApi, configApi, householdApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { CartaoRow, ConfigRow, ConviteRow, HouseholdRow, MinhaFamilia } from "../api/types.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { styles } from "../styles.js";

function LinhaCartao({
  item,
  onSalvarEdicao,
  onRemover,
}: {
  item: CartaoRow;
  onSalvarEdicao: (patch: { nome: string; diaVencimento: number | null }) => void;
  onRemover: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [dia, setDia] = useState(item.diaVencimento ? String(item.diaVencimento) : "");

  function salvar() {
    if (!nome.trim()) return;
    const diaVencimento = dia.trim() ? Math.min(Math.max(Number(dia), 1), 31) : null;
    onSalvarEdicao({ nome: nome.trim(), diaVencimento });
    setEditando(false);
  }

  if (editando) {
    return (
      <div style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={styles.formRow}>
          <Field label="Nome">
            <input value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Dia venc.">
            <input placeholder="ex: 21" value={dia} onChange={(e) => setDia(e.target.value)} style={styles.inputMono} />
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
        <span style={styles.panelHint}>{item.diaVencimento ? `vence dia ${item.diaVencimento}` : "sem dia definido"}</span>
      </div>
      <div style={styles.listRowActions}>
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

function SecaoCartoes() {
  const [cartoes, setCartoes] = useState<CartaoRow[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoDia, setNovoDia] = useState("");

  function carregar() {
    cartoesApi.listar().then(setCartoes);
  }

  useEffect(carregar, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    const diaVencimento = novoDia.trim() ? Math.min(Math.max(Number(novoDia), 1), 31) : null;
    await cartoesApi.criar({ nome: novoNome.trim(), diaVencimento });
    setNovoNome("");
    setNovoDia("");
    carregar();
  }

  async function salvarEdicao(id: string, patch: { nome: string; diaVencimento: number | null }) {
    await cartoesApi.atualizar(id, patch);
    carregar();
  }

  async function remover(id: string) {
    await cartoesApi.remover(id);
    carregar();
  }

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Cartões</h3>
        <span style={styles.panelHint}>dia de vencimento de cada fatura (Nubank, Santander, Inter, etc)</span>
      </div>

      {cartoes.map((item) => (
        <LinhaCartao
          key={item.id}
          item={item}
          onSalvarEdicao={(patch) => salvarEdicao(item.id, patch)}
          onRemover={() => remover(item.id)}
        />
      ))}

      <form onSubmit={adicionar} style={{ ...styles.addPersonRow, marginTop: cartoes.length > 0 ? 10 : 0 }}>
        <Field label="Novo cartão">
          <input placeholder="ex: Nubank Walisson" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Dia venc.">
          <input placeholder="ex: 21" value={novoDia} onChange={(e) => setNovoDia(e.target.value)} style={{ ...styles.inputMono, width: 70 }} />
        </Field>
        <button className="q-btn" type="submit" style={styles.buttonGhost}>
          Adicionar
        </button>
      </form>
    </section>
  );
}

function LinhaConvite({ convite, onRemover }: { convite: ConviteRow; onRemover: () => void }) {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    const url = `${window.location.origin}/?convite=${convite.token}`;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const expiraEm = new Date(convite.expiraEm);

  return (
    <div style={styles.listRow}>
      <div style={styles.listRowMain}>
        <span>Convite pendente</span>
        <span style={styles.panelHint}>expira em {expiraEm.toLocaleDateString("pt-BR")}</span>
      </div>
      <div style={styles.listRowActions}>
        <button className="q-btn" style={styles.buttonGhost} onClick={copiarLink}>
          {copiado ? <Check size={14} color="var(--q-teal)" /> : <Copy size={14} />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <button className="q-btn" style={{ ...styles.buttonGhost, padding: 8 }} onClick={onRemover} aria-label="Cancelar convite">
          <Trash2 size={14} color="var(--q-orange)" />
        </button>
      </div>
    </div>
  );
}

/** Só aparece quando a pessoa faz parte de mais de uma família (ex: a dela e a do parceiro) — trocar recarrega o app inteiro pro contexto da família escolhida. */
function SecaoMinhasFamilias() {
  const [familias, setFamilias] = useState<MinhaFamilia[]>([]);
  const [trocando, setTrocando] = useState<string | null>(null);

  useEffect(() => {
    authApi.listarMinhasFamilias().then(setFamilias);
  }, []);

  async function trocar(householdId: string) {
    setTrocando(householdId);
    try {
      await authApi.trocarFamilia(householdId);
      window.location.reload();
    } catch {
      setTrocando(null);
    }
  }

  if (familias.length <= 1) return null;

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Trocar de família</h3>
        <span style={styles.panelHint}>você faz parte de mais de uma — escolha qual ver agora</span>
      </div>
      {familias.map((f) => (
        <div key={f.id} style={styles.listRow}>
          <div style={styles.listRowMain}>
            <span>{f.nome}</span>
            <span style={{ ...styles.panelHint, color: f.ativa ? "var(--q-teal)" : undefined }}>
              {f.papel} {f.ativa ? "· ativa agora" : ""}
            </span>
          </div>
          {!f.ativa && (
            <button className="q-btn" style={styles.buttonGhost} disabled={trocando === f.id} onClick={() => trocar(f.id)}>
              <ArrowLeftRight size={14} />
              {trocando === f.id ? "Trocando…" : "Trocar pra essa"}
            </button>
          )}
        </div>
      ))}
    </section>
  );
}

function SecaoFamilia() {
  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [convites, setConvites] = useState<ConviteRow[]>([]);
  const [nome, setNome] = useState("");
  const [meuId, setMeuId] = useState<string | null>(null);

  function carregar() {
    householdApi.obter().then((h) => {
      setHousehold(h);
      setNome(h.nome);
    });
    householdApi.listarConvites().then(setConvites);
  }

  useEffect(carregar, []);
  useEffect(() => {
    authApi.obterUsuarioAtual().then((u) => setMeuId(u.id));
  }, []);

  async function removerMembro(userId: string) {
    if (!window.confirm("Remover essa pessoa da família? Ela perde acesso a esses dados na hora.")) return;
    await householdApi.removerMembro(userId);
    carregar();
  }

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const atualizado = await householdApi.atualizar(nome.trim());
    setHousehold(atualizado);
  }

  async function gerarConvite() {
    await householdApi.criarConvite();
    householdApi.listarConvites().then(setConvites);
  }

  async function removerConvite(id: string) {
    await householdApi.removerConvite(id);
    setConvites((atual) => atual.filter((c) => c.id !== id));
  }

  async function sairDaFamilia() {
    if (!window.confirm(`Sair de "${household?.nome}"? Você perde acesso a esses dados na hora.`)) return;
    try {
      await householdApi.sair();
      window.location.href = "/";
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Não foi possível sair da família");
    }
  }

  if (!household) return null;
  const souDono = household.membros.find((m) => m.id === meuId)?.papel === "dono";

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Família</h3>
        <span style={styles.panelHint}>quem compartilha esses dados com você</span>
      </div>

      <form onSubmit={salvarNome} style={{ ...styles.formRow, marginBottom: 12 }}>
        <Field label="Nome da família">
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={styles.input} />
        </Field>
        <button className="q-btn" type="submit" style={styles.buttonGhost}>
          Salvar
        </button>
      </form>

      {household.membros.map((membro) => (
        <div key={membro.id} style={styles.listRow}>
          <div style={styles.listRowMain}>
            <span>{membro.nome ?? membro.email}</span>
            <span style={styles.panelHint}>
              {membro.email} · {membro.papel}
            </span>
          </div>
          {souDono && membro.id !== meuId && (
            <div style={styles.listRowActions}>
              <button
                className="q-btn"
                style={{ ...styles.buttonGhost, padding: 8 }}
                onClick={() => removerMembro(membro.id)}
                aria-label="Remover da família"
                title="Remover da família"
              >
                <Trash2 size={14} color="var(--q-orange)" />
              </button>
            </div>
          )}
        </div>
      ))}

      {convites.map((convite) => (
        <LinhaConvite key={convite.id} convite={convite} onRemover={() => removerConvite(convite.id)} />
      ))}

      <button
        className="q-btn"
        style={{ ...styles.buttonGhost, width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        onClick={gerarConvite}
      >
        <UserPlus size={14} />
        Convidar alguém
      </button>

      <button
        className="q-btn"
        style={{ ...styles.buttonGhost, width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--q-orange)" }}
        onClick={sairDaFamilia}
      >
        <LogOut size={14} />
        Sair dessa família
      </button>
    </section>
  );
}

export function Configuracoes({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [salarioEur, setSalarioEur] = useState("");
  const [cotacao, setCotacao] = useState("");
  const [mesOverride, setMesOverride] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    configApi.obter().then((c) => {
      setConfig(c);
      setSalarioEur(String(c.salarioEurCents / 100));
      setCotacao(String(c.eurBrlRate ?? ""));
      setMesOverride(c.mesAtualOverride ?? "");
    });
  }, []);

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    const atualizado = await configApi.atualizar({
      salarioEurCents: Math.round(Number(salarioEur.replace(",", ".")) * 100),
      eurBrlRate: Number(cotacao.replace(",", ".")),
      mesAtualOverride: mesOverride || null,
    });
    setConfig(atualizado);
    setMensagem("Configurações salvas.");
  }

  async function sair() {
    await authApi.logout();
    onLogout();
  }

  if (!config) return <div style={styles.panelHint}>Carregando...</div>;

  return (
    <>
      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Renda e cotação</h3>
          <span style={styles.panelHint}>usados para calcular a renda em BRL</span>
        </div>
        <form onSubmit={salvarConfig}>
          <div style={styles.formRow}>
            <Field label="Salário (EUR)">
              <input placeholder="2990" value={salarioEur} onChange={(e) => setSalarioEur(e.target.value)} style={styles.inputMono} />
            </Field>
            <Field label="Cotação EUR→BRL">
              <input placeholder="5,91" value={cotacao} onChange={(e) => setCotacao(e.target.value)} style={styles.inputMono} />
            </Field>
          </div>
          <div style={styles.formRow}>
            <Field label="Mês atual (deixe vazio para usar a data do sistema)">
              <MesInput value={mesOverride} onChange={setMesOverride} permiteVazio />
            </Field>
          </div>
          <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%" }}>
            Salvar
          </button>
        </form>
      </section>

      <SecaoCartoes />

      <SecaoMinhasFamilias />

      <SecaoFamilia />

      {mensagem && <div style={styles.panelHint}>{mensagem}</div>}

      <button className="q-btn" style={{ ...styles.buttonGhost, width: "100%" }} onClick={sair}>
        Sair
      </button>
    </>
  );
}
