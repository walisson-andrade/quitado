CREATE TABLE IF NOT EXISTS "quitado_app_config" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"password_hash" text NOT NULL,
	"salario_eur_cents" integer DEFAULT 0 NOT NULL,
	"eur_brl_rate" numeric(10, 4) DEFAULT '1.0' NOT NULL,
	"mes_atual_override" char(7),
	"token_version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_despesas_fixas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"valor_cents" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_devedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cor_hex" text,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_faturas_importadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_origem" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"arquivo_storage_key" text,
	"json_extraido" jsonb NOT NULL,
	"json_confirmado" jsonb,
	"status" text DEFAULT 'pendente_revisao' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_itens_variaveis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"mes_referencia" char(7) NOT NULL,
	"valor_cents" integer NOT NULL,
	CONSTRAINT "quitado_itens_variaveis_nome_mes_referencia_unique" UNIQUE("nome","mes_referencia")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_meta_poupanca" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"valor_alvo_cents" integer NOT NULL,
	"prazo" char(7) NOT NULL,
	"aporte_mensal_cents" integer NOT NULL,
	"acumulado_cents" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_parcelamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"valor_parcela_cents" integer NOT NULL,
	"parcela_atual" smallint NOT NULL,
	"parcela_total" smallint NOT NULL,
	"mes_inicio" char(7) NOT NULL,
	"origem" text,
	"cartao_origem" text,
	"continua_indefinidamente" boolean DEFAULT false NOT NULL,
	"fatura_importada_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_parcelas_devedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devedor_id" uuid NOT NULL,
	"mes_referencia" char(7) NOT NULL,
	"valor_cents" integer NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"pago_em" timestamp with time zone,
	CONSTRAINT "quitado_parcelas_devedor_devedor_id_mes_referencia_unique" UNIQUE("devedor_id","mes_referencia")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quitado_reembolsos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text NOT NULL,
	"valor_cents" integer NOT NULL,
	"mes_referencia" char(7) NOT NULL,
	"devedor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_parcelamentos" ADD CONSTRAINT "quitado_parcelamentos_fatura_importada_id_quitado_faturas_importadas_id_fk" FOREIGN KEY ("fatura_importada_id") REFERENCES "public"."quitado_faturas_importadas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_parcelas_devedor" ADD CONSTRAINT "quitado_parcelas_devedor_devedor_id_quitado_devedores_id_fk" FOREIGN KEY ("devedor_id") REFERENCES "public"."quitado_devedores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quitado_reembolsos" ADD CONSTRAINT "quitado_reembolsos_devedor_id_quitado_devedores_id_fk" FOREIGN KEY ("devedor_id") REFERENCES "public"."quitado_devedores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
