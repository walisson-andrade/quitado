import { useEffect, useState } from "react";
import {
  LayoutDashboard, Moon, Settings, Sun, Target, Upload, Users, Wallet,
} from "lucide-react";
import { configApi } from "./api/resources.js";
import { NavBtn } from "./components/NavBtn.js";
import { Configuracoes } from "./pages/Configuracoes.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Despesas } from "./pages/Despesas.js";
import { Fatura } from "./pages/Fatura.js";
import { Login } from "./pages/Login.js";
import { MetaPoupanca } from "./pages/MetaPoupanca.js";
import { QuemMeDeve } from "./pages/QuemMeDeve.js";
import { fontImports, styles } from "./styles.js";
import { useTheme } from "./useTheme.js";

type Tab = "dashboard" | "despesas" | "devem" | "fatura" | "meta" | "config";

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

  useEffect(() => {
    configApi
      .obter()
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  if (autenticado === null) return null;

  if (!autenticado) {
    return (
      <div style={styles.app}>
        <style>{fontImports}</style>
        <div style={{ position: "absolute", top: 18, right: 18 }}>
          <ThemeToggle tema={tema} onToggle={alternarTema} />
        </div>
        <Login onLogin={() => setAutenticado(true)} />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{fontImports}</style>

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
          {tab === "dashboard" && <Dashboard />}
          {tab === "despesas" && <Despesas />}
          {tab === "devem" && <QuemMeDeve />}
          {tab === "fatura" && <Fatura />}
          {tab === "meta" && <MetaPoupanca />}
          {tab === "config" && <Configuracoes onLogout={() => setAutenticado(false)} />}
        </div>
      </main>

      <nav style={styles.nav}>
        <NavBtn icon={<LayoutDashboard size={20} />} label="Painel" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        <NavBtn icon={<Wallet size={20} />} label="Despesas" active={tab === "despesas"} onClick={() => setTab("despesas")} />
        <NavBtn icon={<Users size={20} />} label="Devem" active={tab === "devem"} onClick={() => setTab("devem")} />
        <NavBtn icon={<Upload size={20} />} label="Fatura" active={tab === "fatura"} onClick={() => setTab("fatura")} />
        <NavBtn icon={<Target size={20} />} label="Meta" active={tab === "meta"} onClick={() => setTab("meta")} />
        <NavBtn icon={<Settings size={20} />} label="Config" active={tab === "config"} onClick={() => setTab("config")} />
      </nav>
    </div>
  );
}
