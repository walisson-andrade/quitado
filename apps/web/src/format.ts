/** Formata centavos (integer) como moeda BRL para exibição — nunca guardar valores em float. */
export function fmt(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

const NOMES_MES = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

/** 'YYYY-MM' -> 'jul/26' */
export function mesLabel(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${NOMES_MES[Number(m) - 1]}/${ano!.slice(2)}`;
}
