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
  it("conta o mês atual e o mês do prazo (ex: jul->dez = 6 meses)", () => {
    expect(mesesRestantesMeta("2026-12", "2026-07")).toBe(6);
  });

  it("nunca é menor que 1, mesmo com prazo já vencido", () => {
    expect(mesesRestantesMeta("2026-01", "2026-07")).toBe(1);
  });
});

describe("calcularAporteNecessario", () => {
  it("R$10.000 faltando em 5 meses restantes -> R$2.000/mês (exemplo do usuário: 5 meses pra 10 mil)", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-11", aporteMensalCents: 0, acumuladoCents: 0 },
      "2026-07",
    );
    // jul,ago,set,out,nov = 5 meses
    expect(mesesRestantesMeta("2026-11", "2026-07")).toBe(5);
    expect(aporte).toBe(200_000);
  });

  it("é zero quando a meta já foi atingida", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-12", aporteMensalCents: 0, acumuladoCents: 1_000_000 },
      "2026-07",
    );
    expect(aporte).toBe(0);
  });

  it("arredonda para cima (nunca guarda menos que o necessário)", () => {
    const aporte = calcularAporteNecessario(
      { valorAlvoCents: 1_000_000, prazo: "2026-09", aporteMensalCents: 0, acumuladoCents: 0 },
      "2026-07",
    );
    // 1_000_000 / 3 = 333333.33 -> arredonda para 333334
    expect(aporte).toBe(333_334);
  });
});
