import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { authApi, cartoesApi, configApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { CartaoRow, ConfigRow } from "../api/types.js";
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

export function Configuracoes({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [salarioEur, setSalarioEur] = useState("");
  const [cotacao, setCotacao] = useState("");
  const [mesOverride, setMesOverride] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await authApi.trocarSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setMensagem("Senha alterada.");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível trocar a senha");
    }
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

      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Trocar senha</h3>
        </div>
        <form onSubmit={salvarSenha}>
          <div style={styles.formRow}>
            <Field label="Senha atual">
              <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} style={styles.input} />
            </Field>
            <Field label="Nova senha">
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} style={styles.input} />
            </Field>
          </div>
          {erro && <div style={styles.errorText}>{erro}</div>}
          <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%" }}>
            Trocar senha
          </button>
        </form>
      </section>

      {mensagem && <div style={styles.panelHint}>{mensagem}</div>}

      <button className="q-btn" style={{ ...styles.buttonGhost, width: "100%" }} onClick={sair}>
        Sair
      </button>
    </>
  );
}
