import { useEffect, useState } from "react";
import {
  CalendarClock, LayoutDashboard, Moon, Settings, Sun, Target, Upload, Users, Wallet,
} from "lucide-react";
import { configApi, householdApi } from "./api/resources.js";
import { ApiError } from "./api/client.js";
import { NavBtn } from "./components/NavBtn.js";
import { Configuracoes } from "./pages/Configuracoes.js";
import { ContasAPagar } from "./pages/ContasAPagar.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Despesas } from "./pages/Despesas.js";
import { Fatura } from "./pages/Fatura.js";
import { Login } from "./pages/Login.js";
import { Metas } from "./pages/Metas.js";
import { QuemMeDeve } from "./pages/QuemMeDeve.js";
import { fontImports, styles } from "./styles.js";
import { useTheme } from "./useTheme.js";

type Tab = "dashboard" | "despesas" | "devem" | "fatura" | "contas" | "meta" | "config";

/** Aparece quando alguém já logado abre um link de convite — login pelo Google só processa convite durante o próprio fluxo OAuth, então quem já tem sessão precisa desse caminho separado pra aceitar. */
function BannerConvite({ token, onFechar }: { token: string; onFechar: () => void }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aceitar() {
    setCarregando(true);
    setErro(null);
    try {
      await householdApi.aceitarConvite(token);
      window.location.href = "/";
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível aceitar o convite");
      setCarregando(false);
    }
  }

  return (
    <div style={{ padding: "10px 16px", background: "var(--q-teal-bg, rgba(45, 212, 191, 0.12))", borderBottom: "1px solid var(--q-border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: "var(--fs-sm)", flex: 1, minWidth: 200 }}>
        {erro ?? "Você recebeu um convite pra entrar em outra família."}
      </span>
      <button className="q-btn" onClick={aceitar} disabled={carregando} style={{ ...styles.button, padding: "6px 14px" }}>
        {carregando ? "Aceitando…" : "Aceitar convite"}
      </button>
      <button className="q-btn" onClick={onFechar} style={{ ...styles.buttonGhost, padding: "6px 14px" }}>
        Ignorar
      </button>
    </div>
  );
}

function ThemeToggle({ tema, onToggle }: { tema: "dark" | "light"; onToggle: () => void }) {
  return (
    <button
      className="q-theme-btn"
      onClick={onToggle}
      aria-label={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={tema === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {tema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function App() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tema, alternarTema] = useTheme();
  const [conviteToken, setConviteToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("convite"),
  );

  useEffect(() => {
    configApi
      .obter()
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  function fecharConvite() {
    setConviteToken(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  if (autenticado === null) return null;

  if (!autenticado) {
    return (
      <div style={styles.app}>
        <style>{fontImports}</style>
        <div style={{ position: "absolute", top: 18, right: 18 }}>
          <ThemeToggle tema={tema} onToggle={alternarTema} />
        </div>
        <Login />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{fontImports}</style>

      {conviteToken && <BannerConvite token={conviteToken} onFechar={fecharConvite} />}

      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>Q</div>
          <div>
            <div style={styles.brandName}>Quitado</div>
            <div style={styles.brandSub}>seu dinheiro, sem mistério</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <ThemeToggle tema={tema} onToggle={alternarTema} />
        </div>
      </header>

      <main style={styles.main}>
        <div key={tab} className="q-tab-fade">
          {tab === "dashboard" && <Dashboard onAbrirMetas={() => setTab("meta")} />}
          {tab === "despesas" && <Despesas />}
          {tab === "devem" && <QuemMeDeve />}
          {tab === "fatura" && <Fatura />}
          {tab === "contas" && <ContasAPagar />}
          {tab === "meta" && <Metas />}
          {tab === "config" && <Configuracoes onLogout={() => setAutenticado(false)} />}
        </div>
      </main>

      <nav style={styles.nav}>
        <NavBtn icon={<LayoutDashboard size={20} />} label="Painel" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        <NavBtn icon={<Wallet size={20} />} label="Despesas" active={tab === "despesas"} onClick={() => setTab("despesas")} />
        <NavBtn icon={<Users size={20} />} label="Devem" active={tab === "devem"} onClick={() => setTab("devem")} />
        <NavBtn icon={<Upload size={20} />} label="Fatura" active={tab === "fatura"} onClick={() => setTab("fatura")} />
        <NavBtn icon={<CalendarClock size={20} />} label="Contas" active={tab === "contas"} onClick={() => setTab("contas")} />
        <NavBtn icon={<Target size={20} />} label="Metas" active={tab === "meta"} onClick={() => setTab("meta")} />
        <NavBtn icon={<Settings size={20} />} label="Config" active={tab === "config"} onClick={() => setTab("config")} />
      </nav>
    </div>
  );
}
