import { CreditCard, Home } from "lucide-react";
import { BarBreakdownList } from "./BarBreakdownList.js";
import type { OrigemTotal } from "../api/types.js";

const PALETA_ORIGEM = [
  "var(--q-orange)",
  "var(--q-blue)",
  "var(--q-purple)",
  "var(--q-rose)",
  "var(--q-gold)",
  "var(--q-mint)",
  "var(--q-cyan)",
  "var(--q-khaki)",
  "var(--q-indigo)",
];

/**
 * "fixo" (Custos Fixos) é sempre teal. Qualquer outra origem (nome de
 * cartão/banco, ex: "Nubank Walisson") pega uma cor da paleta via hash do
 * nome — estável entre recarregamentos, não depende de quantos outros
 * cartões existem nem da ordem em que aparecem.
 */
export function corPorOrigem(origem: string): string {
  if (origem === "fixo") return "var(--q-teal)";
  let hash = 0;
  for (let i = 0; i < origem.length; i++) hash = (hash * 31 + origem.charCodeAt(i)) >>> 0;
  return PALETA_ORIGEM[hash % PALETA_ORIGEM.length]!;
}

export function OrigemChart({ porOrigem }: { porOrigem: OrigemTotal[] }) {
  return (
    <BarBreakdownList
      vazio="Sem despesas neste mês ainda."
      mostrarPercentual
      itens={porOrigem.map((o) => ({
        key: o.origem,
        label: o.label,
        totalCents: o.totalCents,
        cor: corPorOrigem(o.origem),
        icon: o.origem === "fixo" ? Home : CreditCard,
        itens: o.itens,
      }))}
    />
  );
}
