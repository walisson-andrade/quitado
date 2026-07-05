import { z } from "zod";
import { MesReferenciaSchema } from "./mes.js";

export const DespesaFixaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  valorCents: z.number().int().nonnegative(),
  categoria: z.string().nullable(),
  ativo: z.boolean(),
});
export type DespesaFixa = z.infer<typeof DespesaFixaSchema>;

export const DespesaFixaInputSchema = DespesaFixaSchema.omit({ id: true }).extend({
  categoria: z.string().nullable().optional(),
});
export type DespesaFixaInput = z.infer<typeof DespesaFixaInputSchema>;

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

export const AppConfigPublicSchema = z.object({
  eurBrlRate: z.number().positive(),
  mesAtualOverride: MesReferenciaSchema.nullable(),
});
export type AppConfigPublic = z.infer<typeof AppConfigPublicSchema>;
