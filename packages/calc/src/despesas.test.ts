import { describe, expect, it } from "vitest";
import { calcularRendaBRL, calcularSaldoMensal } from "./despesas.js";

describe("calcularRendaBRL", () => {
  it("converte EUR (centavos) para BRL (centavos) pela cotação", () => {
    expect(calcularRendaBRL(299000, 5.91)).toBe(Math.round(299000 * 5.91));
  });
});

describe("calcularSaldoMensal", () => {
  it("nunca hardcoda totais — tudo derivado das listas-fonte", () => {
    const resultado = calcularSaldoMensal({
      rendaCents: 1_767_090,
      despesasFixas: [
        { id: "1", nome: "Aluguel", valorCents: 150_000, categoria: null, ativo: true },
        { id: "2", nome: "Antigo (inativo)", valorCents: 999_999, categoria: null, ativo: false },
      ],
      parcelamentos: [
        {
          parcelaAtual: 1,
          parcelaTotal: 9,
          mesInicio: "2026-07",
          continuaIndefinidamente: false,
          valorParcelaCents: 64_000,
        },
      ],
      itensVariaveis: [{ id: "v1", nome: "Conta esposa", mesReferencia: "2026-07", valorCents: 12_008 }],
      reembolsos: [{ id: "r1", descricao: "Wesley", valorCents: 27_800, mesReferencia: "2026-07", devedorId: null }],
      mesReferencia: "2026-07",
    });

    // despesa fixa inativa não entra no total
    expect(resultado.despesasFixasCents).toBe(150_000);
    expect(resultado.parcelamentosCents).toBe(64_000);
    expect(resultado.itensVariaveisCents).toBe(12_008);
    expect(resultado.reembolsosCents).toBe(27_800);

    const totalEsperado = 150_000 + 64_000 + 12_008 - 27_800;
    expect(resultado.totalDespesasCents).toBe(totalEsperado);
    expect(resultado.saldoCents).toBe(1_767_090 - totalEsperado);
  });

  it("ignora itens variáveis e reembolsos de outros meses", () => {
    const resultado = calcularSaldoMensal({
      rendaCents: 100_000,
      despesasFixas: [],
      parcelamentos: [],
      itensVariaveis: [{ id: "v1", nome: "X", mesReferencia: "2026-08", valorCents: 5_000 }],
      reembolsos: [{ id: "r1", descricao: "Y", valorCents: 1_000, mesReferencia: "2026-08", devedorId: null }],
      mesReferencia: "2026-07",
    });

    expect(resultado.itensVariaveisCents).toBe(0);
    expect(resultado.reembolsosCents).toBe(0);
    expect(resultado.totalDespesasCents).toBe(0);
    expect(resultado.saldoCents).toBe(100_000);
  });

  it("só parcelas de devedor marcadas 'pago' entram no saldo — pendentes não contam ainda", () => {
    const resultado = calcularSaldoMensal({
      rendaCents: 100_000,
      despesasFixas: [],
      parcelamentos: [],
      itensVariaveis: [],
      reembolsos: [],
      parcelasDevedor: [
        { mesReferencia: "2026-07", status: "pago", valorCents: 30_000 },
        { mesReferencia: "2026-07", status: "pendente", valorCents: 50_000 },
        { mesReferencia: "2026-08", status: "pago", valorCents: 99_999 }, // outro mês, não conta
      ],
      mesReferencia: "2026-07",
    });

    expect(resultado.recebidoDevedoresCents).toBe(30_000);
    expect(resultado.totalDespesasCents).toBe(-30_000);
    expect(resultado.saldoCents).toBe(130_000);
  });
});
