import type { ConfirmarFaturaRequest, ItemFaturaStaged } from "@quitado/shared-types";
import { api } from "./client.js";
import type {
  ConfigRow,
  DashboardResponse,
  DespesaFixaRow,
  DevedorRow,
  FaturaImportadaRow,
  MetaPoupancaRow,
  ParcelaDevedorRow,
  ParcelamentoRow,
  ReembolsoRow,
} from "./types.js";

export const authApi = {
  login: (senha: string) => api.post<{ ok: true }>("/auth/login", { senha }),
  logout: () => api.post<{ ok: true }>("/auth/logout"),
  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    api.post<{ ok: true }>("/auth/trocar-senha", { senhaAtual, novaSenha }),
};

export const configApi = {
  obter: () => api.get<ConfigRow>("/config"),
  atualizar: (input: Partial<{ salarioEurCents: number; eurBrlRate: number; mesAtualOverride: string | null }>) =>
    api.patch<ConfigRow>("/config", input),
};

export const dashboardApi = {
  obter: () => api.get<DashboardResponse>("/dashboard"),
};

export const despesasFixasApi = {
  listar: () => api.get<DespesaFixaRow[]>("/despesas-fixas"),
  criar: (input: { nome: string; valorCents: number; categoria?: string | null; ativo?: boolean }) =>
    api.post<DespesaFixaRow>("/despesas-fixas", input),
  atualizar: (
    id: string,
    input: Partial<{ nome: string; valorCents: number; categoria: string | null; ativo: boolean }>,
  ) => api.patch<DespesaFixaRow>(`/despesas-fixas/${id}`, input),
  remover: (id: string) => api.delete<void>(`/despesas-fixas/${id}`),
};

export const parcelamentosApi = {
  listar: () => api.get<ParcelamentoRow[]>("/parcelamentos"),
  criar: (input: Omit<ParcelamentoRow, "id" | "faturaImportadaId">) =>
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

export const metaPoupancaApi = {
  obter: () => api.get<MetaPoupancaRow | null>("/meta-poupanca"),
  atualizar: (input: MetaPoupancaRow) => api.put<MetaPoupancaRow>("/meta-poupanca", input),
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
};

export type { ItemFaturaStaged };
