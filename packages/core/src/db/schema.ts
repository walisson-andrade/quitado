import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Conta Google de uma pessoa. Login é sempre via Google — não guardamos
 * senha. A validade de sessão não depende de versionar token aqui: cada
 * request confere se `quitado_household_members` ainda tem a linha
 * (household, user) do cookie, então remover alguém do household já revoga
 * o acesso na hora, sem precisar de contador de versão por usuário.
 */
export const users = pgTable("quitado_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull().unique(),
  nome: text("nome"),
  avatarUrl: text("avatar_url"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Unidade de isolamento de dados — pessoas do mesmo household compartilham tudo abaixo, como uma "família". */
export const households = pgTable("quitado_households", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const householdMembers = pgTable(
  "quitado_household_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    papel: text("papel").notNull().default("membro"), // 'dono' | 'membro'
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdUserUnique: unique().on(table.householdId, table.userId),
  }),
);

/** Convite de entrada num household — link gerado por um membro existente e compartilhado manualmente (WhatsApp etc.). */
export const householdInvites = pgTable("quitado_household_invites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  criadoPorUserId: uuid("criado_por_user_id")
    .notNull()
    .references(() => users.id),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Config por household — substitui a antiga linha única `quitado_app_config` (que também guardava a senha compartilhada). */
export const householdConfig = pgTable("quitado_household_config", {
  householdId: uuid("household_id")
    .primaryKey()
    .references(() => households.id, { onDelete: "cascade" }),
  salarioEurCents: integer("salario_eur_cents").notNull().default(0),
  eurBrlRate: numeric("eur_brl_rate", { precision: 10, scale: 4 }).notNull().default("1.0"),
  mesAtualOverride: char("mes_atual_override", { length: 7 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const despesasFixas = pgTable("quitado_despesas_fixas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  valorCents: integer("valor_cents").notNull(),
  categoria: text("categoria"),
  ativo: boolean("ativo").notNull().default(true),
  /** Dia do mês (1-31) em que a conta vence — usado na tela de Contas a pagar. Nulo = sem dia definido. */
  diaVencimento: smallint("dia_vencimento"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Valor diferente do normal pra uma despesa fixa num mês específico (ex:
 * aluguel de R$1.500 que veio R$1.800 esse mês por causa de um seguro
 * embutido) — sem mudar o valor "de sempre" da despesa fixa, que continua
 * valendo nos outros meses. Se não houver linha aqui pro mês, usa o valor
 * base normalmente. Sem `householdId` próprio — sempre acessada via join
 * com `despesaFixaId`, que já carrega o household.
 */
export const despesaFixaOverrides = pgTable(
  "quitado_despesa_fixa_overrides",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    despesaFixaId: uuid("despesa_fixa_id")
      .notNull()
      .references(() => despesasFixas.id, { onDelete: "cascade" }),
    mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
    valorCents: integer("valor_cents").notNull(),
  },
  (table) => ({
    despesaFixaMesUnique: unique().on(table.despesaFixaId, table.mesReferencia),
  }),
);

/**
 * Cartão como entidade nomeada (ex: "Nubank Walisson", "Santander Leticia")
 * — auto-criado quando uma fatura é confirmada com esse nome de origem (ver
 * `confirmarFatura`), ou manualmente no Config. Existe só pra guardar o dia
 * de vencimento configurável de cada cartão; o valor do mês é derivado
 * casando `parcelamentos.origem` com `cartoes.nome`.
 */
export const cartoes = pgTable("quitado_cartoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  diaVencimento: smallint("dia_vencimento"),
  corHex: text("cor_hex"),
  ativo: boolean("ativo").notNull().default(true),
});

/** Cobre parcelamentos, empréstimos e compras à vista (parcelaTotal = 1). */
export const parcelamentos = pgTable("quitado_parcelamentos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  valorParcelaCents: integer("valor_parcela_cents").notNull(),
  parcelaAtual: smallint("parcela_atual").notNull(),
  parcelaTotal: smallint("parcela_total").notNull(),
  mesInicio: char("mes_inicio", { length: 7 }).notNull(),
  origem: text("origem"),
  cartaoOrigem: text("cartao_origem"),
  categoria: text("categoria"),
  continuaIndefinidamente: boolean("continua_indefinidamente").notNull().default(false),
  faturaImportadaId: uuid("fatura_importada_id").references(() => faturasImportadas.id),
  /** Dia do mês (1-31) de vencimento — só relevante pra empréstimos/financiamentos manuais (origem null/"manual"); compras de cartão são cobradas juntas na fatura, que tem o próprio dia via `cartoes`. */
  diaVencimento: smallint("dia_vencimento"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Status pago/pendente por mês de uma despesa fixa, cartão OU empréstimo
 * manual (só um dos três) — usado na tela de Contas a pagar. `unique()`
 * sobre coluna nullable no Postgres só restringe as linhas onde ela não é
 * nula, então as três constraints convivem sem conflito.
 */
export const contaPagamentos = pgTable(
  "quitado_conta_pagamentos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    despesaFixaId: uuid("despesa_fixa_id").references(() => despesasFixas.id, { onDelete: "cascade" }),
    cartaoId: uuid("cartao_id").references(() => cartoes.id, { onDelete: "cascade" }),
    parcelamentoId: uuid("parcelamento_id").references(() => parcelamentos.id, { onDelete: "cascade" }),
    mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
    status: text("status").notNull().default("pendente"), // 'pendente' | 'pago'
    pagoEm: timestamp("pago_em", { withTimezone: true }),
  },
  (table) => ({
    despesaFixaMesUnique: unique().on(table.despesaFixaId, table.mesReferencia),
    cartaoMesUnique: unique().on(table.cartaoId, table.mesReferencia),
    parcelamentoMesUnique: unique().on(table.parcelamentoId, table.mesReferencia),
  }),
);

export const itensVariaveis = pgTable(
  "quitado_itens_variaveis",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
    valorCents: integer("valor_cents").notNull(),
  },
  (table) => ({
    nomeMesUnique: unique().on(table.householdId, table.nome, table.mesReferencia),
  }),
);

export const devedores = pgTable("quitado_devedores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  corHex: text("cor_hex"),
  ativo: boolean("ativo").notNull().default(true),
});

export const parcelasDevedor = pgTable(
  "quitado_parcelas_devedor",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    devedorId: uuid("devedor_id")
      .notNull()
      .references(() => devedores.id, { onDelete: "cascade" }),
    mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
    valorCents: integer("valor_cents").notNull(),
    status: text("status").notNull().default("pendente"), // 'pendente' | 'pago'
    pagoEm: timestamp("pago_em", { withTimezone: true }),
  },
  (table) => ({
    devedorMesUnique: unique().on(table.devedorId, table.mesReferencia),
  }),
);

export const reembolsos = pgTable("quitado_reembolsos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  valorCents: integer("valor_cents").notNull(),
  mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
  devedorId: uuid("devedor_id").references(() => devedores.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Meta de poupança — uma por household (era uma linha global fixa `id=1`, agora chaveada por household). */
export const metaPoupanca = pgTable("quitado_meta_poupanca", {
  householdId: uuid("household_id")
    .primaryKey()
    .references(() => households.id, { onDelete: "cascade" }),
  valorAlvoCents: integer("valor_alvo_cents").notNull(),
  prazo: char("prazo", { length: 7 }).notNull(),
  aporteMensalCents: integer("aporte_mensal_cents").notNull(),
  acumuladoCents: integer("acumulado_cents").notNull().default(0),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Histórico de aportes guardados por mês — alimenta a tela de histórico e o desconto do aporte no saldo do mês. */
export const metaPoupancaAportes = pgTable("quitado_meta_poupanca_aportes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
  valorCents: integer("valor_cents").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const faturasImportadas = pgTable("quitado_faturas_importadas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  tipoOrigem: text("tipo_origem").notNull(), // 'pdf_imagem_ia' | 'csv_nubank' — MÉTODO de extração, não o banco
  /** Banco/cartão real (ex: "Inter", "Nubank") — independente do método de extração, já que qualquer banco pode mandar PDF ou CSV. */
  origem: text("origem"),
  nomeArquivo: text("nome_arquivo").notNull(),
  arquivoStorageKey: text("arquivo_storage_key"),
  /** SHA-256 do conteúdo do arquivo — detecta reimportação do mesmo arquivo. Nulo só em faturas antigas, anteriores a este campo. */
  arquivoHash: text("arquivo_hash"),
  /** Sugestão de mês de referência (data de vencimento extraída pelo Gemini) — null no caminho CSV. */
  mesReferenciaSugerido: char("mes_referencia_sugerido", { length: 7 }),
  /** Nome do titular do cartão lido no documento pelo Gemini (ex: "Leticia Mendes") — null no caminho CSV ou se não achou. Usado só pra sugerir qual cartão cadastrado bate, nunca confirmado sem o usuário revisar. */
  titularSugerido: text("titular_sugerido"),
  /** Nome do banco/emissor lido no documento pelo Gemini (ex: "Inter") — mais confiável que adivinhar pelo nome do arquivo. Null no caminho CSV ou se não achou. */
  bancoSugerido: text("banco_sugerido"),
  /** Total da fatura impresso no documento, lido pelo Gemini (centavos) — usado só pra conferir contra a soma dos itens na revisão. Null no caminho CSV ou se não achou. */
  totalFaturaSugeridoCents: integer("total_fatura_sugerido_cents"),
  jsonExtraido: jsonb("json_extraido").notNull(),
  jsonConfirmado: jsonb("json_confirmado"),
  status: text("status").notNull().default("pendente_revisao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
});
