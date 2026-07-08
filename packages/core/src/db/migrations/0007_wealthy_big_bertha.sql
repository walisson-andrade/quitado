CREATE TABLE IF NOT EXISTS "quitado_despesa_fixa_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"despesa_fixa_id" uuid NOT NULL,
	"mes_referencia" char(7) NOT NULL,
	"valor_cents" integer NOT NULL,
	CONSTRAINT "quitado_despesa_fixa_overrides_despesa_fixa_id_mes_referencia_unique" UNIQUE("despesa_fixa_id","mes_referencia")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_despesa_fixa_overrides" ADD CONSTRAINT "quitado_despesa_fixa_overrides_despesa_fixa_id_quitado_despesas_fixas_id_fk" FOREIGN KEY ("despesa_fixa_id") REFERENCES "public"."quitado_despesas_fixas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
