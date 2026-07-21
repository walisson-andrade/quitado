/**
 * Login agora é via Google (ver `packages/core/src/auth/google.ts`) — não
 * existe mais senha pra seedar. Household e usuário nascem sozinhos no
 * primeiro login (ver `callbackGoogle` em `handlers/auth.ts`), então não há
 * nada pra preparar aqui antes de rodar o app localmente. Mantido como
 * no-op (em vez de removido) só pra não quebrar `pnpm db:seed` de quem tiver
 * o comando salvo no histórico do shell.
 */
async function main() {
  console.log("Nada pra seedar — login é via Google, household nasce no primeiro acesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
