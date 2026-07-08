CREATE TABLE IF NOT EXISTS "quitado_meta_poupanca_aportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mes_referencia" char(7) NOT NULL,
	"valor_cents" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
