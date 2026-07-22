/** Barra de progresso com marcador circular na ponta — usada na timeline de dívidas e nas metas. */
export function BarraProgresso({ progresso, cor, indefinido }: { progresso: number; cor: string; indefinido?: boolean }) {
  return (
    <div style={{ position: "relative", height: 8, background: "var(--q-track-bg)", borderRadius: 4 }}>
      <div
        className="q-bar-fill"
        style={{
          position: "absolute",
          left: 0,
          width: `${progresso}%`,
          height: "100%",
          borderRadius: 4,
          background: cor,
          backgroundImage: indefinido ? `repeating-linear-gradient(135deg, ${cor} 0 6px, transparent 6px 10px)` : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${progresso}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: cor,
          border: "2.5px solid var(--q-card-bg)",
        }}
      />
    </div>
  );
}
