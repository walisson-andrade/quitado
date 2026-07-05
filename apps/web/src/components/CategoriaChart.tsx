import { BarBreakdownList } from "./BarBreakdownList.js";
import type { CategoriaTotal } from "../api/types.js";

/** Ordem fixa por categoria — a cor nunca muda quando a lista de categorias do mês muda. */
const COR_POR_CATEGORIA: Record<string, string> = {
  moradia: "var(--q-teal)",
  mercado: "var(--q-gold)",
  transporte: "var(--q-orange)",
  financiamento: "var(--q-purple)",
  investimentos: "var(--q-mint)",
  assinaturas: "var(--q-rose)",
  saude: "var(--q-blue)",
  servicos: "var(--q-cyan)",
  internet_telefone: "var(--q-khaki)",
  lazer_compras: "var(--q-indigo)",
  outros: "var(--q-text-faint)",
};

export function CategoriaChart({ porCategoria }: { porCategoria: CategoriaTotal[] }) {
  return (
    <BarBreakdownList
      vazio="Sem despesas categorizadas ainda."
      itens={porCategoria.map((c) => ({
        key: c.categoria,
        label: c.label,
        totalCents: c.totalCents,
        cor: COR_POR_CATEGORIA[c.categoria] ?? COR_POR_CATEGORIA.outros!,
        itens: c.itens,
      }))}
    />
  );
}
