import { styles } from "../styles.js";

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

const NOMES_MES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Intervalo de anos oferecido no seletor — cobre uns anos antes/depois do atual, esticando se o valor selecionado estiver fora disso. */
function anosDisponiveis(anoSelecionado: number | null): number[] {
  const anoAtual = new Date().getFullYear();
  const min = Math.min(anoAtual - 2, anoSelecionado ?? anoAtual);
  const max = Math.max(anoAtual + 5, anoSelecionado ?? anoAtual);
  const anos: number[] = [];
  for (let a = min; a <= max; a++) anos.push(a);
  return anos;
}

/**
 * Seletor de mês de referência ('YYYY-MM') com dois <select> (mês + ano) no
 * lugar do input nativo type="month" — o popup de calendário dele é
 * renderizado pelo SO/navegador e não segue o tema escuro do app.
 */
export function MesInput({
  value,
  onChange,
  permiteVazio = false,
}: {
  value: string;
  onChange: (mes: string) => void;
  /** Mostra um botão "automático" pra voltar ao valor vazio (ex: "usar data do sistema"). */
  permiteVazio?: boolean;
}) {
  const [anoStr, mesStr] = value ? value.split("-") : [null, null];
  const ano = anoStr ? Number(anoStr) : null;
  const mes = mesStr ? Number(mesStr) : null;

  function atualizar(novoAno: number | null, novoMes: number | null) {
    if (novoAno === null || novoMes === null) return;
    onChange(`${novoAno}-${String(novoMes).padStart(2, "0")}`);
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select
        value={mes ?? ""}
        onChange={(e) => atualizar(ano ?? new Date().getFullYear(), Number(e.target.value))}
        style={{ ...styles.inputMono, fontFamily: "'Inter', sans-serif", flex: 2 }}
      >
        {mes === null && (
          <option value="" disabled style={optionStyle}>
            mês
          </option>
        )}
        {NOMES_MES.map((nome, i) => (
          <option key={nome} value={i + 1} style={optionStyle}>
            {nome}
          </option>
        ))}
      </select>
      <select
        value={ano ?? ""}
        onChange={(e) => atualizar(Number(e.target.value), mes ?? new Date().getMonth() + 1)}
        style={{ ...styles.inputMono, flex: 1 }}
      >
        {ano === null && (
          <option value="" disabled style={optionStyle}>
            ano
          </option>
        )}
        {anosDisponiveis(ano).map((a) => (
          <option key={a} value={a} style={optionStyle}>
            {a}
          </option>
        ))}
      </select>
      {permiteVazio && value && (
        <button
          type="button"
          className="q-btn"
          onClick={() => onChange("")}
          style={{ ...styles.buttonGhost, padding: "6px 8px", fontSize: 11, whiteSpace: "nowrap" }}
        >
          automático
        </button>
      )}
    </div>
  );
}
