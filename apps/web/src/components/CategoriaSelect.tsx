import { CATEGORIAS_SUGERIDAS, CATEGORIA_LABEL } from "@quitado/calc";
import { styles } from "../styles.js";

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

export function CategoriaSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (categoria: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{ ...styles.inputMono, fontFamily: "'Inter', sans-serif" }}
    >
      <option value="" style={optionStyle}>(auto)</option>
      {CATEGORIAS_SUGERIDAS.map((slug) => (
        <option key={slug} value={slug} style={optionStyle}>
          {CATEGORIA_LABEL[slug]}
        </option>
      ))}
    </select>
  );
}
