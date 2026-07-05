import { describe, expect, it } from "vitest";
import { totalPorCategoria } from "./categoriaAgregacao.js";

describe("totalPorCategoria", () => {
  it("agrupa despesas fixas e parcelamentos ativos por categoria", () => {
    const despesasFixas = [
      { id: "1", nome: "Aluguel", valorCents: 150000, categoria: null, ativo: true },
      { id: "2", nome: "Mercado", valorCents: 100000, categoria: null, ativo: true },
      { id: "3", nome: "Antigo", valorCents: 999, categoria: null, ativo: false },
    ];
    const parcelamentosList = [
      {
        nome: "Financiamento Speed",
        valorParcelaCents: 87500,
        parcelaAtual: 1,
        parcelaTotal: 1,
        mesInicio: "2026-07",
        continuaIndefinidamente: true,
      },
      {
        nome: "Compra qualquer",
        valorParcelaCents: 5000,
        parcelaAtual: 12,
        parcelaTotal: 12,
        mesInicio: "2025-08",
        continuaIndefinidamente: false,
      }, // já encerrado em 2026-07
    ];

    const resultado = totalPorCategoria(despesasFixas, parcelamentosList, "2026-07");

    expect(resultado.find((r) => r.categoria === "moradia")?.totalCents).toBe(150000);
    expect(resultado.find((r) => r.categoria === "mercado")?.totalCents).toBe(100000);
    expect(resultado.find((r) => r.categoria === "financiamento")?.totalCents).toBe(87500);
    // parcelamento já encerrado não deve aparecer
    expect(resultado.some((r) => r.totalCents === 5000)).toBe(false);
    // despesa inativa não deve aparecer
    expect(resultado.some((r) => r.totalCents === 999)).toBe(false);
    // itens detalhados por categoria, pra permitir expandir e listar no dashboard
    expect(resultado.find((r) => r.categoria === "moradia")?.itens).toEqual([
      { nome: "Aluguel", valorCents: 150000 },
    ]);
  });

  it("usa a categoria manual quando definida, ignorando a heurística", () => {
    const resultado = totalPorCategoria(
      [{ id: "1", nome: "Ifd*66482446 Ana Crist", valorCents: 6928, ativo: true, categoria: "lazer_compras" }],
      [],
      "2026-07",
    );
    expect(resultado[0]).toMatchObject({ categoria: "lazer_compras", totalCents: 6928 });
  });
});
