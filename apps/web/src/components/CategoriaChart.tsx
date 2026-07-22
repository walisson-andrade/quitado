import { corDaCategoria, iconeDaCategoria } from "../categoriaVisual.js";
import { BarBreakdownList } from "./BarBreakdownList.js";
import type { CategoriaTotal } from "../api/types.js";

export function CategoriaChart({ porCategoria }: { porCategoria: CategoriaTotal[] }) {
  return (
    <BarBreakdownList
      vazio="Sem despesas categorizadas ainda."
      mostrarMarcadorFim
      itens={porCategoria.map((c) => ({
        key: c.categoria,
        label: c.label,
        totalCents: c.totalCents,
        cor: corDaCategoria(c.categoria),
        icon: iconeDaCategoria(c.categoria),
        itens: c.itens,
      }))}
    />
  );
}
