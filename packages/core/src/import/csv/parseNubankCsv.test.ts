import { describe, expect, it } from "vitest";
import { parseNubankCsv } from "./parseNubankCsv.js";

// Amostra real (mesmas linhas do extrato Nubank_2026-07-21.csv fornecido pelo usuário).
const CSV_AMOSTRA = `date,title,amount
2026-07-03,Ifd*66482446 Ana Crist,"69,28"
2026-06-28,"Estorno de ""SHOPEE *Atualcom"" (Shopee)","- 93,81"
2026-06-28,"Crédito de ""SHOPEE *Atualcom""","- 186,43"
2026-06-18,Pagamento recebido,"- 2.418,88"
2026-06-14,Vet Center - Parcela 4/5,"574,00"
2026-06-14,Shopee *Atualcom - Parcela 2/4,"93,81"
2026-06-14,Jim.Com* Leticia Mede - Parcela 8/12,"410,45"
`;

describe("parseNubankCsv", () => {
  const itens = parseNubankCsv(CSV_AMOSTRA);

  it("faz o parse de todas as linhas", () => {
    expect(itens).toHaveLength(7);
  });

  it("classifica uma despesa comum sem parcela", () => {
    const item = itens.find((i) => i.nome === "Ifd*66482446 Ana Crist")!;
    expect(item.valorCents).toBe(6928);
    expect(item.tipo).toBe("despesa");
    expect(item.parcelaAtual).toBeNull();
    expect(item.data).toBe("2026-07-03");
  });

  it('classifica "Estorno de" como estorno, com valor sempre positivo', () => {
    const item = itens.find((i) => i.nome.includes("SHOPEE") && i.valorCents === 9381)!;
    expect(item.tipo).toBe("estorno");
  });

  it('classifica "Pagamento recebido" como pagamento_fatura, não despesa', () => {
    const item = itens.find((i) => i.nome === "Pagamento recebido")!;
    expect(item.tipo).toBe("pagamento_fatura");
    expect(item.valorCents).toBe(241888);
  });

  it("extrai parcela atual/total do título e limpa o nome", () => {
    const item = itens.find((i) => i.nome === "Vet Center")!;
    expect(item.parcelaAtual).toBe(4);
    expect(item.parcelaTotal).toBe(5);
    expect(item.valorCents).toBe(57400);
  });

  it("marca origemImportacao e cartaoOrigem corretamente", () => {
    for (const item of itens) {
      expect(item.origemImportacao).toBe("csv_nubank");
      expect(item.cartaoOrigem).toBe("Nubank");
    }
  });
});
