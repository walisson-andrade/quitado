import { describe, expect, it } from "vitest";
import { calcularAporteNecessario, calcularProgressoMeta, mesesRestantesMeta } from "./meta.js";

describe("calcularProgressoMeta", () => {
  it("calcula percentual e restante", () => {
    const r = calcularProgressoMeta({
      valorAlvoCents: 1_000_000,
      prazo: "2026-12",
      aporteMensalCents: 166_667,
      acumuladoCents: 166_667,
    });
    expect(r.percentual).toBeCloseTo(0.166667, 5);
    expect(r.restanteCents).toBe(1_000_000 - 166_667);
  });

  it("restante nunca é negativo quando acumulado excede a meta", () => {
    const r = calcularProgressoMeta({
      valorAlvoCents: 1_000_000,
      prazo: "2026-12",
      aporteMensalCents: 166_667,
      acumuladoCents: 1_200_000,
    });
    expect(r.restanteCents).toBe(0);
    expect(r.percentual).toBeGreaterThan(1);
  });
});

describe("mesesRestantesMeta", () => {
  it("mês atual sem aporte ainda é uma oportunidade de guardar (ex: jul->dez = 6 meses: jul,ago,set,out,nov,dez)", () => {
    expect(mesesRestantesMeta("2026-12", "2026-07", false)).toBe(6);
  });

  it("mês atual já contemplado (aporte já guardado nele) não conta de novo (ex: jul->dez = 5 meses: ago,set,out,nov,dez)", () => {
    expect(mesesRestantesMeta("2026-12", "2026-07", true)).toBe(5);
  });

  it("nunca é menor que 1, mesmo com prazo já vencido ou é o próprio mês atual", () => {
    expect(mesesRestantesMeta("2026-01", "2026-07", false)).toBe(1);
    expect(mesesRestantesMeta("2026-07", "2026-07", true)).toBe(1);
  });
});

describe("calcularAporteNecessario", () => {
  it("R$10.000 faltando, nada guardado ainda, 6 meses restantes (jul..dez) -> R$1.666,67/mês (exemplo do usuário: nada guardado em julho)", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-12", aporteMensalCents: 0, acumuladoCents: 0 },
      "2026-07",
      false,
    );
    expect(mesesRestantesMeta("2026-12", "2026-07", false)).toBe(6);
    expect(aporte).toBe(166_667);
  });

  it("regressão: R$10.000 de meta, R$2.780 já guardados em julho, prazo dez/26 -> R$1.444/mês (exemplo do usuário: julho já contemplado)", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-12", aporteMensalCents: 0, acumuladoCents: 278_000 },
      "2026-07",
      true,
    );
    // faltam R$7.220 em 5 meses (ago..dez) = R$1.444/mês
    expect(aporte).toBe(144_400);
  });

  it("é zero quando a meta já foi atingida", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-12", aporteMensalCents: 0, acumuladoCents: 1_000_000 },
      "2026-07",
      false,
    );
    expect(aporte).toBe(0);
  });

  it("arredonda para cima (nunca guarda menos que o necessário)", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-10", aporteMensalCents: 0, acumuladoCents: 0 },
      "2026-07",
      true,
    );
    // ago,set,out = 3 meses (jul já contemplado); 1_000_000 / 3 = 333333.33 -> arredonda para 333334
    expect(aporte).toBe(333_334);
  });
});
