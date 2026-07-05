import type { CSSProperties } from "react";

export const fontImports = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
  .spin { animation: spin 1.6s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }

  :root {
    --fs-tiny: 10px;
    --fs-xs: 10.5px;
    --fs-sm: 11.5px;
    --fs-body: 13px;
    --fs-title: 14.5px;
    --fs-lg: 17px;
    --app-max-width: 480px;
  }

  /* Telas de PC: o app foi desenhado mobile-first (480px) e fica minúsculo
     num monitor — aumenta fonte e largura só a partir daqui, sem mexer no celular. */
  @media (min-width: 768px) {
    :root {
      --fs-tiny: 12px;
      --fs-xs: 13px;
      --fs-sm: 14px;
      --fs-body: 16px;
      --fs-title: 18px;
      --fs-lg: 21px;
      --app-max-width: 640px;
    }
  }

  /* Tema escuro (padrão/original do app). */
  :root, :root[data-theme="dark"] {
    --q-bg: #0b1120;
    --q-card-bg: #131c31;
    --q-panel-bg: #111a2e;
    --q-inset-bg: #0d1526;
    --q-border: #1f2942;
    --q-border-input: #28324a;
    --q-track-bg: #1a2340;
    --q-text: #e2e8f0;
    --q-text-secondary: #c3cbe0;
    --q-text-tertiary: #9aa5c0;
    --q-text-muted: #7d89a6;
    --q-text-faint: #5f6b87;
    --q-text-faint-2: #4b5674;
    --q-text-detail: #8f9ac2;
    --q-teal: #7fd6c2;
    --q-orange: #e8875c;
    --q-gold: #f2b84b;
    --q-purple: #c99bdb;
    --q-blue: #8aa8e0;
    --q-mint: #6bd48f;
    --q-rose: #e0a9c9;
    --q-cyan: #6bcfe0;
    --q-khaki: #d4c26b;
    --q-indigo: #9b8de0;
    --q-on-accent: #0b1120;
    --q-nav-bg: rgba(11, 17, 32, 0.92);
    --q-hover-border: #33436b;
    --q-dropzone-border: #2d3a5c;
    --q-euro-chip-bg: rgba(201, 155, 219, 0.1);
    --q-euro-chip-border: rgba(201, 155, 219, 0.3);
    --q-success-tint: rgba(127, 214, 194, 0.12);
    --q-glow-1: rgba(127, 214, 194, 0.07);
    --q-glow-2: rgba(138, 168, 224, 0.06);
    --q-glow-3: rgba(201, 155, 219, 0.05);
    --q-shadow-inset: rgba(255, 255, 255, 0.03);
    --q-shadow-drop: rgba(0, 0, 0, 0.6);
    --q-shadow-inset-hover: rgba(255, 255, 255, 0.04);
    --q-shadow-drop-hover: rgba(0, 0, 0, 0.65);
    color-scheme: dark;
  }

  /* Tema claro. */
  :root[data-theme="light"] {
    --q-bg: #f2f4f8;
    --q-card-bg: #ffffff;
    --q-panel-bg: #ffffff;
    --q-inset-bg: #eef1f7;
    --q-border: #dde3ee;
    --q-border-input: #c9d2e3;
    --q-track-bg: #e4e9f2;
    --q-text: #101826;
    --q-text-secondary: #33415c;
    --q-text-tertiary: #4a5670;
    --q-text-muted: #64748b;
    --q-text-faint: #8592a8;
    --q-text-faint-2: #94a1b8;
    --q-text-detail: #55627e;
    --q-teal: #1c8f75;
    --q-orange: #c1591f;
    --q-gold: #a5720a;
    --q-purple: #8347ad;
    --q-blue: #3f5fa8;
    --q-mint: #2e9457;
    --q-rose: #b3548a;
    --q-cyan: #1c7f96;
    --q-khaki: #8a731c;
    --q-indigo: #5847b0;
    --q-on-accent: #ffffff;
    --q-nav-bg: rgba(255, 255, 255, 0.88);
    --q-hover-border: #aab8d1;
    --q-dropzone-border: #b7c2d6;
    --q-euro-chip-bg: rgba(131, 71, 173, 0.08);
    --q-euro-chip-border: rgba(131, 71, 173, 0.28);
    --q-success-tint: rgba(28, 143, 117, 0.12);
    --q-glow-1: rgba(28, 143, 117, 0.06);
    --q-glow-2: rgba(63, 95, 168, 0.05);
    --q-glow-3: rgba(131, 71, 173, 0.05);
    --q-shadow-inset: rgba(255, 255, 255, 0.6);
    --q-shadow-drop: rgba(16, 24, 38, 0.1);
    --q-shadow-inset-hover: rgba(255, 255, 255, 0.7);
    --q-shadow-drop-hover: rgba(16, 24, 38, 0.14);
    color-scheme: light;
  }

  /* Atmosfera de fundo: glow sutil nos cantos em vez de chapado — não briga com o conteúdo. */
  html, body {
    background-color: var(--q-bg);
    background-image:
      radial-gradient(ellipse 700px 380px at 15% -10%, var(--q-glow-1), transparent 60%),
      radial-gradient(ellipse 600px 380px at 100% 10%, var(--q-glow-2), transparent 60%),
      radial-gradient(ellipse 500px 320px at 50% 100%, var(--q-glow-3), transparent 60%);
    background-attachment: fixed;
    background-repeat: no-repeat;
    transition: background-color 0.2s ease;
  }

  /* Cartões e painéis: profundidade real via sombra em camadas, não só borda. */
  .q-surface {
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.2s ease;
    box-shadow: 0 1px 0 var(--q-shadow-inset) inset, 0 10px 24px -14px var(--q-shadow-drop);
  }
  .q-surface-hover:hover {
    transform: translateY(-2px);
    border-color: var(--q-hover-border) !important;
    box-shadow: 0 1px 0 var(--q-shadow-inset-hover) inset, 0 16px 32px -12px var(--q-shadow-drop-hover);
  }

  /* Botões: resposta tátil imediata ao toque/clique. */
  .q-btn { transition: transform 0.1s ease, filter 0.15s ease, box-shadow 0.15s ease; }
  .q-btn:hover { filter: brightness(1.1); }
  .q-btn:active { transform: scale(0.96); }
  .q-btn:disabled { transform: none; }

  /* Bloco expansível: chevron gira, conteúdo desliza suave (sem JS de altura). */
  .q-chevron { transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
  .q-chevron.aberto { transform: rotate(90deg); }
  .q-expand { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
  .q-expand.aberto { grid-template-rows: 1fr; }
  .q-expand > div { overflow: hidden; }

  /* Barras dos gráficos: preenchem ao montar, puxando o olho pro dado novo. */
  @keyframes q-bar-fill { from { transform: scaleX(0); } }
  .q-bar-fill { transform-origin: left; animation: q-bar-fill 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

  /* Entrada em cascata dos cards de resumo no topo do Painel. */
  @keyframes q-rise-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .q-rise-in { animation: q-rise-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

  /* Troca de aba: fade + leve subida, marca que o conteúdo é novo. */
  @keyframes q-tab-fade {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .q-tab-fade { animation: q-tab-fade 0.28s cubic-bezier(0.16, 1, 0.3, 1) both; }

  /* Indicador da aba ativa no menu inferior. */
  .q-nav-dot {
    width: 4px; height: 4px; border-radius: 50%; background: currentColor;
    opacity: 0; transform: scale(0.4); transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .q-nav-btn.ativo .q-nav-dot { opacity: 1; transform: scale(1); }
  .q-nav-btn { transition: color 0.15s ease, transform 0.12s ease; }
  .q-nav-btn:active { transform: scale(0.92); }

  /* Botão de alternar tema. */
  .q-theme-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 10px;
    background: var(--q-inset-bg); border: 1px solid var(--q-border);
    color: var(--q-text-muted); cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  }
  .q-theme-btn:hover { color: var(--q-text); }
  .q-theme-btn:active { transform: scale(0.92); }
`;

export const styles: Record<string, CSSProperties> = {
  app: {
    fontFamily: "'Inter', sans-serif",
    background: "var(--q-bg)",
    color: "var(--q-text)",
    minHeight: "100vh",
    maxWidth: "var(--app-max-width)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    transition: "background-color 0.2s ease, color 0.2s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 18px 12px",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "linear-gradient(135deg, var(--q-teal), var(--q-blue))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    color: "var(--q-on-accent)",
    fontSize: "var(--fs-lg)",
  },
  brandName: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "var(--fs-lg)", lineHeight: 1.1 },
  brandSub: { fontSize: "var(--fs-xs)", color: "var(--q-text-muted)" },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  euroChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "var(--fs-xs)",
    color: "var(--q-purple)",
    background: "var(--q-euro-chip-bg)",
    border: "1px solid var(--q-euro-chip-border)",
    borderRadius: 20,
    padding: "5px 10px",
  },
  main: { flex: 1, padding: "4px 18px 100px", overflowY: "auto" },
  cardsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  card: { background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 14, padding: 14 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLabel: { fontSize: "var(--fs-sm)", color: "var(--q-text-tertiary)" },
  cardValue: { fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--fs-lg)", fontWeight: 600, marginBottom: 6 },
  cardFoot: { fontSize: "var(--fs-tiny)", color: "var(--q-text-faint)", lineHeight: 1.3 },
  progressTrack: { height: 5, background: "var(--q-border)", borderRadius: 3, marginBottom: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  panel: { background: "var(--q-panel-bg)", border: "1px solid var(--q-border)", borderRadius: 16, padding: 16, marginBottom: 14 },
  panelHeadRow: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 },
  panelTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "var(--fs-title)", fontWeight: 600, margin: 0 },
  panelHint: { fontSize: "var(--fs-xs)", color: "var(--q-text-faint)" },
  ganttWrap: { display: "flex", flexDirection: "column", gap: 10 },
  ganttMonths: { display: "flex", justifyContent: "space-between", paddingLeft: 108, marginBottom: -2 },
  ganttMonthLabel: { fontSize: "var(--fs-tiny)", color: "var(--q-text-faint-2)", fontFamily: "'JetBrains Mono', monospace" },
  ganttRow: { display: "flex", alignItems: "center", gap: 8 },
  ganttLabel: { width: 100, fontSize: "var(--fs-xs)", color: "var(--q-text-secondary)", flexShrink: 0 },
  ganttTrack: { position: "relative", flex: 1, height: 10, background: "var(--q-track-bg)", borderRadius: 6 },
  devedorBlock: { marginBottom: 18 },
  devedorHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    color: "var(--q-on-accent)",
  },
  devedorNome: { fontSize: "var(--fs-body)", fontWeight: 600 },
  devedorSub: { fontSize: "var(--fs-xs)", color: "var(--q-text-muted)" },
  parcelasGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  parcelaChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid var(--q-border-input)",
    background: "transparent",
    cursor: "pointer",
    color: "var(--q-text)",
  },
  parcelaMes: { fontSize: "var(--fs-tiny)", color: "var(--q-text-tertiary)", fontFamily: "'JetBrains Mono', monospace" },
  parcelaValor: { fontSize: "var(--fs-sm)", fontFamily: "'JetBrains Mono', monospace" },
  dropzone: {
    border: "1.5px dashed var(--q-dropzone-border)",
    borderRadius: 14,
    padding: "36px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    textAlign: "center",
    background: "var(--q-inset-bg)",
  },
  dropTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "var(--fs-body)", fontWeight: 600, marginTop: 4 },
  dropSub: { fontSize: "var(--fs-xs)", color: "var(--q-text-muted)" },
  uploadNote: { fontSize: "var(--fs-xs)", color: "var(--q-text-faint)", lineHeight: 1.5, marginTop: 12 },
  nav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "var(--app-max-width)",
    display: "flex",
    justifyContent: "space-around",
    background: "var(--q-nav-bg)",
    backdropFilter: "blur(8px)",
    borderTop: "1px solid var(--q-border)",
    padding: "10px 0 14px",
  },
  navBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  navLabel: { fontSize: "var(--fs-tiny)" },

  // --- Formulários / listas de CRUD e login (extensão do design system do protótipo) ---
  formRow: { display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: "var(--fs-xs)", color: "var(--q-text-muted)", fontFamily: "'Inter', sans-serif" },
  input: {
    flex: 1,
    minWidth: 0,
    background: "var(--q-inset-bg)",
    border: "1px solid var(--q-border-input)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "var(--q-text)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "var(--fs-body)",
  },
  inputMono: {
    flex: 1,
    minWidth: 0,
    background: "var(--q-inset-bg)",
    border: "1px solid var(--q-border-input)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "var(--q-text)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "var(--fs-body)",
  },
  button: {
    background: "linear-gradient(135deg, var(--q-teal), var(--q-blue))",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    color: "var(--q-on-accent)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: "var(--fs-body)",
    cursor: "pointer",
  },
  buttonGhost: {
    background: "transparent",
    border: "1px solid var(--q-border-input)",
    borderRadius: 10,
    padding: "10px 16px",
    color: "var(--q-text)",
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: "var(--fs-body)",
    cursor: "pointer",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid var(--q-border)",
    fontSize: "var(--fs-body)",
  },
  listRowMain: { display: "flex", flexDirection: "column", gap: 2 },
  listRowActions: { display: "flex", gap: 8, alignItems: "center" },
  errorText: { fontSize: "var(--fs-sm)", color: "var(--q-orange)", marginTop: 6 },
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 24,
  },
};
