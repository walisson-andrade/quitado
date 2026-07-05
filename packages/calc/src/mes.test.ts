import { describe, expect, it } from "vitest";
import { addMeses, diffMeses, formatarMes, gerarIntervaloMeses, resolverMesAtual } from "./mes.js";

describe("addMeses / diffMeses", () => {
  it("soma meses dentro do mesmo ano", () => {
    expect(addMeses("2026-01", 3)).toBe("2026-04");
  });

  it("vira o ano corretamente", () => {
    expect(addMeses("2026-11", 3)).toBe("2027-02");
  });

  it("subtrai meses (delta negativo)", () => {
    expect(addMeses("2026-02", -3)).toBe("2025-11");
  });

  it("diffMeses calcula a distância entre dois meses", () => {
    expect(diffMeses("2026-01", "2026-04")).toBe(3);
    expect(diffMeses("2026-04", "2026-01")).toBe(-3);
  });
});

describe("resolverMesAtual", () => {
  it("usa o override quando presente", () => {
    expect(resolverMesAtual("2030-05", new Date(2026, 0, 1))).toBe("2030-05");
  });

  it("cai para o relógio do sistema quando não há override", () => {
    expect(resolverMesAtual(null, new Date(2026, 6, 15, 12))).toBe("2026-07");
  });
});

describe("formatarMes / gerarIntervaloMeses", () => {
  it("formata uma Date em YYYY-MM", () => {
    expect(formatarMes(new Date(2026, 2, 1))).toBe("2026-03");
  });

  it("gera um intervalo de N meses a partir de um início", () => {
    expect(gerarIntervaloMeses("2026-01", 4)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });
});
