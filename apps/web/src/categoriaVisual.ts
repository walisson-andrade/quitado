import {
  Briefcase, Car, Heart, Home, Landmark, MoreHorizontal, Repeat, ShoppingBag, ShoppingCart, TrendingUp, Wifi,
  type LucideIcon,
} from "lucide-react";
import type { CategoriaSlug } from "@quitado/calc";

/** Ícone por categoria de despesa — usado em Despesas, Painel, Fatura e Contas a pagar. */
export const CATEGORIA_ICON: Record<CategoriaSlug, LucideIcon> = {
  moradia: Home,
  mercado: ShoppingCart,
  transporte: Car,
  financiamento: Landmark,
  investimentos: TrendingUp,
  assinaturas: Repeat,
  saude: Heart,
  servicos: Briefcase,
  internet_telefone: Wifi,
  lazer_compras: ShoppingBag,
  outros: MoreHorizontal,
};

/** Cor por categoria — ordem fixa pra nunca mudar quando a lista de categorias do mês muda. */
export const CATEGORIA_COR: Record<CategoriaSlug, string> = {
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

export function corDaCategoria(categoria: string): string {
  return CATEGORIA_COR[categoria as CategoriaSlug] ?? CATEGORIA_COR.outros;
}

export function iconeDaCategoria(categoria: string): LucideIcon {
  return CATEGORIA_ICON[categoria as CategoriaSlug] ?? CATEGORIA_ICON.outros;
}
