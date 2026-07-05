ALTER TABLE "quitado_despesas_fixas" ADD COLUMN "categoria" text;--> statement-breakpoint
ALTER TABLE "quitado_faturas_importadas" ADD COLUMN "arquivo_hash" text;--> statement-breakpoint
ALTER TABLE "quitado_faturas_importadas" ADD COLUMN "mes_referencia_sugerido" char(7);--> statement-breakpoint
ALTER TABLE "quitado_parcelamentos" ADD COLUMN "categoria" text;