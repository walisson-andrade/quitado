import { useEffect, useRef, useState } from "react";
import { Check, Sparkles, Trash2, Upload } from "lucide-react";
import { CATEGORIA_LABEL, categorizarAutomaticamente, resolverMesAtual } from "@quitado/calc";
import type { ItemFaturaStaged } from "@quitado/shared-types";
import { faturasApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { FaturaImportadaRow } from "../api/types.js";
import { Field } from "../components/Field.js";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

type ItemRevisao = ItemFaturaStaged & { incluido: boolean };

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

function tipoOrigemPorArquivo(nome: string): "pdf_imagem_ia" | "csv_nubank" {
  return nome.toLowerCase().endsWith(".csv") ? "csv_nubank" : "pdf_imagem_ia";
}

/**
 * Só um chute inicial pro campo editável abaixo — o método de extração
 * (PDF vs CSV) não indica o banco, então tenta pelo nome do arquivo e
 * deixa o usuário corrigir se errar (ex: Nubank mandando PDF).
 */
function detectarOrigemPorArquivo(nome: string): "Inter" | "Nubank" | "" {
  const lower = nome.toLowerCase();
  if (lower.includes("nubank")) return "Nubank";
  if (lower.includes("inter")) return "Inter";
  return "";
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Fatura() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [faturaAtual, setFaturaAtual] = useState<FaturaImportadaRow | null>(null);
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [mesReferenciaFatura, setMesReferenciaFatura] = useState(resolverMesAtual(null));
  const [origemFatura, setOrigemFatura] = useState<"Inter" | "Nubank" | "outro">("Inter");
  const [origemFaturaCustom, setOrigemFaturaCustom] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [resultadoConfirmacao, setResultadoConfirmacao] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<FaturaImportadaRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function carregarPendentes() {
    faturasApi.listar().then((rows) => setPendentes(rows.filter((r) => r.status === "pendente_revisao")));
  }

  useEffect(carregarPendentes, []);

  async function handleFile(file: File) {
    setEstado("enviando");
    setErro(null);
    try {
      const conteudoBase64 = await lerComoBase64(file);
      const fatura = await faturasApi.upload({
        nomeArquivo: file.name,
        mimeType: file.type || "application/octet-stream",
        conteudoBase64,
        tipoOrigem: tipoOrigemPorArquivo(file.name),
      });
      abrirRevisao(fatura);
      setEstado("idle");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Falha ao processar a fatura");
      setEstado("erro");
    }
  }

  function abrirRevisao(fatura: FaturaImportadaRow) {
    setFaturaAtual(fatura);
    setItens(fatura.jsonExtraido.map((item) => ({ ...item, incluido: item.tipo === "despesa" })));
    setMesReferenciaFatura(fatura.mesReferenciaSugerido ?? resolverMesAtual(null));
    setResultadoConfirmacao(null);
    const detectado = detectarOrigemPorArquivo(fatura.nomeArquivo);
    setOrigemFatura(detectado || "Inter");
    setOrigemFaturaCustom("");
  }

  function atualizarItem(idx: number, patch: Partial<ItemRevisao>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removerItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  // Faturas em PDF/foto (ao contrário do CSV do Nubank) mostram a data da
  // COMPRA original de cada parcela, não o mês em que ela está sendo cobrada
  // — a mesma compra reaparece com essa data em todas as faturas seguintes,
  // só a "Parcela X de Y" avança. Por isso, para itens parcelados vindos de
  // PDF/foto, o mês de referência da fatura (informado abaixo, não a data
  // do item) é o que define a partir de quando a parcela atual é contada.
  const precisaMesReferencia =
    faturaAtual?.tipoOrigem === "pdf_imagem_ia" && itens.some((i) => i.parcelaAtual != null);

  async function confirmar() {
    if (!faturaAtual || confirmando) return;
    const origemFaturaFinal = origemFatura === "outro" ? origemFaturaCustom.trim() : origemFatura;
    if (!origemFaturaFinal) return;
    setConfirmando(true);
    try {
      const itensAprovados = itens
        .filter((i) => i.incluido)
        .map(({ incluido, ...resto }) => {
          const usarMesReferencia = faturaAtual.tipoOrigem === "pdf_imagem_ia" && resto.parcelaAtual != null;
          return usarMesReferencia ? { ...resto, mesInicio: mesReferenciaFatura } : resto;
        });
      const resultado = await faturasApi.confirmar({
        faturaId: faturaAtual.id,
        origemFatura: origemFaturaFinal,
        itensAprovados,
      });
      setFaturaAtual(null);
      setItens([]);
      setResultadoConfirmacao(
        resultado.duplicadosIgnorados > 0
          ? `${resultado.itensInseridos} itens salvos — ${resultado.duplicadosIgnorados} já existiam (mesmo nome, valor e parcela) e foram ignorados.`
          : `${resultado.itensInseridos} itens salvos.`,
      );
      carregarPendentes();
    } finally {
      setConfirmando(false);
    }
  }

  async function descartar() {
    if (!faturaAtual) return;
    await faturasApi.descartar(faturaAtual.id);
    setFaturaAtual(null);
    setItens([]);
    carregarPendentes();
  }

  if (faturaAtual) {
    return (
      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Revisar: {faturaAtual.nomeArquivo}</h3>
          <span style={styles.panelHint}>
            confira os itens antes de salvar — desmarque pra não confirmar, ou exclua (🗑) pra tirar da lista de vez
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field label="Banco de origem">
            <select
              value={origemFatura}
              onChange={(e) => setOrigemFatura(e.target.value as "Inter" | "Nubank" | "outro")}
              style={{ ...styles.input, width: "100%" }}
            >
              <option value="Inter" style={optionStyle}>Inter</option>
              <option value="Nubank" style={optionStyle}>Nubank</option>
              <option value="outro" style={optionStyle}>Outro...</option>
            </select>
          </Field>
          {origemFatura === "outro" && (
            <input
              placeholder="Nome do banco/cartão"
              value={origemFaturaCustom}
              onChange={(e) => setOrigemFaturaCustom(e.target.value)}
              style={{ ...styles.input, width: "100%", marginTop: 8 }}
            />
          )}
        </div>

        {precisaMesReferencia && (
          <div style={{ marginBottom: 14 }}>
            <Field label="Mês desta fatura (data de vencimento)">
              <input
                type="month"
                value={mesReferenciaFatura}
                onChange={(e) => setMesReferenciaFatura(e.target.value)}
                style={{ ...styles.inputMono, width: "100%" }}
              />
            </Field>
            <div style={{ ...styles.uploadNote, marginTop: 8 }}>
              {faturaAtual.mesReferenciaSugerido
                ? "Sugerido automaticamente a partir da data de vencimento lida na fatura — confira se bate."
                : "Não consegui ler a data de vencimento — confira no PDF e ajuste se precisar."}{" "}
              As parcelas (ex: "parcela 3/10") valem a partir desse mês — a data ao lado de cada item é a da
              compra original, não a da parcela atual.
            </div>
          </div>
        )}

        {itens.map((item, idx) => (
          <div key={idx} style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={item.incluido} onChange={(e) => atualizarItem(idx, { incluido: e.target.checked })} />
              <input
                value={item.nome}
                onChange={(e) => atualizarItem(idx, { nome: e.target.value })}
                style={{ ...styles.input, opacity: item.incluido ? 1 : 0.5 }}
              />
              <span style={{ ...styles.parcelaValor, opacity: item.incluido ? 1 : 0.5 }}>{fmt(item.valorCents)}</span>
              <button
                className="q-btn"
                style={{ ...styles.buttonGhost, padding: 8 }}
                onClick={() => removerItem(idx)}
                aria-label="Excluir item"
                title="Excluir este item da fatura"
              >
                <Trash2 size={14} color="var(--q-orange)" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, paddingLeft: 24 }}>
              <span style={styles.panelHint}>{item.data}</span>
              <span style={styles.panelHint}>· {item.tipo}</span>
              {item.parcelaAtual && item.parcelaTotal && (
                <span style={styles.panelHint}>
                  · parcela {item.parcelaAtual}/{item.parcelaTotal}
                </span>
              )}
              {item.cartaoOrigem && <span style={styles.panelHint}>· {item.cartaoOrigem}</span>}
              <span style={styles.panelHint}>· {CATEGORIA_LABEL[categorizarAutomaticamente(item.nome)]}</span>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="q-btn" style={styles.buttonGhost} onClick={descartar} disabled={confirmando}>
            Descartar fatura
          </button>
          <button
        className="q-btn"
            style={{
              ...styles.button,
              flex: 1,
              opacity: confirmando || (origemFatura === "outro" && !origemFaturaCustom.trim()) ? 0.6 : 1,
            }}
            onClick={confirmar}
            disabled={confirmando || (origemFatura === "outro" && !origemFaturaCustom.trim())}
          >
            {confirmando ? "Salvando..." : `Confirmar ${itens.filter((i) => i.incluido).length} itens`}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="q-surface" style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h3 style={styles.panelTitle}>Adicionar fatura</h3>
        <span style={styles.panelHint}>a IA lê e organiza sozinha</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.csv"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div style={styles.dropzone} onClick={() => inputRef.current?.click()}>
        {estado === "idle" && (
          <>
            <Upload size={28} color="var(--q-text-muted)" />
            <div style={styles.dropTitle}>Solte o PDF/foto da fatura ou CSV aqui</div>
            <div style={styles.dropSub}>Inter, Nubank, boleto — qualquer formato</div>
          </>
        )}
        {estado === "enviando" && (
          <>
            <Sparkles size={28} color="var(--q-purple)" className="spin" />
            <div style={styles.dropTitle}>Lendo fatura...</div>
            <div style={styles.dropSub}>extraindo parcelas, valores e vencimentos</div>
          </>
        )}
        {estado === "erro" && (
          <>
            <div style={styles.dropTitle}>Não foi possível processar</div>
            <div style={styles.errorText}>{erro}</div>
          </>
        )}
      </div>

      <div style={styles.uploadNote}>
        Toda fatura nova é comparada com o mês anterior — parcelas que já terminaram somem, e as novas entram
        automaticamente no plano depois que você revisar e confirmar.
      </div>

      {resultadoConfirmacao && (
        <div style={{ ...styles.cardFoot, color: "var(--q-teal)", marginTop: 8 }}>{resultadoConfirmacao}</div>
      )}

      {pendentes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.panelHint}>Pendentes de revisão</div>
          {pendentes.map((f) => (
            <button
        className="q-btn"
              key={f.id}
              onClick={() => abrirRevisao(f)}
              style={{ ...styles.listRow, width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--q-text)" }}
            >
              <span>{f.nomeArquivo}</span>
              <Check size={14} color="var(--q-text-muted)" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
