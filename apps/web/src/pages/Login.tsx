import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { authApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import { styles } from "../styles.js";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
      <div style={styles.loginGlowTop} aria-hidden />
      <div style={styles.loginGlowBottom} aria-hidden />

      <form className="q-surface" style={styles.loginCard} onSubmit={handleSubmit}>
        <div style={styles.loginLogo}>Q</div>
        <div style={styles.loginBrandName}>Quitado</div>
        <div style={styles.loginBrandSub}>seu dinheiro, sem mistério</div>

        <div style={styles.loginFieldWrap}>
          <label style={styles.fieldLabel} htmlFor="senha">Senha de acesso</label>
          <div className="q-login-input" style={styles.loginInputGroup}>
            <Lock size={15} style={{ flexShrink: 0, color: "var(--q-text-muted)" }} />
            <input
              id="senha"
              type={mostrar ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              style={styles.loginInput}
            />
            <button
              type="button"
              onClick={() => setMostrar((m) => !m)}
              aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
              style={styles.loginEyeBtn}
            >
              {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {erro && <div style={styles.errorText}>{erro}</div>}

        <button className="q-btn" type="submit" disabled={carregando} style={styles.loginButton}>
          {carregando && <Loader2 size={14} className="spin" />}
          {carregando ? "Entrando…" : "Entrar"}
        </button>

        <div style={styles.loginFoot}>
          <Lock size={11} />
          seus dados ficam só no seu servidor
        </div>
      </form>
    </div>
  );
}
