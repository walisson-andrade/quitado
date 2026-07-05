import { describe, expect, it } from "vitest";
import { categorizarAutomaticamente } from "./categoria.js";

describe("categorizarAutomaticamente", () => {
  it("reconhece moradia", () => {
    expect(categorizarAutomaticamente("Aluguel")).toBe("moradia");
    expect(categorizarAutomaticamente("Condomínio")).toBe("moradia");
  });

  it("reconhece mercado", () => {
    expect(categorizarAutomaticamente("Supermercados Reis")).toBe("mercado");
  });

  it("reconhece transporte/combustível", () => {
    expect(categorizarAutomaticamente("Posto Galvao Brasil")).toBe("transporte");
    expect(categorizarAutomaticamente("Mg Comercio de Combust")).toBe("transporte");
  });

  it("reconhece financiamento", () => {
    expect(categorizarAutomaticamente("Financiamento Speed")).toBe("financiamento");
    expect(categorizarAutomaticamente("Empréstimo Walisson")).toBe("financiamento");
  });

  it("reconhece investimentos", () => {
    expect(categorizarAutomaticamente("Investimento CDB Inter")).toBe("investimentos");
    expect(categorizarAutomaticamente("XP Investimentos")).toBe("investimentos");
    expect(categorizarAutomaticamente("Tesouro Direto")).toBe("investimentos");
  });

  it("cai em outros quando não reconhece", () => {
    expect(categorizarAutomaticamente("Ifd*66482446 Ana Crist")).toBe("outros");
  });
});
