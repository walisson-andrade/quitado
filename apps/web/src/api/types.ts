import type { ItemFaturaStaged, MesReferencia } from "@quitado/shared-types";

export interface DespesaFixaRow {
  id: string;
  nome: string;
  valorCents: number;
  categoria: string | null;
  ativo: boolean;
  diaVencimento: number | null;
}

export interface DespesaFixaOverrideRow {
  id: string;
  despesaFixaId: string;
  mesReferencia: MesReferencia;
  valorCents: number;
}

export interface CartaoRow {
  id: string;
  nome: string;
  diaVencimento: number | null;
  corHex: string | null;
  ativo: boolean;
}

export interface ContaPagamentoRow {
  id: string;
  despesaFixaId: string | null;
  cartaoId: string | null;
  parcelamentoId: string | null;
  mesReferencia: MesReferencia;
  status: "pendente" | "pago";
  pagoEm: string | null;
}

export interface ParcelamentoRow {
  id: string;
  nome: string;
  valorParcelaCents: number;
  parcelaAtual: number;
  parcelaTotal: number;
  mesInicio: MesReferencia;
  origem: string | null;
  cartaoOrigem: string | null;
  categoria: string | null;
  continuaIndefinidamente: boolean;
  faturaImportadaId: string | null;
  diaVencimento: number | null;
}

export interface DevedorRow {
  id: string;
  nome: string;
  corHex: string | null;
  ativo: boolean;
}

export interface ParcelaDevedorRow {
  id: string;
  devedorId: string;
  mesReferencia: MesReferencia;
  valorCents: number;
  status: "pendente" | "pago";
  pagoEm: string | null;
}

export interface ReembolsoRow {
  id: string;
  descricao: string;
  valorCents: number;
  mesReferencia: MesReferencia;
  devedorId: string | null;
}

export interface MetaPoupancaRow {
  valorAlvoCents: number;
  prazo: MesReferencia;
  aporteMensalCents: number;
  acumuladoCents: number;
}

export interface MetaAporteRow {
  id: string;
  mesReferencia: MesReferencia;
  valorCents: number;
  criadoEm: string;
}

export interface FaturaImportadaRow {
  id: string;
  tipoOrigem: "pdf_imagem_ia" | "csv_nubank";
  origem: string | null;
  nomeArquivo: string;
  arquivoStorageKey: string | null;
  mesReferenciaSugerido: MesReferencia | null;
  titularSugerido: string | null;
  bancoSugerido: string | null;
  totalFaturaSugeridoCents: number | null;
  jsonExtraido: ItemFaturaStaged[];
  jsonConfirmado: ItemFaturaStaged[] | null;
  status: "processando" | "pendente_revisao" | "confirmado" | "descartado";
  criadoEm: string;
  confirmadoEm: string | null;
}

export interface ConfigRow {
  salarioEurCents: number;
  eurBrlRate: number | null;
  mesAtualOverride: MesReferencia | null;
  mesAtual: MesReferencia;
}

export interface SaldoMensalResultado {
  rendaCents: number;
  despesasFixasCents: number;
  parcelamentosCents: number;
  itensVariaveisCents: number;
  reembolsosCents: number;
  recebidoDevedoresCents: number;
  aportesMetaCents: number;
  totalDespesasCents: number;
  saldoCents: number;
}

export interface OrigemItemDetalhe {
  nome: string;
  valorCents: number;
}

export interface CategoriaTotal {
  categoria: string;
  label: string;
  totalCents: number;
  itens: OrigemItemDetalhe[];
}

export interface OrigemTotal {
  /** "fixo" pro balde de despesas fixas + parcelamentos manuais, ou o nome do cartão/banco pra qualquer outra origem. */
  origem: string;
  label: string;
  totalCents: number;
  itens: OrigemItemDetalhe[];
}

export interface DashboardResponse {
  mesAtual: MesReferencia;
  eurBrlRate: number;
  projecao: Array<{ mes: MesReferencia; saldo: SaldoMensalResultado }>;
  saldoMesAtual: SaldoMensalResultado | null;
  porCategoria: CategoriaTotal[];
  porOrigem: OrigemTotal[];
}
