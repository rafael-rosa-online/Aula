# Progresso do exercício — Login + Mini CRM

## O que é este projeto

Exercício prático (pasta `Documents/aula`) para treinar login/senha protegendo um dashboard de mini-CRM, usando Next.js + Supabase Auth, com deploy numa VPS via EasyPanel.

## Status: CONCLUÍDO E NO AR ✅

URL de produção: **https://curso-ia-aula.4duqk0.easypanel.host**

## O que já foi feito

1. **Brainstorming completo** — decidido: Next.js (App Router) + Supabase Auth (não NextAuth) + Supabase Postgres (cloud, não self-hosted) + deploy via Docker na VPS/EasyPanel + dashboard com mini-funcionalidade de CRM (tabela de leads vinda do Supabase).
2. **Spec escrita e revisada 4 vezes**: `docs/superpowers/specs/2026-07-03-login-crm-aula-design.md`
3. **Plano de implementação escrito**: `docs/superpowers/plans/2026-07-03-login-crm-aula-plan.md` — 11 tasks.
4. **Tasks 1-10 implementadas via `superpowers:subagent-driven-development`**, cada uma com implementador + revisor dedicado, e verificação manual real no navegador — branch `feature/login-crm`, depois mergeada em `master`.
5. **Revisão final do branch + rodada extra de `/code-review --level high`**: 10 achados no total (nenhum crítico), todos corrigidos e re-revisados como Approved. Destaques: `middleware.ts` renomeado para `proxy.ts` (convenção deprecated no Next 16), `createLead` ganhou checagem de auth interna e tratamento de erro inline, `LoginForm` migrado para `useActionState`.
6. **Merge + push**: `feature/login-crm` → `master`, pushado para `https://github.com/rafael-rosa-online/Aula.git`.
7. **Task 11 — Deploy no EasyPanel**: serviço `aula` criado dentro do projeto `curso_ia` (VPS Hostinger, EasyPanel em `179.197.224.1:3000`), fonte GitHub (`rafael-rosa-online/Aula`, branch `master`, build via Dockerfile). Domínio automático: `https://curso-ia-aula.4duqk0.easypanel.host`.
8. **Bug de deploy encontrado e corrigido**: o Next.js standalone (`server.js`) usa `process.env.HOSTNAME` para decidir o endereço de bind; o Docker injeta `HOSTNAME=<container-id>` automaticamente, fazendo o servidor escutar só no IP interno do container (não em `0.0.0.0`), o que deixava o app inacessível pelo proxy do EasyPanel ("Service is not reachable"). Diagnosticado via terminal do próprio EasyPanel (`wget localhost` dava "connection refused"; `/proc/net/tcp` mostrava bind num IP específico, não `0.0.0.0`). **Fix**: adicionado `ENV HOSTNAME="0.0.0.0"` no Dockerfile (commit `7f140b8`). Depois do redeploy, log passou a mostrar `Network: http://0.0.0.0:80` e o app ficou acessível.
9. **Checklist do Task 9 revalidado 100% em produção**: login correto (teste1@aula.com) → dashboard, cadastro de lead aparece na tabela, logout → bloqueia `/dashboard`, login com `teste2@aula.com` vê os mesmos leads (RLS de acesso compartilhado confirmado). Leads de teste criados durante a verificação foram apagados do banco depois.

## Detalhes técnicos permanentes (para manutenção futura)

- **Supabase reaproveitado é o projeto de produção da agência** (`rafael-rosa-online`, id `qehiavcpkgzjjrzvzqze`) — não dedicado a este exercício, para evitar cobrança extra. A tabela do exercício chama-se **`aula_leads`** (não `leads`) para não confundir com dados reais de clientes.
- **Usuários de teste no Supabase Auth**: `teste1@aula.com` e `teste2@aula.com`, senha `aula123` (ambos).
- **EasyPanel**: VPS Hostinger, painel em `http://179.197.224.1:3000`, projeto `curso_ia`, serviço `aula`. Variáveis de ambiente (também usadas como build args) configuradas na aba "Ambiente" do serviço: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Dockerfile precisa de `ENV HOSTNAME="0.0.0.0"`** — sem isso o Next standalone não fica acessível via proxy reverso em ambientes Docker (Swarm/EasyPanel). Não remover essa linha.
- Repositório GitHub: `https://github.com/rafael-rosa-online/Aula` (público, branch `master`).

## Referências

- Spec: `docs/superpowers/specs/2026-07-03-login-crm-aula-design.md`
- Plano: `docs/superpowers/plans/2026-07-03-login-crm-aula-plan.md`
- Ledger passo a passo da implementação: `.superpowers/sdd/progress.md`
- Projeto real similar (não é este exercício): `C:\Users\rafae\Documents\aiox-crm` (Next.js + NextAuth + Prisma — usado como referência de padrões, mas este exercício usa Supabase Auth em vez de NextAuth)
