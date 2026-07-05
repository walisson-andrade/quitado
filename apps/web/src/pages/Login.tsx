import { useState } from "react";
import { authApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import { styles } from "../styles.js";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await authApi.login(senha);
      onLogin();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.logoMark}>Q</div>
      <div>
        <div style={{ ...styles.brandName, textAlign: "center", fontSize: 22 }}>Quitado</div>
        <div style={{ ...styles.brandSub, textAlign: "center" }}>seu dinheiro, sem mistério</div>
      </div>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 320 }}>
        <div style={styles.formRow}>
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
            autoFocus
          />
        </div>
        {erro && <div style={styles.errorText}>{erro}</div>}
        <button className="q-btn" type="submit" style={{ ...styles.button, width: "100%", marginTop: 10 }} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
