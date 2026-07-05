import { BarBreakdownList } from "./BarBreakdownList.js";
import type { OrigemTotal } from "../api/types.js";

/** Ordem fixa por origem — cor não muda mês a mês. */
export const COR_POR_ORIGEM: Record<string, string> = {
  fixo: "var(--q-teal)",
  Inter: "var(--q-orange)",
  Nubank: "var(--q-blue)",
};

export function OrigemChart({ porOrigem }: { porOrigem: OrigemTotal[] }) {
  return (
    <BarBreakdownList
      vazio="Sem despesas neste mês ainda."
      itens={porOrigem.map((o) => ({
        key: o.origem,
        label: o.label,
        totalCents: o.totalCents,
        cor: COR_POR_ORIGEM[o.origem] ?? "var(--q-text-faint)",
        itens: o.itens,
      }))}
    />
  );
}
