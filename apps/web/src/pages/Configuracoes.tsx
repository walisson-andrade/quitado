import { useEffect, useState } from "react";
import {
  ArrowLeftRight, Banknote, ChevronRight, Check, Copy, CreditCard, Crown, LogOut, Pencil, Trash2, UserPlus, Users,
} from "lucide-react";
import { authApi, cartoesApi, configApi, householdApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { CartaoRow, ConfigRow, ConviteRow, HouseholdRow, MinhaFamilia, MoedaSalario } from "../api/types.js";
import { Field } from "../components/Field.js";
import { MesInput } from "../components/MesInput.js";
import { styles } from "../styles.js";

type SecaoId = "familia" | "renda" | "cartoes";

/** Cabeçalho clicável + conteúdo que abre/fecha — mesmo padrão de "sanfona" já usado no Painel (grupo por cartão) e em Contas (seção "pagas"), só reaproveitado aqui pra Configurações não empilhar tudo sempre aberto. */
function Acordeao({
  icon,
  cor,
  titulo,
  hint,
  aberta,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  cor: string;
  titulo: string;
  hint?: string;
  aberta: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="q-surface" style={{ border: "1px solid var(--q-border)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button
        className="q-btn"
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--q-inset-bg)", border: "none", cursor: "pointer", color: "var(--q-text)", textAlign: "left" }}
      >
        <ChevronRight className={`q-chevron${aberta ? " aberto" : ""}`} size={15} color={cor} style={{ flexShrink: 0 }} />
        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--q-card-bg)" }}>
          {icon}
        </div>
        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "var(--fs-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {titulo}
        </span>
        {hint && <span style={{ fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)", flexShrink: 0 }}>{hint}</span>}
      </button>
      <div className={`q-expand${aberta ? " aberto" : ""}`}>
        <div style={{ padding: aberta ? "14px" : "0 14px", overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}

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

function SecaoCartoes({ aberta, onToggle }: { aberta: boolean; onToggle: () => void }) {
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
    <Acordeao
      icon={<CreditCard size={14} color="var(--q-blue)" />}
      cor="var(--q-blue)"
      titulo="Cartões"
      hint={`${cartoes.length} cadastrado${cartoes.length === 1 ? "" : "s"}`}
      aberta={aberta}
      onToggle={onToggle}
    >
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
    </Acordeao>
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

/** Perfil & família: troca entre famílias (se a pessoa fizer parte de mais de uma), membros, convites e sair — tudo dentro de um único acordeão. */
function SecaoFamilia({ aberta, onToggle }: { aberta: boolean; onToggle: () => void }) {
  const [household, setHousehold] = useState<HouseholdRow | null>(null);
  const [convites, setConvites] = useState<ConviteRow[]>([]);
  const [minhasFamilias, setMinhasFamilias] = useState<MinhaFamilia[]>([]);
  const [nome, setNome] = useState("");
  const [meuId, setMeuId] = useState<string | null>(null);
  const [trocando, setTrocando] = useState<string | null>(null);

  function carregar() {
    householdApi.obter().then((h) => {
      setHousehold(h);
      setNome(h.nome);
    });
    householdApi.listarConvites().then(setConvites);
    authApi.listarMinhasFamilias().then(setMinhasFamilias);
  }

  useEffect(carregar, []);
  useEffect(() => {
    authApi.obterUsuarioAtual().then((u) => setMeuId(u.id));
  }, []);

  async function trocarFamilia(householdId: string) {
    setTrocando(householdId);
    try {
      await authApi.trocarFamilia(householdId);
      window.location.reload();
    } catch {
      setTrocando(null);
    }
  }

  async function removerMembro(userId: string) {
    if (!window.confirm("Remover essa pessoa da família? Ela perde acesso a esses dados na hora.")) return;
    await householdApi.removerMembro(userId);
    carregar();
  }

  async function promoverDono(userId: string, nomeMembro: string) {
    if (!window.confirm(`Tornar ${nomeMembro} dono(a) dessa família também? Quem for dono pode remover outros membros.`)) return;
    await householdApi.promoverDono(userId);
    carregar();
  }

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await householdApi.atualizar(nome.trim());
    carregar();
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
    <Acordeao
      icon={<Users size={14} color="var(--q-teal)" />}
      cor="var(--q-teal)"
      titulo="Perfil & família"
      hint={`${household.membros.length} ${household.membros.length === 1 ? "pessoa" : "pessoas"}`}
      aberta={aberta}
      onToggle={onToggle}
    >
      {minhasFamilias.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...styles.panelHint, fontWeight: 600, marginBottom: 6 }}>Trocar de família — você faz parte de mais de uma</div>
          {minhasFamilias.map((f) => (
            <div key={f.id} style={styles.listRow}>
              <div style={styles.listRowMain}>
                <span>{f.nome}</span>
                <span style={{ ...styles.panelHint, color: f.ativa ? "var(--q-teal)" : undefined }}>
                  {f.papel} {f.ativa ? "· ativa agora" : ""}
                </span>
              </div>
              {!f.ativa && (
                <button className="q-btn" style={styles.buttonGhost} disabled={trocando === f.id} onClick={() => trocarFamilia(f.id)}>
                  <ArrowLeftRight size={14} />
                  {trocando === f.id ? "Trocando…" : "Trocar pra essa"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
              {membro.papel !== "dono" && (
                <button
                  className="q-btn"
                  style={{ ...styles.buttonGhost, padding: 8 }}
                  onClick={() => promoverDono(membro.id, membro.nome ?? membro.email)}
                  aria-label="Tornar dono"
                  title="Tornar dono"
                >
                  <Crown size={14} color="var(--q-gold)" />
                </button>
              )}
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
    </Acordeao>
  );
}

export function Configuracoes({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [salario, setSalario] = useState("");
  const [moeda, setMoeda] = useState<MoedaSalario>("BRL");
  const [cotacao, setCotacao] = useState("");
  const [buscandoCotacao, setBuscandoCotacao] = useState(false);
  const [mesOverride, setMesOverride] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [secaoAberta, setSecaoAberta] = useState<SecaoId | null>("familia");

  function alternarSecao(s: SecaoId) {
    setSecaoAberta((atual) => (atual === s ? null : s));
  }

  useEffect(() => {
    configApi.obter().then((c) => {
      setConfig(c);
      setSalario(String(c.salarioCents / 100));
      setMoeda(c.moedaSalario);
      setCotacao(String(c.cotacaoBrl ?? ""));
      setMesOverride(c.mesAtualOverride ?? "");
    });
  }, []);

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    const atualizado = await configApi.atualizar({
      salarioCents: Math.round(Number(salario.replace(",", ".")) * 100),
      moedaSalario: moeda,
      ...(moeda !== "BRL" ? { cotacaoBrl: Number(cotacao.replace(",", ".")) } : {}),
      mesAtualOverride: mesOverride || null,
    });
    setConfig(atualizado);
    setMensagem("Configurações salvas.");
  }

  async function atualizarCotacao() {
    if (moeda === "BRL") return;
    setBuscandoCotacao(true);
    try {
      const { cotacao: valorAtual } = await configApi.obterCotacaoAtual(moeda);
      setCotacao(String(valorAtual));
    } catch {
      setMensagem("Não consegui buscar a cotação agora — tenta de novo em instantes.");
    } finally {
      setBuscandoCotacao(false);
    }
  }

  async function sair() {
    await authApi.logout();
    onLogout();
  }

  if (!config) return <div style={styles.panelHint}>Carregando...</div>;

  return (
    <>
      <SecaoFamilia aberta={secaoAberta === "familia"} onToggle={() => alternarSecao("familia")} />

      <Acordeao
        icon={<Banknote size={14} color="var(--q-gold)" />}
        cor="var(--q-gold)"
        titulo="Renda"
        hint={moeda === "BRL" ? "BRL" : `${moeda}${cotacao ? ` · ${cotacao}` : ""}`}
        aberta={secaoAberta === "renda"}
        onToggle={() => alternarSecao("renda")}
      >
        <form onSubmit={salvarConfig}>
          <div style={styles.formRow}>
            <Field label="Moeda do salário">
              <select value={moeda} onChange={(e) => setMoeda(e.target.value as MoedaSalario)} style={{ ...styles.input, width: "100%" }}>
                <option value="BRL">Real (BRL)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dólar (USD)</option>
              </select>
            </Field>
            <Field label={`Salário (${moeda})`}>
              <input placeholder="2990" value={salario} onChange={(e) => setSalario(e.target.value)} style={styles.inputMono} />
            </Field>
          </div>
          {moeda !== "BRL" && (
            <div style={styles.formRow}>
              <Field label={`Cotação ${moeda}→BRL`}>
                <input placeholder="5,91" value={cotacao} onChange={(e) => setCotacao(e.target.value)} style={styles.inputMono} />
              </Field>
              <button
                className="q-btn"
                type="button"
                onClick={atualizarCotacao}
                disabled={buscandoCotacao}
                style={{ ...styles.buttonGhost, alignSelf: "flex-end" }}
              >
                {buscandoCotacao ? "Buscando…" : "Atualizar cotação"}
              </button>
            </div>
          )}
          <div style={styles.formRow}>
            <Field label="Mês atual (deixe vazio para usar a data do sistema)">
              <MesInput value={mesOverride} onChange={setMesOverride} permiteVazio />
            </Field>
          </div>
          <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%" }}>
            Salvar
          </button>
        </form>
      </Acordeao>

      <SecaoCartoes aberta={secaoAberta === "cartoes"} onToggle={() => alternarSecao("cartoes")} />

      {mensagem && <div style={styles.panelHint}>{mensagem}</div>}

      <button className="q-btn" style={{ ...styles.buttonGhost, width: "100%" }} onClick={sair}>
        Sair
      </button>
    </>
  );
}
