import { Lock } from "lucide-react";
import { styles } from "../styles.js";

const MENSAGENS_ERRO: Record<string, string> = {
  login_cancelado: "Login cancelado.",
  login_falhou: "Não foi possível entrar com o Google. Tente de novo.",
  convite_invalido: "Esse convite não é mais válido — peça um novo link pra quem te convidou.",
};

export function Login() {
  const params = new URLSearchParams(window.location.search);
  const erro = params.get("erro");
  const convite = params.get("convite");

  function entrarComGoogle() {
    const url = new URL("/api/auth/google/login", window.location.origin);
    if (convite) url.searchParams.set("convite", convite);
    window.location.href = url.toString();
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginGlowTop} aria-hidden />
      <div style={styles.loginGlowBottom} aria-hidden />

      <div className="q-surface" style={styles.loginCard}>
        <div style={styles.loginLogo}>Q</div>
        <div style={styles.loginBrandName}>Quitado</div>
        <div style={styles.loginBrandSub}>
          {convite ? "Você foi convidado pra uma família no Quitado" : "seu dinheiro, sem mistério"}
        </div>

        {erro && <div style={styles.errorText}>{MENSAGENS_ERRO[erro] ?? "Algo deu errado."}</div>}

        <button className="q-btn" type="button" onClick={entrarComGoogle} style={styles.loginButton}>
          Entrar com Google
        </button>

        <div style={styles.loginFoot}>
          <Lock size={11} />
          seus dados ficam só no seu servidor
        </div>
      </div>
    </div>
  );
}
