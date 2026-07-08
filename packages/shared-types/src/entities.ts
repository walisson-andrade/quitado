import { z } from "zod";
import { MesReferenciaSchema } from "./mes.js";

/** Dia do mês (1-31) em que uma conta vence — nulo quando ainda não configurado. */
export const DiaVencimentoSchema = z.number().int().min(1).max(31).nullable();

export const DespesaFixaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  valorCents: z.number().int().nonnegative(),
  categoria: z.string().nullable(),
  ativo: z.boolean(),
  diaVencimento: DiaVencimentoSchema,
});
export type DespesaFixa = z.infer<typeof DespesaFixaSchema>;

export const DespesaFixaInputSchema = DespesaFixaSchema.omit({ id: true }).extend({
  categoria: z.string().nullable().optional(),
  diaVencimento: DiaVencimentoSchema.optional(),
});
export type DespesaFixaInput = z.infer<typeof DespesaFixaInputSchema>;

export const DespesaFixaOverrideSchema = z.object({
  id: z.string().uuid(),
  despesaFixaId: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().nonnegative(),
});
export type DespesaFixaOverride = z.infer<typeof DespesaFixaOverrideSchema>;

export const DespesaFixaOverrideInputSchema = z.object({
  despesaFixaId: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().nonnegative(),
});
export type DespesaFixaOverrideInput = z.infer<typeof DespesaFixaOverrideInputSchema>;

export const CartaoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  diaVencimento: DiaVencimentoSchema,
  corHex: z.string().nullable(),
  ativo: z.boolean(),
});
export type Cartao = z.infer<typeof CartaoSchema>;

export const CartaoInputSchema = CartaoSchema.omit({ id: true }).extend({
  diaVencimento: DiaVencimentoSchema.optional(),
  corHex: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});
export type CartaoInput = z.infer<typeof CartaoInputSchema>;

export const ContaPagamentoStatusSchema = z.enum(["pendente", "pago"]);

export const ContaPagamentoSchema = z.object({
  id: z.string().uuid(),
  despesaFixaId: z.string().uuid().nullable(),
  cartaoId: z.string().uuid().nullable(),
  parcelamentoId: z.string().uuid().nullable(),
  mesReferencia: MesReferenciaSchema,
  status: ContaPagamentoStatusSchema,
  pagoEm: z.string().nullable(),
});
export type ContaPagamento = z.infer<typeof ContaPagamentoSchema>;

export const MarcarContaPagamentoInputSchema = z
  .object({
    despesaFixaId: z.string().uuid().nullable().optional(),
    cartaoId: z.string().uuid().nullable().optional(),
    parcelamentoId: z.string().uuid().nullable().optional(),
    mesReferencia: MesReferenciaSchema,
    status: ContaPagamentoStatusSchema,
  })
  .refine((v) => (v.despesaFixaId ? 1 : 0) + (v.cartaoId ? 1 : 0) + (v.parcelamentoId ? 1 : 0) === 1, {
    message: "Informe exatamente um de despesaFixaId, cartaoId ou parcelamentoId",
  });
export type MarcarContaPagamentoInput = z.infer<typeof MarcarContaPagamentoInputSchema>;

/** Cobre parcelamentos, empréstimos e compras à vista (parcelaTotal = 1). */
export const ParcelamentoSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  valorParcelaCents: z.number().int().positive(),
  parcelaAtual: z.number().int().positive(),
  parcelaTotal: z.number().int().positive(),
  mesInicio: MesReferenciaSchema,
  origem: z.string().nullable(),
  cartaoOrigem: z.string().nullable(),
  categoria: z.string().nullable(),
  continuaIndefinidamente: z.boolean(),
  faturaImportadaId: z.string().uuid().nullable(),
  diaVencimento: DiaVencimentoSchema,
}).refine((p) => p.parcelaTotal >= p.parcelaAtual, {
  message: "parcelaTotal deve ser >= parcelaAtual",
});
export type Parcelamento = z.infer<typeof ParcelamentoSchema>;

export const ParcelamentoInputSchema = z.object({
  nome: z.string().min(1),
  valorParcelaCents: z.number().int().positive(),
  parcelaAtual: z.number().int().positive(),
  parcelaTotal: z.number().int().positive(),
  mesInicio: MesReferenciaSchema,
  origem: z.string().nullable().optional(),
  cartaoOrigem: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  continuaIndefinidamente: z.boolean().optional(),
  diaVencimento: DiaVencimentoSchema.optional(),
});
export type ParcelamentoInput = z.infer<typeof ParcelamentoInputSchema>;

export const ItemVariavelSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int(),
});
export type ItemVariavel = z.infer<typeof ItemVariavelSchema>;

export const DevedorSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  corHex: z.string().nullable(),
  ativo: z.boolean(),
});
export type Devedor = z.infer<typeof DevedorSchema>;

export const ParcelaDevedorStatusSchema = z.enum(["pendente", "pago"]);

export const ParcelaDevedorSchema = z.object({
  id: z.string().uuid(),
  devedorId: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().positive(),
  status: ParcelaDevedorStatusSchema,
  pagoEm: z.string().nullable(),
});
export type ParcelaDevedor = z.infer<typeof ParcelaDevedorSchema>;

export const ReembolsoSchema = z.object({
  id: z.string().uuid(),
  descricao: z.string().min(1),
  valorCents: z.number().int().positive(),
  mesReferencia: MesReferenciaSchema,
  devedorId: z.string().uuid().nullable(),
});
export type Reembolso = z.infer<typeof ReembolsoSchema>;

export const MetaPoupancaSchema = z.object({
  valorAlvoCents: z.number().int().positive(),
  prazo: MesReferenciaSchema,
  aporteMensalCents: z.number().int().nonnegative(),
  acumuladoCents: z.number().int().nonnegative(),
});
export type MetaPoupanca = z.infer<typeof MetaPoupancaSchema>;

export const MetaAporteSchema = z.object({
  id: z.string().uuid(),
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().positive(),
  criadoEm: z.string(),
});
export type MetaAporte = z.infer<typeof MetaAporteSchema>;

export const MetaAporteInputSchema = z.object({
  mesReferencia: MesReferenciaSchema,
  valorCents: z.number().int().positive(),
});
export type MetaAporteInput = z.infer<typeof MetaAporteInputSchema>;

export const AppConfigPublicSchema = z.object({
  eurBrlRate: z.number().positive(),
  mesAtualOverride: MesReferenciaSchema.nullable(),
});
export type AppConfigPublic = z.infer<typeof AppConfigPublicSchema>;
