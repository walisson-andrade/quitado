import { describe, expect, it } from "vitest";
import { totalPorOrigem } from "./origemAgregacao.js";

describe("totalPorOrigem", () => {
  it("agrupa despesas fixas + parcelamentos manuais em 'fixo', e Inter/Nubank separados", () => {
    const despesasFixas = [
      { id: "1", nome: "Aluguel", valorCents: 150000, categoria: null, ativo: true },
      { id: "2", nome: "Antigo", valorCents: 999, categoria: null, ativo: false },
    ];
    const parcelamentosList = [
      {
        nome: "CP PARC SHOPPING INTER",
        valorParcelaCents: 16760,
        parcelaAtual: 2,
        parcelaTotal: 10,
        mesInicio: "2026-06",
        continuaIndefinidamente: false,
        origem: "Inter",
      },
      {
        nome: "Vet Center",
        valorParcelaCents: 57400,
        parcelaAtual: 4,
        parcelaTotal: 5,
        mesInicio: "2026-06",
        continuaIndefinidamente: false,
        origem: "Nubank",
      },
      {
        nome: "Vitta",
        valorParcelaCents: 85000,
        parcelaAtual: 1,
        parcelaTotal: 12,
        mesInicio: "2026-07",
        continuaIndefinidamente: false,
        origem: "manual",
      },
      {
        nome: "Financiamento Speed",
        valorParcelaCents: 87500,
        parcelaAtual: 1,
        parcelaTotal: 1,
        mesInicio: "2026-07",
        continuaIndefinidamente: true,
        origem: null,
      },
      {
        nome: "Já encerrado",
        valorParcelaCents: 99999,
        parcelaAtual: 12,
        parcelaTotal: 12,
        mesInicio: "2025-01",
        continuaIndefinidamente: false,
        origem: "Inter",
      },
    ];

    const resultado = totalPorOrigem(despesasFixas, parcelamentosList, "2026-07");

    const fixo = resultado.find((r) => r.origem === "fixo")!;
    expect(fixo.label).toBe("Custos Fixos");
    expect(fixo.totalCents).toBe(150000 + 85000 + 87500);
    expect(fixo.itens.map((i) => i.nome).sort()).toEqual(["Aluguel", "Financiamento Speed", "Vitta"]);

    expect(resultado.find((r) => r.origem === "Inter")).toMatchObject({ label: "Fatura Inter", totalCents: 16760 });
    expect(resultado.find((r) => r.origem === "Nubank")).toMatchObject({ label: "Fatura Nubank", totalCents: 57400 });

    // só 3 baldes no total — nada de um 4o balde solto
    expect(resultado).toHaveLength(3);
  });

  it("não inclui um balde quando não há itens ativos nele", () => {
    const resultado = totalPorOrigem([], [], "2026-07");
    expect(resultado).toHaveLength(0);
  });
});
