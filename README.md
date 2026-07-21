# Quitado

PWA pessoal de controle financeiro. Ver `requisitos-quitado.md` (não versionado neste repo, fica em `Downloads/`) para as regras de negócio completas, e o plano técnico em `.claude/plans` para as decisões de arquitetura.

## Estrutura

```
apps/web/         React + Vite + TS — PWA (frontend)
apps/api-dev/     Fastify — servidor de API para o Docker dev local
apps/api/         Vercel Functions — mesma API para produção
packages/calc/    Funções puras de cálculo financeiro (parcelamento, saldo, meta) — zero I/O
packages/core/    Schema Drizzle, handlers de negócio, pipeline de importação de fatura
packages/shared-types/  Schemas Zod compartilhados entre frontend e backend
```

## Banco de dados

O Postgres é hospedado no **Supabase** — usado em dev e em produção (não há Postgres local em Docker). O driver é `pg` puro (Supabase é Postgres padrão, não precisa de driver especial de serverless como o Neon exigia). Todas as tabelas têm o prefixo `quitado_` (ex: `quitado_despesas_fixas`), para conviver num projeto Supabase que pode ter outras tabelas de outros apps.

Pegue a connection string em **Project Settings → Database → Connection string** no painel do Supabase (modo "Transaction pooler", porta 6543, ou "Session pooler", porta 5432) e coloque em `DATABASE_URL` no `.env`.

## Rodando localmente

Pré-requisitos: Docker Desktop, Node 20+, pnpm (`npm install -g pnpm`), um projeto Supabase criado.

```bash
cp .env.example .env      # edite DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID/SECRET e GEMINI_API_KEY
pnpm install

# gera e aplica as migrations
cd packages/core
node --env-file=../../.env ../../node_modules/tsx/dist/cli.mjs src/db/migrate.ts
cd ../..

docker compose up -d --build api-dev   # API em http://localhost:3011
pnpm --filter @quitado/web dev         # Frontend em http://localhost:5173
```

Login é via Google — crie um OAuth Client (tipo "Web application") no [Google Cloud Console](https://console.cloud.google.com/apis/credentials), com a tela de consentimento em modo **Testing** e seu email (e o de quem mais for usar) em **Test users**. Registre `http://localhost:5173/api/auth/google/callback` como redirect URI autorizado e coloque o Client ID/Secret no `.env`. O primeiro login sem convite pendente cria automaticamente um household novo pro usuário.

**Nota**: se a senha do banco no `DATABASE_URL` tiver caracteres especiais, evite `source .env`/exportar a variável direto no shell (bash pode quebrar a sintaxe) — use `node --env-file=.env` como acima, que lê o arquivo sem passar pelo shell.

**Nota de porta**: `docker-compose.yml` usa `3011` para a API em vez de `3001` porque essa porta já estava em uso por outro projeto nesta máquina. Ajuste se precisar.

Parar a API: `docker compose down`.

## Testes e typecheck

```bash
pnpm -r test        # Vitest em packages/calc e packages/core
pnpm -r typecheck    # tsc --noEmit em todos os pacotes
```

`packages/calc` tem cobertura dos casos de borda de `parcelaAindaAtiva()` (primeira parcela, última parcela, mês após o fim, financiamento sem término). `packages/core` tem cobertura do parser de CSV do Nubank usando uma amostra real de dados.

## Extração de fatura por IA (Gemini)

Defina `GEMINI_API_KEY` (Google AI Studio, camada gratuita) no `.env` para o caminho de upload de PDF/foto funcionar. O caminho de CSV do Nubank não precisa de IA — é parseado deterministicamente. **Antes de subir faturas reais**, ative billing no projeto Gemini para entrar na política de dados da camada paga (ver `requisitos-quitado.md`, seção 4).

## Status atual

Implementado e testado localmente via Docker: CRUD de despesas fixas e parcelamentos, dashboard com saldo projetado e timeline Gantt das dívidas, "quem me deve", meta de poupança, upload de fatura (Gemini para PDF/foto + parser determinístico para CSV do Nubank) com tela de revisão antes de persistir, login via Google com households (famílias) compartilhando dados e convite por link, PWA instalável (manifest + service worker com cache de leitura offline).

**Pendente**: deploy em produção na Vercel (banco já é o Supabase; falta configurar Vercel Blob para storage de arquivo e as env vars do projeto na Vercel) — falta acesso real às contas Vercel/Gemini do usuário. Ver `apps/api/vercel.json` e a seção de bloqueios técnicos no plano para o que ainda precisa ser decidido (rewrite entre projeto do frontend e da API, extração assíncrona para não esbarrar no timeout de function).
