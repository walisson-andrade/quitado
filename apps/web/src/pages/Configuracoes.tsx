import { useEffect, useState } from "react";
import { authApi, configApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { ConfigRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { styles } from "../styles.js";

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
              <input type="month" value={mesOverride} onChange={(e) => setMesOverride(e.target.value)} style={styles.inputMono} />
            </Field>
          </div>
          <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%" }}>
            Salvar
          </button>
        </form>
      </section>

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
