CREATE TABLE IF NOT EXISTS "quitado_cartoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"dia_vencimento" smallint,
	"cor_hex" text,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_conta_pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"despesa_fixa_id" uuid,
	"cartao_id" uuid,
	"mes_referencia" char(7) NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"pago_em" timestamp with time zone,
	CONSTRAINT "quitado_conta_pagamentos_despesa_fixa_id_mes_referencia_unique" UNIQUE("despesa_fixa_id","mes_referencia"),
	CONSTRAINT "quitado_conta_pagamentos_cartao_id_mes_referencia_unique" UNIQUE("cartao_id","mes_referencia")
);
--> statement-breakpoint
ALTER TABLE "quitado_despesas_fixas" ADD COLUMN "dia_vencimento" smallint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_conta_pagamentos" ADD CONSTRAINT "quitado_conta_pagamentos_despesa_fixa_id_quitado_despesas_fixas_id_fk" FOREIGN KEY ("despesa_fixa_id") REFERENCES "public"."quitado_despesas_fixas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_conta_pagamentos" ADD CONSTRAINT "quitado_conta_pagamentos_cartao_id_quitado_cartoes_id_fk" FOREIGN KEY ("cartao_id") REFERENCES "public"."quitado_cartoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
