import type { Handler } from "./handlers/types.js";
import { withAuth } from "./handlers/auth.js";
import * as authHandlers from "./handlers/auth.js";
import * as cartoesHandlers from "./handlers/cartoes.js";
import * as configHandlers from "./handlers/config.js";
import * as contaPagamentosHandlers from "./handlers/contaPagamentos.js";
import * as dashboardHandlers from "./handlers/dashboard.js";
import * as despesaFixaOverridesHandlers from "./handlers/despesaFixaOverrides.js";
import * as despesasFixasHandlers from "./handlers/despesasFixas.js";
import * as devedoresHandlers from "./handlers/devedores.js";
import * as faturasHandlers from "./handlers/faturas.js";
import * as householdHandlers from "./handlers/household.js";
import * as itensVariaveisHandlers from "./handlers/itensVariaveis.js";
import * as metaPoupancaHandlers from "./handlers/metaPoupanca.js";
import * as parcelamentosHandlers from "./handlers/parcelamentos.js";
import * as reembolsosHandlers from "./handlers/reembolsos.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface Route {
  method: HttpMethod;
  /** ex: '/despesas-fixas/:id' */
  pattern: string;
  handler: Handler<any, any, any>;
}

function protegida(handler: Handler<any, any, any>): Handler<any, any, any> {
  return withAuth(handler);
}

/**
 * Tabela única de rotas usada tanto pelo adapter Fastify (dev/Docker)
 * quanto pela function catch-all da Vercel (prod) — as rotas em si nunca
 * são reimplementadas entre os dois ambientes, só o transporte muda.
 */
export const routes: Route[] = [
  { method: "GET", pattern: "/auth/google/login", handler: authHandlers.iniciarLoginGoogle },
  { method: "GET", pattern: "/auth/google/callback", handler: authHandlers.callbackGoogle },
  { method: "POST", pattern: "/auth/logout", handler: authHandlers.logout },
  { method: "GET", pattern: "/auth/me", handler: protegida(authHandlers.obterUsuarioAtual) },
  { method: "GET", pattern: "/auth/minhas-familias", handler: protegida(authHandlers.listarMinhasFamilias) },
  { method: "POST", pattern: "/auth/trocar-familia", handler: protegida(authHandlers.trocarFamilia) },

  { method: "GET", pattern: "/household", handler: protegida(householdHandlers.obterHousehold) },
  { method: "PATCH", pattern: "/household", handler: protegida(householdHandlers.atualizarHousehold) },
  { method: "GET", pattern: "/household/convites", handler: protegida(householdHandlers.listarConvitesPendentes) },
  { method: "POST", pattern: "/household/convites", handler: protegida(householdHandlers.criarConvite) },
  { method: "DELETE", pattern: "/household/convites/:id", handler: protegida(householdHandlers.removerConvite) },
  { method: "POST", pattern: "/household/convites/:token/aceitar", handler: protegida(householdHandlers.aceitarConvite) },
  { method: "DELETE", pattern: "/household/membros/:userId", handler: protegida(householdHandlers.removerMembro) },

  { method: "GET", pattern: "/config", handler: protegida(configHandlers.obterConfig) },
  { method: "PATCH", pattern: "/config", handler: protegida(configHandlers.atualizarConfig) },

  { method: "GET", pattern: "/dashboard", handler: protegida(dashboardHandlers.obterDashboard) },

  { method: "GET", pattern: "/despesas-fixas", handler: protegida(despesasFixasHandlers.listarDespesasFixas) },
  { method: "POST", pattern: "/despesas-fixas", handler: protegida(despesasFixasHandlers.criarDespesaFixa) },
  {
    method: "PATCH",
    pattern: "/despesas-fixas/:id",
    handler: protegida(despesasFixasHandlers.atualizarDespesaFixa),
  },
  {
    method: "DELETE",
    pattern: "/despesas-fixas/:id",
    handler: protegida(despesasFixasHandlers.removerDespesaFixa),
  },

  {
    method: "GET",
    pattern: "/despesa-fixa-overrides",
    handler: protegida(despesaFixaOverridesHandlers.listarDespesaFixaOverrides),
  },
  {
    method: "POST",
    pattern: "/despesa-fixa-overrides",
    handler: protegida(despesaFixaOverridesHandlers.upsertDespesaFixaOverride),
  },
  {
    method: "DELETE",
    pattern: "/despesa-fixa-overrides/:id",
    handler: protegida(despesaFixaOverridesHandlers.removerDespesaFixaOverride),
  },

  { method: "GET", pattern: "/parcelamentos", handler: protegida(parcelamentosHandlers.listarParcelamentos) },
  { method: "POST", pattern: "/parcelamentos", handler: protegida(parcelamentosHandlers.criarParcelamento) },
  {
    method: "PATCH",
    pattern: "/parcelamentos/:id",
    handler: protegida(parcelamentosHandlers.atualizarParcelamento),
  },
  {
    method: "DELETE",
    pattern: "/parcelamentos/:id",
    handler: protegida(parcelamentosHandlers.removerParcelamento),
  },

  { method: "GET", pattern: "/itens-variaveis", handler: protegida(itensVariaveisHandlers.listarItensVariaveis) },
  { method: "POST", pattern: "/itens-variaveis", handler: protegida(itensVariaveisHandlers.upsertItemVariavel) },
  {
    method: "DELETE",
    pattern: "/itens-variaveis/:id",
    handler: protegida(itensVariaveisHandlers.removerItemVariavel),
  },

  { method: "GET", pattern: "/devedores", handler: protegida(devedoresHandlers.listarDevedores) },
  { method: "POST", pattern: "/devedores", handler: protegida(devedoresHandlers.criarDevedor) },
  { method: "DELETE", pattern: "/devedores/:id", handler: protegida(devedoresHandlers.removerDevedor) },
  {
    method: "GET",
    pattern: "/parcelas-devedor",
    handler: protegida(devedoresHandlers.listarParcelasDevedor),
  },
  {
    method: "POST",
    pattern: "/parcelas-devedor",
    handler: protegida(devedoresHandlers.upsertParcelaDevedor),
  },
  {
    method: "POST",
    pattern: "/parcelas-devedor/lote",
    handler: protegida(devedoresHandlers.upsertParcelasDevedorEmLote),
  },
  {
    method: "PATCH",
    pattern: "/parcelas-devedor/:id",
    handler: protegida(devedoresHandlers.marcarParcelaDevedor),
  },

  { method: "GET", pattern: "/reembolsos", handler: protegida(reembolsosHandlers.listarReembolsos) },
  { method: "POST", pattern: "/reembolsos", handler: protegida(reembolsosHandlers.criarReembolso) },
  { method: "DELETE", pattern: "/reembolsos/:id", handler: protegida(reembolsosHandlers.removerReembolso) },

  { method: "GET", pattern: "/cartoes", handler: protegida(cartoesHandlers.listarCartoes) },
  { method: "POST", pattern: "/cartoes", handler: protegida(cartoesHandlers.criarCartao) },
  { method: "PATCH", pattern: "/cartoes/:id", handler: protegida(cartoesHandlers.atualizarCartao) },
  { method: "DELETE", pattern: "/cartoes/:id", handler: protegida(cartoesHandlers.removerCartao) },

  {
    method: "GET",
    pattern: "/conta-pagamentos",
    handler: protegida(contaPagamentosHandlers.listarContaPagamentos),
  },
  {
    method: "POST",
    pattern: "/conta-pagamentos",
    handler: protegida(contaPagamentosHandlers.marcarContaPagamento),
  },

  { method: "GET", pattern: "/meta-poupanca", handler: protegida(metaPoupancaHandlers.obterMetaPoupanca) },
  { method: "PUT", pattern: "/meta-poupanca", handler: protegida(metaPoupancaHandlers.atualizarMetaPoupanca) },
  { method: "GET", pattern: "/meta-poupanca/aportes", handler: protegida(metaPoupancaHandlers.listarAportesMeta) },
  {
    method: "POST",
    pattern: "/meta-poupanca/aportes",
    handler: protegida(metaPoupancaHandlers.registrarAporteMeta),
  },
  {
    method: "PATCH",
    pattern: "/meta-poupanca/aportes/:id",
    handler: protegida(metaPoupancaHandlers.editarAporteMeta),
  },
  {
    method: "DELETE",
    pattern: "/meta-poupanca/aportes/:id",
    handler: protegida(metaPoupancaHandlers.excluirAporteMeta),
  },

  { method: "GET", pattern: "/faturas", handler: protegida(faturasHandlers.listarFaturas) },
  { method: "POST", pattern: "/faturas", handler: protegida(faturasHandlers.criarFaturaUpload) },
  {
    method: "GET",
    pattern: "/faturas/ultima-por-origem",
    handler: protegida(faturasHandlers.obterUltimaFaturaPorOrigem),
  },
  { method: "GET", pattern: "/faturas/:id", handler: protegida(faturasHandlers.obterFatura) },
  { method: "GET", pattern: "/faturas/:id/arquivo", handler: protegida(faturasHandlers.obterArquivoFatura) },
  { method: "POST", pattern: "/faturas/confirmar", handler: protegida(faturasHandlers.confirmarFatura) },
  { method: "POST", pattern: "/faturas/:id/descartar", handler: protegida(faturasHandlers.descartarFatura) },
  { method: "DELETE", pattern: "/faturas/:id", handler: protegida(faturasHandlers.removerFaturaImportada) },
];

export interface MatchResult {
  route: Route;
  params: Record<string, string>;
}

/** Matcher simples de path com segmentos `:param` — sem dependência externa. */
export function matchRoute(method: HttpMethod, path: string): MatchResult | null {
  const pathSegments = path.split("/").filter(Boolean);

  for (const route of routes) {
    if (route.method !== method) continue;
    const patternSegments = route.pattern.split("/").filter(Boolean);
    if (patternSegments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i++) {
      const p = patternSegments[i]!;
      const s = pathSegments[i]!;
      if (p.startsWith(":")) {
        params[p.slice(1)] = decodeURIComponent(s);
      } else if (p !== s) {
        matched = false;
        break;
      }
    }

    if (matched) return { route, params };
  }

  return null;
}
