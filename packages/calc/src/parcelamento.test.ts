import { describe, expect, it } from "vitest";
import {
  calcularTotalParcelamentosNoMes,
  calcularTotalParcelamentosNoMesHibrido,
  mesFinalParcelamento,
  parcelaAindaAtiva,
  parcelamentoContaNoMes,
  parcelaNoMes,
  parcelasRestantes,
  valorParcelamentoNoMes,
} from "./parcelamento.js";

describe("parcelaAindaAtiva — regra central do app", () => {
  it("está ativo na primeira parcela (parcelaAtual = 1)", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: false };
    expect(parcelaAindaAtiva(p, "2026-01")).toBe(true);
  });

  it("está ativo no mês da última parcela (parcelaAtual = parcelaTotal)", () => {
    // parcela 12 de 12, referente a jan/2026 -> ainda visível em jan/2026
    const p = { parcelaAtual: 12, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: false };
    expect(parcelaAindaAtiva(p, "2026-01")).toBe(true);
  });

  it("some no mês seguinte à última parcela", () => {
    const p = { parcelaAtual: 12, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: false };
    expect(parcelaAindaAtiva(p, "2026-02")).toBe(false);
  });

  it("cobre o meio do parcelamento: parcela 3 de 10 iniciado em jan/26 dura até out/26", () => {
    const p = { parcelaAtual: 3, parcelaTotal: 10, mesInicio: "2026-01", continuaIndefinidamente: false };
    // faltam 8 parcelas (10-3+1) a partir de jan/26 => ativo jan..ago (8 meses), some em set/26
    expect(parcelaAindaAtiva(p, "2026-01")).toBe(true);
    expect(parcelaAindaAtiva(p, "2026-08")).toBe(true);
    expect(parcelaAindaAtiva(p, "2026-09")).toBe(false);
  });

  it("ainda não começou antes do mesInicio", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 6, mesInicio: "2026-06", continuaIndefinidamente: false };
    expect(parcelaAindaAtiva(p, "2026-05")).toBe(false);
  });

  it("financiamento sem término definido nunca some depois de começar", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: true };
    expect(parcelaAindaAtiva(p, "2030-01")).toBe(true);
  });

  it("compra à vista (parcelaTotal = 1) some no mês seguinte", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 1, mesInicio: "2026-06", continuaIndefinidamente: false };
    expect(parcelaAindaAtiva(p, "2026-06")).toBe(true);
    expect(parcelaAindaAtiva(p, "2026-07")).toBe(false);
  });
});

describe("mesFinalParcelamento / parcelaNoMes / parcelasRestantes", () => {
  it("calcula o último mês visível corretamente", () => {
    const p = { parcelaAtual: 4, parcelaTotal: 10, mesInicio: "2026-04", continuaIndefinidamente: false };
    expect(mesFinalParcelamento(p)).toBe("2026-10"); // 2026-04 + (10-4)=6 meses
  });

  it("calcula o número da parcela em um mês futuro", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: false };
    expect(parcelaNoMes(p, "2026-04")).toBe(4);
  });

  it("parcelas restantes chega a zero após o fim", () => {
    const p = { parcelaAtual: 12, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: false };
    expect(parcelasRestantes(p, "2026-01")).toBe(1);
    expect(parcelasRestantes(p, "2026-02")).toBe(0);
  });

  it("parcelas restantes é infinito para financiamento indefinido", () => {
    const p = { parcelaAtual: 1, parcelaTotal: 12, mesInicio: "2026-01", continuaIndefinidamente: true };
    expect(parcelasRestantes(p, "2026-06")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("valorParcelamentoNoMes / calcularTotalParcelamentosNoMes", () => {
  it("retorna 0 quando o parcelamento já terminou", () => {
    const p = {
      parcelaAtual: 12,
      parcelaTotal: 12,
      mesInicio: "2026-01",
      continuaIndefinidamente: false,
      valorParcelaCents: 10000,
    };
    expect(valorParcelamentoNoMes(p, "2026-02")).toBe(0);
    expect(valorParcelamentoNoMes(p, "2026-01")).toBe(10000);
  });

  it("soma apenas os parcelamentos ativos no mês", () => {
    const ativo = {
      parcelaAtual: 1,
      parcelaTotal: 12,
      mesInicio: "2026-01",
      continuaIndefinidamente: false,
      valorParcelaCents: 10000,
    };
    const encerrado = {
      parcelaAtual: 12,
      parcelaTotal: 12,
      mesInicio: "2025-01",
      continuaIndefinidamente: false,
      valorParcelaCents: 5000,
    };
    expect(calcularTotalParcelamentosNoMes([ativo, encerrado], "2026-01")).toBe(10000);
  });
});

describe("parcelamentoContaNoMes — regra híbrida (fatura mais recente conta inteira no mês atual)", () => {
  const ultimaFatura = { Inter: "fatura-inter-2", Nubank: "fatura-nubank-9" };

  it("no mês atual, item à vista (1x) de mês anterior conta se pertence à última fatura confirmada do banco", () => {
    const item = {
      parcelaAtual: 1,
      parcelaTotal: 1,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Inter",
      faturaImportadaId: "fatura-inter-2",
    };
    // Pelo calendário puro já teria expirado em 2026-07 — a regra híbrida mantém.
    expect(parcelaAindaAtiva(item, "2026-07")).toBe(false);
    expect(parcelamentoContaNoMes(item, "2026-07", "2026-07", ultimaFatura)).toBe(true);
  });

  it("no mês atual, item de uma fatura ANTIGA (não a mais recente) do mesmo banco não conta", () => {
    const item = {
      parcelaAtual: 1,
      parcelaTotal: 1,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Inter",
      faturaImportadaId: "fatura-inter-1", // fatura antiga, não é a última
    };
    expect(parcelamentoContaNoMes(item, "2026-07", "2026-07", ultimaFatura)).toBe(false);
  });

  it("em meses futuros (projeção), volta a valer só o calendário — ignora a fatura mais recente", () => {
    const item = {
      parcelaAtual: 1,
      parcelaTotal: 1,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Inter",
      faturaImportadaId: "fatura-inter-2",
    };
    expect(parcelamentoContaNoMes(item, "2026-08", "2026-07", ultimaFatura)).toBe(false);
  });

  it("Custos Fixos (origem manual/null) sempre usa só o calendário, mesmo no mês atual", () => {
    const manual = {
      parcelaAtual: 12,
      parcelaTotal: 12,
      mesInicio: "2025-07",
      continuaIndefinidamente: false,
      origem: "manual",
      faturaImportadaId: null,
    };
    expect(parcelaAindaAtiva(manual, "2026-07")).toBe(false);
    expect(parcelamentoContaNoMes(manual, "2026-07", "2026-07", ultimaFatura)).toBe(false);
  });

  it("vale pra qualquer nome de cartão, não só Inter/Nubank — ex: 'Nubank Walisson'", () => {
    const ultimaFaturaCustom = { "Nubank Walisson": "fatura-nw-3" };
    const item = {
      parcelaAtual: 1,
      parcelaTotal: 1,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Nubank Walisson",
      faturaImportadaId: "fatura-nw-3",
    };
    expect(parcelaAindaAtiva(item, "2026-07")).toBe(false);
    expect(parcelamentoContaNoMes(item, "2026-07", "2026-07", ultimaFaturaCustom)).toBe(true);
  });

  it("no mês atual, parcela que já chegou na última (ex: 3 de 3) não conta mais, mesmo pertencendo à última fatura", () => {
    const item = {
      parcelaAtual: 3,
      parcelaTotal: 3,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Inter",
      faturaImportadaId: "fatura-inter-2",
    };
    expect(parcelamentoContaNoMes(item, "2026-07", "2026-07", ultimaFatura)).toBe(false);
  });

  it("no mês atual, parcela com parcelas restantes (ex: 2 de 4) continua contando por inteiro", () => {
    const item = {
      parcelaAtual: 2,
      parcelaTotal: 4,
      mesInicio: "2026-06",
      continuaIndefinidamente: false,
      origem: "Inter",
      faturaImportadaId: "fatura-inter-2",
    };
    expect(parcelamentoContaNoMes(item, "2026-07", "2026-07", ultimaFatura)).toBe(true);
  });

  it("calcularTotalParcelamentosNoMesHibrido soma pela regra híbrida no mês atual", () => {
    const itens = [
      {
        parcelaAtual: 1,
        parcelaTotal: 1,
        mesInicio: "2026-06",
        continuaIndefinidamente: false,
        origem: "Inter",
        faturaImportadaId: "fatura-inter-2",
        valorParcelaCents: 20000,
      },
      {
        parcelaAtual: 1,
        parcelaTotal: 1,
        mesInicio: "2026-05",
        continuaIndefinidamente: false,
        origem: "Nubank",
        faturaImportadaId: "fatura-nubank-antiga",
        valorParcelaCents: 30000,
      },
    ];
    expect(calcularTotalParcelamentosNoMesHibrido(itens, "2026-07", "2026-07", ultimaFatura)).toBe(20000);
  });
});
