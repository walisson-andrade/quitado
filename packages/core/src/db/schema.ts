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
 * App single-user: em vez de uma tabela users/tenants, uma única linha
 * (CHECK id = 1) guarda tanto a credencial do único usuário quanto
 * configuração global. Migrar para multi-usuário no futuro seria adicionar
 * uma FK usuario_id nas tabelas abaixo, não reinventar autenticação.
 */
export const appConfig = pgTable("quitado_app_config", {
  id: smallint("id").primaryKey().default(1),
  passwordHash: text("password_hash").notNull(),
  salarioEurCents: integer("salario_eur_cents").notNull().default(0),
  eurBrlRate: numeric("eur_brl_rate", { precision: 10, scale: 4 }).notNull().default("1.0"),
  mesAtualOverride: char("mes_atual_override", { length: 7 }),
  tokenVersion: integer("token_version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const despesasFixas = pgTable("quitado_despesas_fixas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  valorCents: integer("valor_cents").notNull(),
  categoria: text("categoria"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Cobre parcelamentos, empréstimos e compras à vista (parcelaTotal = 1). */
export const parcelamentos = pgTable("quitado_parcelamentos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const itensVariaveis = pgTable(
  "quitado_itens_variaveis",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
    valorCents: integer("valor_cents").notNull(),
  },
  (table) => ({
    nomeMesUnique: unique().on(table.nome, table.mesReferencia),
  }),
);

export const devedores = pgTable("quitado_devedores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  corHex: text("cor_hex"),
  ativo: boolean("ativo").notNull().default(true),
});

export const parcelasDevedor = pgTable(
  "quitado_parcelas_devedor",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
  descricao: text("descricao").notNull(),
  valorCents: integer("valor_cents").notNull(),
  mesReferencia: char("mes_referencia", { length: 7 }).notNull(),
  devedorId: uuid("devedor_id").references(() => devedores.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const metaPoupanca = pgTable("quitado_meta_poupanca", {
  id: smallint("id").primaryKey().default(1),
  valorAlvoCents: integer("valor_alvo_cents").notNull(),
  prazo: char("prazo", { length: 7 }).notNull(),
  aporteMensalCents: integer("aporte_mensal_cents").notNull(),
  acumuladoCents: integer("acumulado_cents").notNull().default(0),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const faturasImportadas = pgTable("quitado_faturas_importadas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tipoOrigem: text("tipo_origem").notNull(), // 'pdf_imagem_ia' | 'csv_nubank' — MÉTODO de extração, não o banco
  /** Banco/cartão real (ex: "Inter", "Nubank") — independente do método de extração, já que qualquer banco pode mandar PDF ou CSV. */
  origem: text("origem"),
  nomeArquivo: text("nome_arquivo").notNull(),
  arquivoStorageKey: text("arquivo_storage_key"),
  /** SHA-256 do conteúdo do arquivo — detecta reimportação do mesmo arquivo. Nulo só em faturas antigas, anteriores a este campo. */
  arquivoHash: text("arquivo_hash"),
  /** Sugestão de mês de referência (data de vencimento extraída pelo Gemini) — null no caminho CSV. */
  mesReferenciaSugerido: char("mes_referencia_sugerido", { length: 7 }),
  jsonExtraido: jsonb("json_extraido").notNull(),
  jsonConfirmado: jsonb("json_confirmado"),
  status: text("status").notNull().default("pendente_revisao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
});
