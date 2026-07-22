import type { ConfirmarFaturaRequest, ItemFaturaStaged } from "@quitado/shared-types";
import { api } from "./client.js";
import type {
  CartaoRow,
  ConfigRow,
  ContaPagamentoRow,
  ConviteRow,
  DashboardResponse,
  DespesaFixaOverrideRow,
  DespesaFixaRow,
  DevedorRow,
  FaturaImportadaRow,
  HouseholdRow,
  MembroHousehold,
  MetaAporteRow,
  MetaCategoria,
  MetaRow,
  MinhaFamilia,
  MoedaSalario,
  ParcelaDevedorRow,
  ParcelamentoRow,
  ReembolsoRow,
  UsuarioAtual,
} from "./types.js";

export const authApi = {
  logout: () => api.post<{ ok: true }>("/auth/logout"),
  obterUsuarioAtual: () => api.get<UsuarioAtual>("/auth/me"),
  listarMinhasFamilias: () => api.get<MinhaFamilia[]>("/auth/minhas-familias"),
  trocarFamilia: (householdId: string) => api.post<{ ok: true }>("/auth/trocar-familia", { householdId }),
};

export const householdApi = {
  obter: () => api.get<HouseholdRow>("/household"),
  atualizar: (nome: string) => api.patch<HouseholdRow>("/household", { nome }),
  listarConvites: () => api.get<ConviteRow[]>("/household/convites"),
  criarConvite: () => api.post<ConviteRow>("/household/convites"),
  removerConvite: (id: string) => api.delete<void>(`/household/convites/${id}`),
  aceitarConvite: (token: string) => api.post<{ ok: true }>(`/household/convites/${token}/aceitar`),
  removerMembro: (userId: string) => api.delete<void>(`/household/membros/${userId}`),
  promoverDono: (userId: string) => api.post<MembroHousehold>(`/household/membros/${userId}/promover`),
  sair: () => api.post<{ ok: true; semFamilia: boolean }>("/household/sair"),
};

export const configApi = {
  obter: () => api.get<ConfigRow>("/config"),
  atualizar: (input: Partial<{ salarioCents: number; moedaSalario: MoedaSalario; cotacaoBrl: number; mesAtualOverride: string | null }>) =>
    api.patch<ConfigRow>("/config", input),
  obterCotacaoAtual: (moeda: "EUR" | "USD") => api.get<{ cotacao: number }>(`/config/cotacao?moeda=${moeda}`),
};

export const dashboardApi = {
  obter: () => api.get<DashboardResponse>("/dashboard"),
};

export const despesasFixasApi = {
  listar: () => api.get<DespesaFixaRow[]>("/despesas-fixas"),
  criar: (input: {
    nome: string;
    valorCents: number;
    categoria?: string | null;
    ativo?: boolean;
    diaVencimento?: number | null;
  }) => api.post<DespesaFixaRow>("/despesas-fixas", input),
  atualizar: (
    id: string,
    input: Partial<{
      nome: string;
      valorCents: number;
      categoria: string | null;
      ativo: boolean;
      diaVencimento: number | null;
    }>,
  ) => api.patch<DespesaFixaRow>(`/despesas-fixas/${id}`, input),
  remover: (id: string) => api.delete<void>(`/despesas-fixas/${id}`),
};

export const despesaFixaOverridesApi = {
  listar: (mes?: string) => api.get<DespesaFixaOverrideRow[]>(`/despesa-fixa-overrides${mes ? `?mes=${mes}` : ""}`),
  salvar: (input: { despesaFixaId: string; mesReferencia: string; valorCents: number }) =>
    api.post<DespesaFixaOverrideRow>("/despesa-fixa-overrides", input),
  remover: (id: string) => api.delete<void>(`/despesa-fixa-overrides/${id}`),
};

export const cartoesApi = {
  listar: () => api.get<CartaoRow[]>("/cartoes"),
  criar: (input: { nome: string; diaVencimento?: number | null; corHex?: string | null }) =>
    api.post<CartaoRow>("/cartoes", input),
  atualizar: (id: string, input: Partial<{ nome: string; diaVencimento: number | null; corHex: string | null; ativo: boolean }>) =>
    api.patch<CartaoRow>(`/cartoes/${id}`, input),
  remover: (id: string) => api.delete<void>(`/cartoes/${id}`),
};

export const contaPagamentosApi = {
  listar: (mes?: string) => api.get<ContaPagamentoRow[]>(`/conta-pagamentos${mes ? `?mes=${mes}` : ""}`),
  marcar: (input: {
    despesaFixaId?: string | null;
    cartaoId?: string | null;
    parcelamentoId?: string | null;
    mesReferencia: string;
    status: "pendente" | "pago";
  }) => api.post<ContaPagamentoRow>("/conta-pagamentos", input),
};

export const parcelamentosApi = {
  listar: () => api.get<ParcelamentoRow[]>("/parcelamentos"),
  criar: (input: Omit<ParcelamentoRow, "id" | "faturaImportadaId" | "diaVencimento"> & { diaVencimento?: number | null }) =>
    api.post<ParcelamentoRow>("/parcelamentos", input),
  atualizar: (id: string, input: Partial<Omit<ParcelamentoRow, "id">>) =>
    api.patch<ParcelamentoRow>(`/parcelamentos/${id}`, input),
  remover: (id: string) => api.delete<void>(`/parcelamentos/${id}`),
};

export const devedoresApi = {
  listar: () => api.get<DevedorRow[]>("/devedores"),
  criar: (input: { nome: string; corHex?: string | null }) => api.post<DevedorRow>("/devedores", input),
  remover: (id: string) => api.delete<void>(`/devedores/${id}`),
  listarParcelas: (devedorId?: string) =>
    api.get<ParcelaDevedorRow[]>(`/parcelas-devedor${devedorId ? `?devedorId=${devedorId}` : ""}`),
  upsertParcela: (input: { devedorId: string; mesReferencia: string; valorCents: number }) =>
    api.post<ParcelaDevedorRow>("/parcelas-devedor", input),
  upsertParcelasEmLote: (input: {
    devedorId: string;
    valorCents: number;
    mesInicio: string;
    quantidadeMeses: number;
  }) => api.post<ParcelaDevedorRow[]>("/parcelas-devedor/lote", input),
  marcarParcela: (id: string, status: "pendente" | "pago") =>
    api.patch<ParcelaDevedorRow>(`/parcelas-devedor/${id}`, { status }),
};

export const reembolsosApi = {
  listar: (mes?: string) => api.get<ReembolsoRow[]>(`/reembolsos${mes ? `?mes=${mes}` : ""}`),
  criar: (input: { descricao: string; valorCents: number; mesReferencia: string; devedorId?: string | null }) =>
    api.post<ReembolsoRow>("/reembolsos", input),
  remover: (id: string) => api.delete<void>(`/reembolsos/${id}`),
};

export const metasApi = {
  listar: () => api.get<MetaRow[]>("/metas"),
  criar: (input: { nome: string; categoria: MetaCategoria; valorAlvoCents: number; prazo: string; acumuladoCents?: number }) =>
    api.post<MetaRow>("/metas", input),
  atualizar: (id: string, input: Partial<{ nome: string; categoria: MetaCategoria; valorAlvoCents: number; prazo: string; acumuladoCents: number }>) =>
    api.patch<MetaRow>(`/metas/${id}`, input),
  remover: (id: string) => api.delete<void>(`/metas/${id}`),
  listarAportes: (metaId: string) => api.get<MetaAporteRow[]>(`/metas/${metaId}/aportes`),
  registrarAporte: (metaId: string, input: { mesReferencia: string; valorCents: number }) =>
    api.post<{ aporte: MetaAporteRow; meta: MetaRow }>(`/metas/${metaId}/aportes`, input),
  editarAporte: (metaId: string, aporteId: string, input: Partial<{ mesReferencia: string; valorCents: number }>) =>
    api.patch<{ aporte: MetaAporteRow; meta: MetaRow }>(`/metas/${metaId}/aportes/${aporteId}`, input),
  removerAporte: (metaId: string, aporteId: string) =>
    api.delete<{ meta: MetaRow }>(`/metas/${metaId}/aportes/${aporteId}`),
};

export interface ConfirmarFaturaResponse extends FaturaImportadaRow {
  itensInseridos: number;
  duplicadosIgnorados: number;
}

export const faturasApi = {
  listar: () => api.get<FaturaImportadaRow[]>("/faturas"),
  obter: (id: string) => api.get<FaturaImportadaRow>(`/faturas/${id}`),
  ultimaPorOrigem: () => api.get<Record<string, string>>("/faturas/ultima-por-origem"),
  upload: (input: { nomeArquivo: string; mimeType: string; conteudoBase64: string; tipoOrigem: "pdf_imagem_ia" | "csv_nubank" }) =>
    api.post<FaturaImportadaRow>("/faturas", input),
  confirmar: (input: ConfirmarFaturaRequest) => api.post<ConfirmarFaturaResponse>("/faturas/confirmar", input),
  descartar: (id: string) => api.post<FaturaImportadaRow>(`/faturas/${id}/descartar`),
  remover: (id: string) => api.delete<void>(`/faturas/${id}`),
};

export type { ItemFaturaStaged };
