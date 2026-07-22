-- Meta de poupança deixa de ser uma linha única por household e vira uma
-- tabela normal (várias metas nomeadas por família, cada uma com seu
-- histórico de aportes). Qualquer meta já existente é migrada como a
-- primeira meta da família ("Minha meta", categoria 'outro') — o antigo
-- schema garantia no máximo uma linha por household (household_id era a
-- chave primária), então o join por household_id abaixo é 1:1 e seguro.
CREATE TABLE IF NOT EXISTS "quitado_metas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"nome" text NOT NULL,
	"categoria" text DEFAULT 'outro' NOT NULL,
	"valor_alvo_cents" integer NOT NULL,
	"prazo" char(7) NOT NULL,
	"aporte_mensal_cents" integer DEFAULT 0 NOT NULL,
	"acumulado_cents" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_meta_aportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"meta_id" uuid NOT NULL REFERENCES "quitado_metas"("id") ON DELETE CASCADE,
	"mes_referencia" char(7) NOT NULL,
	"valor_cents" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "quitado_metas" ("household_id", "nome", "categoria", "valor_alvo_cents", "prazo", "aporte_mensal_cents", "acumulado_cents", "atualizado_em")
SELECT "household_id", 'Minha meta', 'outro', "valor_alvo_cents", "prazo", "aporte_mensal_cents", "acumulado_cents", "atualizado_em"
FROM "quitado_meta_poupanca";
--> statement-breakpoint
INSERT INTO "quitado_meta_aportes" ("id", "household_id", "meta_id", "mes_referencia", "valor_cents", "criado_em")
SELECT a."id", a."household_id", m."id", a."mes_referencia", a."valor_cents", a."criado_em"
FROM "quitado_meta_poupanca_aportes" a
JOIN "quitado_metas" m ON m."household_id" = a."household_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "quitado_meta_poupanca_aportes";
--> statement-breakpoint
DROP TABLE IF EXISTS "quitado_meta_poupanca";
