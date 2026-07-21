-- Uma pessoa pode ser membro de mais de um household (ex: família dela e a
-- do parceiro) — active_household_id guarda qual delas a sessão usa por
-- padrão no próximo login, atualizado sempre que a pessoa troca de família
-- pela tela de Configurações.
ALTER TABLE "quitado_users" ADD COLUMN "active_household_id" uuid REFERENCES "quitado_households"("id") ON DELETE SET NULL;
