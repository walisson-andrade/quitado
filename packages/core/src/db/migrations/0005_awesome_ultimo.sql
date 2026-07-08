ALTER TABLE "quitado_conta_pagamentos" ADD COLUMN "parcelamento_id" uuid;--> statement-breakpoint
ALTER TABLE "quitado_parcelamentos" ADD COLUMN "dia_vencimento" smallint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_conta_pagamentos" ADD CONSTRAINT "quitado_conta_pagamentos_parcelamento_id_quitado_parcelamentos_id_fk" FOREIGN KEY ("parcelamento_id") REFERENCES "public"."quitado_parcelamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "quitado_conta_pagamentos" ADD CONSTRAINT "quitado_conta_pagamentos_parcelamento_id_mes_referencia_unique" UNIQUE("parcelamento_id","mes_referencia");