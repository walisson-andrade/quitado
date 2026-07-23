import { Car, GraduationCap, Home, Plane, ShieldAlert, ShoppingBag, Target, type LucideIcon } from "lucide-react";
import type { MetaCategoria } from "./api/types.js";

/** Ícone e cor por categoria de meta — usado no card de cada meta e no painel de metas do Painel. */
export const META_CATEGORIA_INFO: Record<MetaCategoria, { label: string; cor: string; Icon: LucideIcon }> = {
  viagem: { label: "Viagem", cor: "var(--q-teal)", Icon: Plane },
  carro: { label: "Carro", cor: "var(--q-blue)", Icon: Car },
  casa: { label: "Casa", cor: "var(--q-gold)", Icon: Home },
  educacao: { label: "Educação", cor: "var(--q-purple)", Icon: GraduationCap },
  compra: { label: "Compra", cor: "var(--q-rose)", Icon: ShoppingBag },
  emergencia: { label: "Emergência", cor: "var(--q-orange)", Icon: ShieldAlert },
  outro: { label: "Outro", cor: "var(--q-text-muted)", Icon: Target },
};
