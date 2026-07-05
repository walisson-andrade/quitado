import { diffMeses, mesFinalParcelamento } from "@quitado/calc";
import type { MesReferencia } from "@quitado/shared-types";
import { styles } from "../styles.js";
import { mesLabel } from "../format.js";
import type { ParcelamentoRow } from "../api/types.js";

const CORES = ["var(--q-gold)", "var(--q-orange)", "var(--q-teal)", "var(--q-blue)", "var(--q-purple)", "var(--q-rose)"];

/**
 * Elemento assinatura do app: cada dívida é uma barra que começa no mês de
 * início e termina no mês da última parcela, sumindo dali em diante.
 * Financiamentos sem término definido usam um padrão hachurado na ponta.
 */
export function GanttTimeline({ meses, parcelamentos }: { meses: MesReferencia[]; parcelamentos: ParcelamentoRow[] }) {
  const janela = meses.length;

  const barras = parcelamentos
    .map((p, i) => {
      const startIdx = diffMeses(meses[0]!, p.mesInicio);
      const endIdxReal = p.continuaIndefinidamente ? Number.POSITIVE_INFINITY : diffMeses(meses[0]!, mesFinalParcelamento(p));
      const endIdx = p.continuaIndefinidamente ? janela - 1 : Math.min(endIdxReal, janela - 1);
      return {
        p,
        startIdx: Math.max(startIdx, 0),
        endIdx,
        endIdxReal,
        cor: CORES[i % CORES.length]!,
      };
    })
    .filter((b) => b.endIdx >= 0 && b.startIdx < janela)
    // o que vai acabar primeiro fica em cima; financiamentos sem fim definido
    // (ou que só terminam bem lá na frente) ficam por baixo.
    .sort((a, b) => a.endIdxReal - b.endIdxReal || a.startIdx - b.startIdx);

  // "jun/26" ocupa bem mais espaço que "07" — com muitos meses na janela,
  // rotula só de tantos em tantos (sempre incluindo o último) pra não
  // amontoar o texto.
  const passoLabel = Math.max(1, Math.ceil(janela / 6));

  return (
    <div style={styles.ganttWrap}>
      <div style={styles.ganttMonths}>
        {meses.map((m, i) => (
          <div key={m} style={styles.ganttMonthLabel}>
            {i % passoLabel === 0 || i === janela - 1 ? mesLabel(m) : ""}
          </div>
        ))}
      </div>
      {barras.map(({ p, startIdx, endIdx, cor }) => (
        <div key={p.id} style={styles.ganttRow}>
          <div style={styles.ganttLabel}>{p.nome}</div>
          <div style={styles.ganttTrack}>
            <div
              style={{
                position: "absolute",
                left: `${(startIdx / janela) * 100}%`,
                width: `${((endIdx - startIdx + 1) / janela) * 100}%`,
                background: cor,
                height: 10,
                borderRadius: 6,
                opacity: 0.9,
                backgroundImage: p.continuaIndefinidamente
                  ? `repeating-linear-gradient(135deg, ${cor} 0 6px, transparent 6px 10px)`
                  : "none",
              }}
              title={`termina ${meses[Math.min(endIdx, janela - 1)]}${p.continuaIndefinidamente ? " (continua além da janela visível)" : ""}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
