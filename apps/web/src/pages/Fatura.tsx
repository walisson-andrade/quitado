import { useEffect, useRef, useState } from "react";
import { Check, FileText, Sparkles, Trash2, Upload } from "lucide-react";
import { CATEGORIA_LABEL, categorizarAutomaticamente, resolverMesAtual } from "@quitado/calc";
import type { ItemFaturaStaged } from "@quitado/shared-types";
import { cartoesApi, faturasApi } from "../api/resources.js";
import { ApiError } from "../api/client.js";
import type { CartaoRow, FaturaImportadaRow } from "../api/types.js";
import { corDaCategoria, iconeDaCategoria } from "../categoriaVisual.js";
import { Field } from "../components/Field.js";
import { IconBadge } from "../components/IconBadge.js";
import { MesInput } from "../components/MesInput.js";
import { corPorOrigem } from "../components/OrigemChart.js";
import { fmt } from "../format.js";
import { styles } from "../styles.js";

type ItemRevisao = ItemFaturaStaged & { incluido: boolean };

const optionStyle = { background: "var(--q-card-bg)", color: "var(--q-text)" };

/**
 * Muitas faturas mostram, além da cobrança deste mês, uma tabela de PRÉVIA
 * das próximas parcelas de uma compra já parcelada — mesmo nome + mesma data
 * de compra original, só variando o número da parcela. Isso não é confiável
 * pedir pra IA simplesmente "não extrair" (ela erra), então detecta aqui de
 * forma determinística: se existe outro item com nome+data iguais e parcela
 * MENOR, este aqui é quase certamente uma prévia futura, não uma cobrança
 * nova — não decide sozinho (não some da lista), só começa desmarcado com um
 * aviso, e o usuário pode marcar de volta se estiver errado.
 */
function ehProvavelParcelaFutura(itens: ItemFaturaStaged[], item: ItemFaturaStaged): boolean {
  if (item.parcelaAtual == null || item.parcelaTotal == null) return false;
  return itens.some(
    (outro) =>
      outro !== item &&
      outro.nome === item.nome &&
      outro.data === item.data &&
      outro.parcelaAtual != null &&
      outro.parcelaAtual < item.parcelaAtual!,
  );
}

/**
 * Quando uma compra parcelada é cancelada, a fatura mostra uma linha de
 * estorno separada com o MESMO nome da loja e a MESMA quantidade total de
 * parcelas — a compra inteira caiu, então todas as parcelas "despesa" dessa
 * compra não deviam contar mais. Casar só pelo nome não é seguro: a mesma
 * loja pode aparecer várias vezes na fatura como compras diferentes e sem
 * relação (ex: "AMAZON BR SA" à vista em dias distintos) — por isso também
 * exige bater a quantidade de parcelas, pra não apagar compra errada. Mesma
 * lógica da prévia futura: nunca decide sozinho, só começa desmarcado com um
 * aviso, o usuário confere e pode marcar de volta se for engano.
 */
function ehCanceladoPorEstorno(itens: ItemFaturaStaged[], item: ItemFaturaStaged): boolean {
  if (item.tipo !== "despesa") return false;
  return itens.some(
    (outro) => outro.tipo === "estorno" && outro.nome === item.nome && outro.parcelaTotal === item.parcelaTotal,
  );
}

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

/**
 * Sugere qual cartão já cadastrado bate com esta fatura, cruzando o banco
 * (lido pela IA no documento, ou como fallback adivinhado pelo nome do
 * arquivo) com o titular lido pela IA — ex: banco "Santander" + titular
 * "Leticia Mendes" bate com o cartão "Santander Leticia".
 *
 * O banco é um FILTRO, não só mais um ponto de pontuação: uma pessoa pode
 * ter cartão em vários bancos (ex: Walisson tem Inter, Nubank e Santander),
 * então bater o nome dela sozinho não é suficiente — já causou bug real
 * (fatura do Inter sendo sugerida como "Nubank Walisson" só porque batia o
 * titular). Nunca decide sozinho: é só o valor pré-selecionado no dropdown,
 * o usuário sempre confere/troca antes de confirmar.
 */
function sugerirCartao(
  cartoes: CartaoRow[],
  nomeArquivo: string,
  titularSugerido: string | null,
  bancoSugerido: string | null,
): string | null {
  const bancoGuess = (bancoSugerido || detectarOrigemPorArquivo(nomeArquivo)).toLowerCase();
  const primeiroNomeTitular = titularSugerido?.trim().split(/\s+/)[0]?.toLowerCase();

  // Sem pista de banco nenhuma, não tem base segura pra restringir — considera todos.
  const candidatos = bancoGuess ? cartoes.filter((c) => c.nome.toLowerCase().includes(bancoGuess)) : cartoes;

  if (primeiroNomeTitular) {
    const comTitular = candidatos.find((c) => c.nome.toLowerCase().includes(primeiroNomeTitular));
    if (comTitular) return comTitular.nome;
  }

  // Só um cartão bate com o banco (sem distinção de pessoa) — usa ele.
  if (candidatos.length === 1) return candidatos[0]!.nome;

  // Mais de um cartão do mesmo banco e nenhum bate o titular — prefere o
  // nome "genérico" (só o banco, sem sufixo de pessoa) se existir; senão
  // não arrisca escolher entre pessoas diferentes, deixa em branco.
  const generico = bancoGuess ? candidatos.find((c) => c.nome.toLowerCase() === bancoGuess) : null;
  return generico ? generico.nome : null;
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const NOVO_CARTAO = "__novo__";

export function Fatura() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [faturaAtual, setFaturaAtual] = useState<FaturaImportadaRow | null>(null);
  const [itens, setItens] = useState<ItemRevisao[]>([]);
  const [mesReferenciaFatura, setMesReferenciaFatura] = useState(resolverMesAtual(null));
  const [cartoes, setCartoes] = useState<CartaoRow[]>([]);
  const [origemSelecionada, setOrigemSelecionada] = useState<string>("Inter");
  const [origemSugerida, setOrigemSugerida] = useState<string | null>(null);
  const [origemFaturaCustom, setOrigemFaturaCustom] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [resultadoConfirmacao, setResultadoConfirmacao] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<FaturaImportadaRow[]>([]);
  const [todasFaturas, setTodasFaturas] = useState<FaturaImportadaRow[]>([]);
  const [confirmarRemocaoId, setConfirmarRemocaoId] = useState<string | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function carregarPendentes() {
    faturasApi.listar().then((rows) => {
      setPendentes(rows.filter((r) => r.status === "pendente_revisao"));
      setTodasFaturas(rows);
    });
  }

  async function removerFatura(id: string) {
    setRemovendoId(id);
    try {
      await faturasApi.remover(id);
      setConfirmarRemocaoId(null);
      carregarPendentes();
    } finally {
      setRemovendoId(null);
    }
  }

  const STATUS_LABEL: Record<FaturaImportadaRow["status"], string> = {
    processando: "processando",
    pendente_revisao: "pendente de revisão",
    confirmado: "confirmada",
    descartado: "descartada",
  };
  const STATUS_COR: Record<FaturaImportadaRow["status"], string> = {
    processando: "var(--q-purple)",
    pendente_revisao: "var(--q-gold)",
    confirmado: "var(--q-teal)",
    descartado: "var(--q-text-faint)",
  };

  useEffect(() => {
    carregarPendentes();
    cartoesApi.listar().then(setCartoes);
  }, []);

  const opcoesCartao = Array.from(new Set(["Inter", "Nubank", ...cartoes.map((c) => c.nome)])).sort();

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
    setItens(
      fatura.jsonExtraido.map((item) => ({
        ...item,
        // Estorno/crédito conta junto (com sinal negativo, ver valorComSinal
        // abaixo) em vez de esconder a despesa pareada: cobre também o caso
        // real do Nubank em que o estorno vem como crédito solto, sem compra
        // correspondente nesta mesma fatura (ex: reembolso de compra de mês
        // anterior) — nesse caso não existiria despesa pra "cancelar" e o
        // valor simplesmente sumiria da conta.
        incluido:
          (item.tipo === "despesa" || item.tipo === "estorno") &&
          !ehProvavelParcelaFutura(fatura.jsonExtraido, item),
      })),
    );
    setMesReferenciaFatura(fatura.mesReferenciaSugerido ?? resolverMesAtual(null));
    setResultadoConfirmacao(null);
    const sugestao = sugerirCartao(cartoes, fatura.nomeArquivo, fatura.titularSugerido, fatura.bancoSugerido);
    const banco = fatura.bancoSugerido || detectarOrigemPorArquivo(fatura.nomeArquivo);
    setOrigemSugerida(sugestao);
    // Sem sugestão de cartão nem pista de banco (IA ou nome do arquivo), não
    // chuta "Inter" por padrão (erraria silenciosamente pra qualquer banco
    // novo, ex: Santander) — força escolher/cadastrar o cartão certo.
    setOrigemSelecionada(sugestao ?? (banco || NOVO_CARTAO));
    setOrigemFaturaCustom("");
  }

  function atualizarItem(idx: number, patch: Partial<ItemRevisao>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removerItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  // A data de cada item (compra original, ou data da transação no extrato
  // CSV) não é o mesmo mês em que a fatura está sendo cobrada — pra
  // parcelados, a mesma compra reaparece com essa data em todas as faturas
  // seguintes, só a "Parcela X de Y" avança; pra compras à vista, a data
  // pode cair no ciclo de fatura anterior (ex: comprado dia 25 numa fatura
  // que fecha dia 30), o que faria o item "sumir" um mês antes da hora na
  // Linha do tempo/Contas a pagar. O CSV do Nubank sofre do mesmo problema
  // que o PDF: o ciclo fecha no meio do mês, então itens de datas
  // diferentes (ex: 14/06 e 06/07) pertencem à MESMA fatura — por isso
  // TODO item, de qualquer origem, usa o mês de referência da fatura
  // (informado abaixo, não a data do item) pra definir o mês em que conta.
  const precisaMesReferencia = itens.length > 0;

  async function confirmar() {
    if (!faturaAtual || confirmando) return;
    const origemFaturaFinal = origemSelecionada === NOVO_CARTAO ? origemFaturaCustom.trim() : origemSelecionada;
    if (!origemFaturaFinal) return;
    setConfirmando(true);
    try {
      const itensAprovados = itens
        .filter((i) => i.incluido)
        .map(({ incluido, ...resto }) => {
          return { ...resto, mesInicio: mesReferenciaFatura };
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
    // Estorno/crédito reduz o total da fatura; pagamento da fatura nunca é
    // uma cobrança nova, então não entra na soma em nenhuma hipótese.
    const valorComSinal = (i: ItemRevisao) =>
      i.tipo === "estorno" ? -i.valorCents : i.tipo === "despesa" ? i.valorCents : 0;
    const totalIncluido = itens.filter((i) => i.incluido).reduce((acc, i) => acc + valorComSinal(i), 0);
    const totalTodos = itens.reduce((acc, i) => acc + valorComSinal(i), 0);
    const totalReal = faturaAtual.totalFaturaSugeridoCents;
    // Compara contra os itens MARCADOS (o que de fato vai ser salvo) — não
    // contra a soma de tudo, que sempre vai incluir itens corretamente
    // desmarcados (pagamento da fatura, prováveis parcelas futuras) e por
    // isso quase nunca bateria mesmo quando a seleção já está certa.
    // Pequena tolerância de arredondamento — diferença de verdade (item
    // faltando/sobrando ou tabela de parcelas futuras duplicada) é bem maior que isso.
    const bateComOTotal = totalReal == null || Math.abs(totalIncluido - totalReal) <= 5;

    return (
      <section className="q-surface" style={styles.panel}>
        <div style={styles.panelHeadRow}>
          <h3 style={styles.panelTitle}>Revisar: {faturaAtual.nomeArquivo}</h3>
          <span style={styles.panelHint}>
            confira os itens antes de salvar — desmarque pra não confirmar, ou exclua (🗑) pra tirar da lista de vez
          </span>
        </div>

        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            background: bateComOTotal ? "var(--q-inset-bg)" : "var(--q-warning-tint)",
            border: `1px solid ${bateComOTotal ? "var(--q-border)" : "var(--q-orange)"}`,
          }}
        >
          <div style={styles.timelineSummaryLabel}>total desta fatura (itens marcados)</div>
          <div style={{ ...styles.timelineSummaryValor, fontSize: 22, color: "var(--q-orange)" }}>{fmt(totalIncluido)}</div>
          {totalIncluido !== totalTodos && (
            <div style={styles.uploadNote}>{fmt(totalTodos)} somando os {itens.length} itens lidos, antes de desmarcar algum.</div>
          )}
          {totalReal != null ? (
            <div style={{ ...styles.uploadNote, color: bateComOTotal ? "var(--q-teal)" : "var(--q-orange)", fontWeight: 600, marginTop: 6 }}>
              {bateComOTotal
                ? `Bate com o total impresso na fatura (${fmt(totalReal)}).`
                : `Não bate com o total impresso na fatura: ${fmt(totalReal)}. Provavelmente sobrou algum item de uma tabela de parcelas futuras (não cobradas neste mês) — confira a lista abaixo antes de confirmar.`}
            </div>
          ) : (
            <div style={styles.uploadNote}>Não consegui ler o total impresso nesta fatura — confere esse valor contra o extrato real antes de confirmar.</div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field label="Cartão / banco de origem">
            <select
              value={origemSelecionada}
              onChange={(e) => setOrigemSelecionada(e.target.value)}
              style={{ ...styles.input, width: "100%" }}
            >
              {opcoesCartao.map((nome) => (
                <option key={nome} value={nome} style={optionStyle}>
                  {nome}
                </option>
              ))}
              <option value={NOVO_CARTAO} style={optionStyle}>
                + Novo cartão...
              </option>
            </select>
          </Field>
          {origemSelecionada === NOVO_CARTAO && (
            <input
              placeholder="Nome do banco/cartão (ex: Santander Leticia)"
              value={origemFaturaCustom}
              onChange={(e) => setOrigemFaturaCustom(e.target.value)}
              style={{ ...styles.input, width: "100%", marginTop: 8 }}
            />
          )}
          {(faturaAtual.titularSugerido || faturaAtual.bancoSugerido) && (
            <div style={{ ...styles.uploadNote, marginTop: 8 }}>
              IA leu {faturaAtual.bancoSugerido ? `banco "${faturaAtual.bancoSugerido}"` : "o documento"}
              {faturaAtual.titularSugerido ? ` e titular "${faturaAtual.titularSugerido}"` : ""} —{" "}
              {origemSugerida
                ? `já selecionou "${origemSugerida}", confira se bate.`
                : "não achei um cartão cadastrado que bata com segurança — escolha ou cadastre um novo."}
            </div>
          )}
        </div>

        {precisaMesReferencia && (
          <div style={{ marginBottom: 14 }}>
            <Field label="Mês desta fatura (data de vencimento)">
              <MesInput value={mesReferenciaFatura} onChange={setMesReferenciaFatura} />
            </Field>
            <div style={{ ...styles.uploadNote, marginTop: 8 }}>
              {faturaAtual.mesReferenciaSugerido
                ? "Sugerido automaticamente a partir da fatura — confira se bate."
                : "Não consegui sugerir automaticamente — confira no extrato/fatura real e ajuste se precisar."}{" "}
              As parcelas (ex: "parcela 3/10") valem a partir desse mês — a data ao lado de cada item é a da
              compra original, não a da parcela atual.
            </div>
          </div>
        )}

        {itens.map((item, idx) => {
          const categoriaSlug = categorizarAutomaticamente(item.nome);
          return (
          <div key={idx} style={{ ...styles.listRow, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={item.incluido} onChange={(e) => atualizarItem(idx, { incluido: e.target.checked })} />
              <div style={{ opacity: item.incluido ? 1 : 0.5 }}>
                <IconBadge icon={iconeDaCategoria(categoriaSlug)} cor={corDaCategoria(categoriaSlug)} tamanho="sm" />
              </div>
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
            <div style={{ display: "flex", gap: 8, paddingLeft: 24, alignItems: "center" }}>
              <span style={styles.panelHint}>{item.data}</span>
              {item.tipo === "despesa" ? (
                <span style={styles.panelHint}>· despesa</span>
              ) : (
                <span
                  style={{
                    fontSize: "var(--fs-tiny)",
                    fontWeight: 700,
                    color: item.tipo === "estorno" ? "var(--q-orange)" : "var(--q-purple)",
                    border: `1px solid ${item.tipo === "estorno" ? "var(--q-orange)" : "var(--q-purple)"}`,
                    borderRadius: 6,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                  }}
                >
                  {item.tipo === "estorno" ? "estorno" : "pagamento da fatura"}
                </span>
              )}
              {item.parcelaAtual && item.parcelaTotal && (
                <span style={styles.panelHint}>
                  · parcela {item.parcelaAtual}/{item.parcelaTotal}
                </span>
              )}
              {ehProvavelParcelaFutura(itens, item) && (
                <span
                  style={{
                    fontSize: "var(--fs-tiny)",
                    fontWeight: 700,
                    color: "var(--q-gold)",
                    border: "1px solid var(--q-gold)",
                    borderRadius: 6,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                  }}
                  title="Já tem outra parcela dessa mesma compra com número menor — provável prévia de parcela futura, não cobrada nesta fatura"
                >
                  provável parcela futura
                </span>
              )}
              {ehCanceladoPorEstorno(itens, item) && (
                <span
                  style={{
                    fontSize: "var(--fs-tiny)",
                    fontWeight: 700,
                    color: "var(--q-orange)",
                    border: "1px solid var(--q-orange)",
                    borderRadius: 6,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                  }}
                  title="Tem um estorno com esse mesmo nome nesta fatura — a compra provavelmente foi cancelada"
                >
                  cancelado (tem estorno)
                </span>
              )}
              {item.cartaoOrigem && <span style={styles.panelHint}>· {item.cartaoOrigem}</span>}
              <span style={styles.panelHint}>· {CATEGORIA_LABEL[categoriaSlug]}</span>
            </div>
          </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="q-btn" style={styles.buttonGhost} onClick={descartar} disabled={confirmando}>
            Descartar fatura
          </button>
          <button
        className="q-btn"
            style={{
              ...styles.button,
              flex: 1,
              opacity: confirmando || (origemSelecionada === NOVO_CARTAO && !origemFaturaCustom.trim()) ? 0.6 : 1,
            }}
            onClick={confirmar}
            disabled={confirmando || (origemSelecionada === NOVO_CARTAO && !origemFaturaCustom.trim())}
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
            <IconBadge icon={Upload} cor="var(--q-purple)" tamanho="lg" />
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
          <div style={{ ...styles.panelHint, marginBottom: 8 }}>Pendentes de revisão</div>
          {pendentes.map((f) => (
            <button
              className="q-btn q-surface"
              key={f.id}
              onClick={() => abrirRevisao(f)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 14,
                padding: "11px 13px", marginBottom: 8, cursor: "pointer", color: "var(--q-text)", textAlign: "left",
              }}
            >
              <IconBadge icon={FileText} cor={corPorOrigem(f.origem ?? "manual")} tamanho="md" />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: "var(--fs-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.nomeArquivo}
              </span>
              <Check size={14} color="var(--q-text-muted)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {todasFaturas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={styles.panelHint}>Faturas importadas</div>
          {todasFaturas.map((f) => (
            <div
              key={f.id}
              className="q-surface"
              style={{
                display: "flex", flexDirection: "column", gap: 6,
                background: "var(--q-card-bg)", border: "1px solid var(--q-border)", borderRadius: 14,
                padding: "11px 13px", marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <IconBadge icon={FileText} cor={corPorOrigem(f.origem ?? "manual")} tamanho="md" />
                  <div style={styles.listRowMain}>
                    <span>{f.nomeArquivo}</span>
                    <span style={styles.panelHint}>{f.origem ?? "sem origem"}</span>
                  </div>
                </div>
                {f.status === "confirmado" ? (
                  <Check size={16} color="var(--q-teal)" strokeWidth={3} style={{ flexShrink: 0 }} />
                ) : (
                  <span
                    style={{
                      fontSize: "var(--fs-tiny)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em",
                      color: STATUS_COR[f.status], border: `1px solid ${STATUS_COR[f.status]}`, borderRadius: 6,
                      padding: "2px 6px", flexShrink: 0,
                    }}
                  >
                    {STATUS_LABEL[f.status]}
                  </span>
                )}
                {confirmarRemocaoId !== f.id && (
                  <button
                    className="q-btn"
                    style={{ ...styles.buttonGhost, padding: 8 }}
                    onClick={() => setConfirmarRemocaoId(f.id)}
                    aria-label="Excluir fatura"
                    title="Excluir fatura"
                  >
                    <Trash2 size={14} color="var(--q-orange)" />
                  </button>
                )}
              </div>
              {confirmarRemocaoId === f.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={styles.errorText}>
                    {f.status === "confirmado"
                      ? "Excluir também remove as despesas que essa fatura gerou. Tem certeza?"
                      : "Tem certeza que quer excluir essa fatura?"}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="q-btn"
                      style={{ ...styles.buttonGhost, flex: 1 }}
                      onClick={() => setConfirmarRemocaoId(null)}
                      disabled={removendoId === f.id}
                    >
                      Cancelar
                    </button>
                    <button
                      className="q-btn"
                      style={{ ...styles.button, flex: 1, background: "var(--q-orange)" }}
                      onClick={() => removerFatura(f.id)}
                      disabled={removendoId === f.id}
                    >
                      {removendoId === f.id ? "Excluindo..." : "Confirmar exclusão"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
