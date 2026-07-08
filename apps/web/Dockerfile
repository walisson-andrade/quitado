FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json .npmrc ./
COPY packages/shared-types packages/shared-types
COPY packages/calc packages/calc
COPY apps/web apps/web

RUN pnpm install --no-frozen-lockfile

# Defensivo: neste ambiente Docker Desktop os symlinks workspace:* às vezes
# são gravados com o path absoluto do host (Windows) em vez do path dentro
# do container — refaz explicitamente com o path real /repo para garantir
# resolução correta independente de como o pnpm calculou o link.
RUN set -e; \
  for dir in /repo/node_modules /repo/apps/web/node_modules; do \
    mkdir -p "$dir/@quitado"; \
    ln -sfn /repo/packages/shared-types "$dir/@quitado/shared-types"; \
    ln -sfn /repo/packages/calc "$dir/@quitado/calc"; \
  done

WORKDIR /repo/apps/web

EXPOSE 5173

CMD ["pnpm", "dev"]
