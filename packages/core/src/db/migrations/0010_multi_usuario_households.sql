-- Migração pra multi-usuário: introduz households (famílias) e contas
-- Google, escopando todos os dados de domínio por household_id em vez de
-- serem globais. Todas as linhas existentes são atribuídas a um household
-- "bootstrap" com uuid fixo — depois do primeiro login via Google em
-- produção, um script separado (db/migrate-owner-para-household.ts) liga a
-- conta do dono original a esse mesmo household, preservando o acesso a
-- todos os dados já cadastrados.

CREATE TABLE IF NOT EXISTS "quitado_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"nome" text,
	"avatar_url" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quitado_users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "quitado_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "quitado_users"("id") ON DELETE CASCADE,
	"papel" text DEFAULT 'membro' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quitado_household_members_household_id_user_id_unique" UNIQUE("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_household_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"token" text NOT NULL,
	"criado_por_user_id" uuid NOT NULL REFERENCES "quitado_users"("id"),
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quitado_household_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_household_config" (
	"household_id" uuid PRIMARY KEY REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"salario_eur_cents" integer DEFAULT 0 NOT NULL,
	"eur_brl_rate" numeric(10, 4) DEFAULT '1.0' NOT NULL,
	"mes_atual_override" char(7),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Household bootstrap com uuid fixo — todo dado pré-existente é atribuído a ele.
INSERT INTO "quitado_households" ("id", "nome")
VALUES ('00f411dc-57bb-4b11-8b88-7cd614687a58', 'Família')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "quitado_household_config" ("household_id", "salario_eur_cents", "eur_brl_rate", "mes_atual_override", "updated_at")
SELECT '00f411dc-57bb-4b11-8b88-7cd614687a58', "salario_eur_cents", "eur_brl_rate", "mes_atual_override", "updated_at"
FROM "quitado_app_config" WHERE "id" = 1
ON CONFLICT ("household_id") DO NOTHING;
--> statement-breakpoint
DROP TABLE IF EXISTS "quitado_app_config";
--> statement-breakpoint
ALTER TABLE "quitado_despesas_fixas" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_despesas_fixas" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_despesas_fixas" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_cartoes" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_cartoes" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_cartoes" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_parcelamentos" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_parcelamentos" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_parcelamentos" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_conta_pagamentos" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_conta_pagamentos" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_conta_pagamentos" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_itens_variaveis" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_itens_variaveis" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_itens_variaveis" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_itens_variaveis" DROP CONSTRAINT IF EXISTS "quitado_itens_variaveis_nome_mes_referencia_unique";
--> statement-breakpoint
ALTER TABLE "quitado_itens_variaveis" ADD CONSTRAINT "quitado_itens_variaveis_household_id_nome_mes_referencia_unique" UNIQUE("household_id","nome","mes_referencia");
--> statement-breakpoint
ALTER TABLE "quitado_devedores" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_devedores" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_devedores" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_parcelas_devedor" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_parcelas_devedor" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_parcelas_devedor" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_reembolsos" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_reembolsos" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_reembolsos" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_meta_poupanca_aportes" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_meta_poupanca_aportes" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_meta_poupanca_aportes" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quitado_faturas_importadas" ADD COLUMN "household_id" uuid REFERENCES "quitado_households"("id") ON DELETE CASCADE;
--> statement-breakpoint
UPDATE "quitado_faturas_importadas" SET "household_id" = '00f411dc-57bb-4b11-8b88-7cd614687a58' WHERE "household_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "quitado_faturas_importadas" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
-- quitado_meta_poupanca era uma linha global fixa (id=1) — vira uma linha por household.
ALTER TABLE "quitado_meta_poupanca" RENAME TO "quitado_meta_poupanca_legacy";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_meta_poupanca" (
	"household_id" uuid PRIMARY KEY REFERENCES "quitado_households"("id") ON DELETE CASCADE,
	"valor_alvo_cents" integer NOT NULL,
	"prazo" char(7) NOT NULL,
	"aporte_mensal_cents" integer NOT NULL,
	"acumulado_cents" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "quitado_meta_poupanca" ("household_id", "valor_alvo_cents", "prazo", "aporte_mensal_cents", "acumulado_cents", "atualizado_em")
SELECT '00f411dc-57bb-4b11-8b88-7cd614687a58', "valor_alvo_cents", "prazo", "aporte_mensal_cents", "acumulado_cents", "atualizado_em"
FROM "quitado_meta_poupanca_legacy" WHERE "id" = 1
ON CONFLICT ("household_id") DO NOTHING;
--> statement-breakpoint
DROP TABLE IF EXISTS "quitado_meta_poupanca_legacy";
