/** Parser RFC4180 minimalista: campos entre aspas, aspas duplicadas escapam uma aspa literal. */
export function parseCsvLines(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;

  const texto2 = texto.replace(/\r\n/g, "\n");
  for (let i = 0; i < texto2.length; i++) {
    const char = texto2[i];
    const proximo = texto2[i + 1];

    if (dentroDeAspas) {
      if (char === '"' && proximo === '"') {
        campo += '"';
        i++;
      } else if (char === '"') {
        dentroDeAspas = false;
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeAspas = true;
    } else if (char === ",") {
      linha.push(campo);
      campo = "";
    } else if (char === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += char;
    }
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((c) => c.trim().length > 0));
}
