# Design: Login + Mini CRM (Exercício)

Data: 2026-07-03

## Objetivo

Exercício prático para treinar a construção de um sistema de login/senha que dá acesso a um dashboard protegido de CRM, usando uma stack moderna e alinhada ao projeto real do usuário (`aiox-crm`).

## Arquitetura geral

- **Frontend + Backend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Autenticação:** Supabase Auth (email/senha), gerenciada via `@supabase/ssr` (sessão em cookies)
- **Banco de dados:** Supabase Postgres (cloud), tabela `leads` (nome, email, status, criado_em)
- **Proteção de dados:** Row Level Security (RLS) na tabela `leads` — apenas usuários autenticados podem ler/escrever
- **Deploy:** Docker container rodando em VPS via EasyPanel; Supabase permanece 100% no Supabase Cloud

## Páginas e componentes

- **`/login`** — formulário público (email + senha), usa `supabase.auth.signInWithPassword()`
- **`/dashboard`** — rota protegida:
  - Cabeçalho com "Bem-vindo, [email]" e botão "Sair"
  - Tabela de leads (nome, email, status) vinda do Supabase
  - Formulário para adicionar novo lead
- **`middleware.ts`** — valida sessão em toda requisição a `/dashboard`; sem sessão válida, redireciona para `/login`
- **Criação de usuário:** não há tela pública de cadastro (CRM interno). Usuário de teste é criado direto no painel do Supabase (Authentication → Users)

## Fluxo de dados

**Login:**
1. Usuário envia email/senha em `/login`
2. Cliente Supabase chama `signInWithPassword()`
3. Supabase valida e retorna sessão (JWT), armazenada em cookie via `@supabase/ssr`
4. Redireciona para `/dashboard`

**Acesso ao dashboard:**
1. Middleware lê o cookie de sessão a cada requisição
2. Sem sessão válida → redireciona para `/login`
3. Com sessão válida → página busca os leads usando o token do usuário logado (não chave admin), RLS garante isolamento de dados
4. Logout: `supabase.auth.signOut()` limpa sessão e redireciona para `/login`

**Cadastro de lead:**
1. Formulário no dashboard envia dados via Server Action do Next.js
2. Server Action valida campos obrigatórios (nome, email) e insere na tabela `leads`
3. Página recarrega lista atualizada

## Tratamento de erros

- **Login inválido:** mensagem genérica "Email ou senha inválidos" (sem indicar qual campo está errado)
- **Sessão expirada:** middleware redireciona automaticamente para `/login`
- **Falha ao cadastrar lead:** validação no Server Action, mensagem inline no formulário
- **Falha de conexão com Supabase:** mensagem genérica "Não foi possível conectar, tente novamente"

Escopo de erro deliberadamente simples — cobre os casos óbvios sem construir tratamento de erros de nível produção.

## Testes

Validação manual (sem suíte automatizada nesta versão):

- Login com credenciais corretas → acessa dashboard
- Login com credenciais erradas → mostra erro
- Acesso a `/dashboard` sem sessão → redireciona para login
- Logout → volta ao login e bloqueia acesso subsequente
- Cadastro de lead → aparece na tabela
- RLS: acesso à tabela `leads` sem token deve falhar

## Deploy (VPS + EasyPanel)

- **Dockerfile:** build multi-stage (build do Next.js + runtime enxuto)
- **Variáveis de ambiente:** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas no painel do EasyPanel (não versionadas no código)
- **EasyPanel:** serviço tipo "App" apontando para o Dockerfile, expondo a porta do Next.js
- **Supabase:** permanece no Supabase Cloud, sem infraestrutura extra na VPS

## Fora de escopo

- Tela pública de cadastro de conta
- Testes automatizados (Jest/Playwright)
- Recuperação de senha / "esqueci minha senha"
- Múltiplos papéis de usuário (admin, vendedor, etc.) — apenas um nível de acesso autenticado
