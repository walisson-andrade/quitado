import type { LucideIcon } from "lucide-react";

const TAMANHOS = {
  sm: { box: 26, icone: 13, radius: 8 },
  md: { box: 34, icone: 17, radius: 10 },
  lg: { box: 46, icone: 22, radius: 13 },
} as const;

/** Ícone com fundo tintado na cor do accent (color-mix a 16%) — mesmo padrão usado nas Metas. */
export function IconBadge({
  icon: Icon,
  cor,
  tamanho = "md",
}: {
  icon: LucideIcon;
  cor: string;
  tamanho?: keyof typeof TAMANHOS;
}) {
  const { box, icone, radius } = TAMANHOS[tamanho];
  return (
    <div
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `color-mix(in srgb, ${cor} 16%, transparent)`,
      }}
    >
      <Icon size={icone} color={cor} />
    </div>
  );
}
