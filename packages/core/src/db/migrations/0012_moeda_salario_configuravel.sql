-- Salário deixa de ser sempre EUR — agora tem moeda configurável (BRL/EUR/USD).
-- Toda linha que já existe nessa tabela foi criada sob a suposição antiga
-- (salário sempre em EUR), então o backfill marca todas como 'EUR'; famílias
-- novas a partir de agora usam o default 'BRL'.
ALTER TABLE "quitado_household_config" RENAME COLUMN "salario_eur_cents" TO "salario_cents";
--> statement-breakpoint
ALTER TABLE "quitado_household_config" RENAME COLUMN "eur_brl_rate" TO "cotacao_brl";
--> statement-breakpoint
ALTER TABLE "quitado_household_config" ADD COLUMN "moeda_salario" text NOT NULL DEFAULT 'BRL';
--> statement-breakpoint
UPDATE "quitado_household_config" SET "moeda_salario" = 'EUR';
