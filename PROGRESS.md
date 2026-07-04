# Progresso do exercício — Login + Mini CRM

## O que é este projeto

Exercício prático (pasta `Documents/aula`) para treinar login/senha protegendo um dashboard de mini-CRM, usando Next.js + Supabase Auth, com deploy planejado numa VPS via EasyPanel.

## O que já foi feito

1. **Brainstorming completo** — decidido: Next.js (App Router) + Supabase Auth (não NextAuth) + Supabase Postgres (cloud, não self-hosted) + deploy via Docker na VPS/EasyPanel + dashboard com mini-funcionalidade de CRM (tabela de leads vinda do Supabase).
2. **Spec escrita e revisada 4 vezes** pelo code reviewer: `docs/superpowers/specs/2026-07-03-login-crm-aula-design.md`
   - Rodada 1: corrigiu RLS sem policy definida, middleware sem `getUser()`, env vars de build no Docker, comportamento de usuário já logado em `/login`, falta de teste cross-user.
   - Rodada 2: corrigiu policy RLS concedendo DELETE sem querer (deveria ser só SELECT/INSERT/UPDATE), detalhe de cookie no middleware, teste de RLS que não provava isolamento real.
   - Rodada 3: corrigiu **bug real** — o SQL da policy (`for select, insert, update` numa linha só) era sintaxe inválida do Postgres; corrigido para 3 policies separadas. Também ajustou o matcher do middleware e separou Server/Client Component na página de login.
   - Rodada 4: revisão convergiu — nenhum bug novo, só nitpicks de estilo (aceitos como estão).
3. **Plano de implementação escrito**: `docs/superpowers/plans/2026-07-03-login-crm-aula-plan.md` — 11 tasks, do scaffold do Next.js até o deploy na VPS.

## Estado atual

- Pasta `Documents/aula` tem só `docs/` e `.git` — **nenhum código do app foi escrito ainda**. O projeto Next.js em si (Task 1 do plano) ainda não foi criado.
- Repositório Git local inicializado, sem remoto configurado ainda.
- Supabase: projeto ainda não criado/configurado (isso é o Task 2 do plano).

## Como continuar

1. Abrir `docs/superpowers/plans/2026-07-03-login-crm-aula-plan.md`
2. Executar as 11 tasks em ordem, marcando os checkboxes conforme completa cada step
3. Escolher entre execução via subagentes (`superpowers:subagent-driven-development`) ou execução inline nesta sessão (`superpowers:executing-plans`) — ainda não decidido com o usuário
4. Task 2 exige ter uma conta no Supabase (supabase.com) e criar um projeto novo antes de rodar o SQL

## Referências

- Spec: `docs/superpowers/specs/2026-07-03-login-crm-aula-design.md`
- Plano: `docs/superpowers/plans/2026-07-03-login-crm-aula-plan.md`
- Projeto real similar (não é este exercício): `C:\Users\rafae\Documents\aiox-crm` (Next.js + NextAuth + Prisma — usado como referência de padrões, mas este exercício usa Supabase Auth em vez de NextAuth)
