export const CATEGORIAS_SUGERIDAS = [
  "moradia",
  "mercado",
  "transporte",
  "financiamento",
  "investimentos",
  "assinaturas",
  "saude",
  "servicos",
  "internet_telefone",
  "lazer_compras",
  "outros",
] as const;

export type CategoriaSlug = (typeof CATEGORIAS_SUGERIDAS)[number];

export const CATEGORIA_LABEL: Record<CategoriaSlug, string> = {
  moradia: "Moradia",
  mercado: "Mercado",
  transporte: "Transporte/Combustível",
  financiamento: "Financiamento/Empréstimo",
  investimentos: "Investimentos",
  assinaturas: "Assinaturas/Seguros",
  saude: "Saúde",
  servicos: "Serviços profissionais",
  internet_telefone: "Internet/Telefone",
  lazer_compras: "Lazer/Compras",
  outros: "Outros",
};

/** Palavras-chave em ordem de prioridade — a primeira categoria cujo termo aparecer no nome vence. */
const PALAVRAS_CHAVE: Array<[CategoriaSlug, string[]]> = [
  ["moradia", ["aluguel", "condomínio", "condominio", "água", "agua", "luz", "energia", "gás", "gas"]],
  ["mercado", ["mercado", "supermercado", "hortifruti", "açougue", "acougue", "atacad"]],
  [
    "transporte",
    ["posto", "gasolina", "combust", "uber", "99app", "99 ", "pedágio", "pedagio", "estacionamento", "ipva"],
  ],
  ["financiamento", ["financiamento", "empréstimo", "emprestimo"]],
  [
    "investimentos",
    ["investimento", "invest", "tesouro direto", "corretora", "cdb", "ações", "acoes", "xp investimentos", "nuinvest", "rico investi"],
  ],
  ["assinaturas", ["seguro", "anual", "clube", "netflix", "spotify", "streaming", "assinatura"]],
  ["saude", ["vet ", "vet.", "veterin", "farmácia", "farmacia", "clínica", "clinica", "hospital", "plano de saúde"]],
  ["servicos", ["contador", "cnpj", "contabilidade", "advogad"]],
  ["internet_telefone", ["internet", "telefone", "vivo", "claro", "tim ", " oi "]],
  ["lazer_compras", ["shopee", "magalu", "amazon", "shopping", "loja"]],
];

/**
 * Heurística por palavra-chave — cobre os casos comuns, mas nunca é
 * definitiva: o usuário sempre pode sobrescrever a categoria de um item
 * manualmente (o campo `categoria` no banco, quando preenchido, tem
 * prioridade sobre esta função).
 */
export function categorizarAutomaticamente(nome: string): CategoriaSlug {
  const nomeNormalizado = nome.toLowerCase();
  for (const [categoria, palavras] of PALAVRAS_CHAVE) {
    if (palavras.some((p) => nomeNormalizado.includes(p))) return categoria;
  }
  return "outros";
}
