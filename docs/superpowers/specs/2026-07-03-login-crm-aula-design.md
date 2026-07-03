# Design: Login + Mini CRM (Exercício)

Data: 2026-07-03

## Objetivo

Exercício prático para treinar a construção de um sistema de login/senha que dá acesso a um dashboard protegido de CRM, usando uma stack moderna e alinhada ao projeto real do usuário (`aiox-crm`).

## Arquitetura geral

- **Frontend + Backend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Autenticação:** Supabase Auth (email/senha), gerenciada via `@supabase/ssr` (sessão em cookies)
- **Banco de dados:** Supabase Postgres (cloud), tabela `leads` (nome, email, status, criado_em)
- **Proteção de dados:** Row Level Security (RLS) na tabela `leads`, com policy explícita: qualquer usuário autenticado pode SELECT/INSERT/UPDATE (modelo de CRM compartilhado pela equipe — **não há isolamento por usuário**, não existe coluna de dono/`user_id`). Anônimo (sem sessão) não acessa nada.
  ```sql
  alter table leads enable row level security;

  create policy "authenticated_full_access" on leads
    for all
    to authenticated
    using (true)
    with check (true);
  ```
- **Deploy:** Docker container rodando em VPS via EasyPanel; Supabase permanece 100% no Supabase Cloud

## Páginas e componentes

- **`/login`** — formulário público (email + senha), usa `supabase.auth.signInWithPassword()`. Se o usuário já tiver sessão válida e acessar `/login` diretamente, redireciona para `/dashboard` (evita reexibir o formulário para quem já está logado)
- **`/dashboard`** — rota protegida:
  - Cabeçalho com "Bem-vindo, [email]" e botão "Sair"
  - Tabela de leads (nome, email, status) vinda do Supabase
  - Formulário para adicionar novo lead
- **`middleware.ts`** — em toda requisição, chama `supabase.auth.getUser()` (não `getSession()`) para revalidar o token direto com o servidor do Supabase — evita confiar em cookie local potencialmente expirado ou adulterado. Sem usuário válido em rota protegida → redireciona para `/login`. Também é responsável por regravar o cookie de sessão renovado a cada requisição, conforme exigido pelo `@supabase/ssr`
- **Criação de usuário:** não há tela pública de cadastro (CRM interno). Usuário de teste é criado direto no painel do Supabase (Authentication → Users)

## Fluxo de dados

**Login:**
1. Usuário envia email/senha em `/login`
2. Cliente Supabase chama `signInWithPassword()`
3. Supabase valida e retorna sessão (JWT), armazenada em cookie via `@supabase/ssr`
4. Redireciona para `/dashboard`

**Acesso ao dashboard:**
1. Middleware chama `getUser()` a cada requisição para validar a sessão junto ao Supabase
2. Sem usuário válido → redireciona para `/login`
3. Com sessão válida → página busca os leads usando o token do usuário logado (não chave admin); RLS garante que só usuários autenticados acessam a tabela (não há isolamento por usuário — ver policy na seção de Arquitetura)
4. Logout: `supabase.auth.signOut()` limpa sessão e redireciona para `/login`

**Cadastro de lead:**
1. Formulário no dashboard envia dados via Server Action do Next.js
2. Server Action valida campos obrigatórios (nome, email) e insere na tabela `leads`
3. Server Action chama `revalidatePath('/dashboard')` — o padrão Next.js para refletir a mudança, que causa uma nova busca da lista. Aceitável para o volume de dados de um exercício; não é uma otimização necessária aqui

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
- RLS: acesso à tabela `leads` sem token (anônimo) deve falhar; com token de qualquer usuário autenticado deve funcionar

## Deploy (VPS + EasyPanel)

- **Dockerfile:** build multi-stage (build do Next.js + runtime enxuto). Importante: variáveis `NEXT_PUBLIC_*` são embutidas no bundle do cliente **durante o `next build`**, não em runtime — por isso o Dockerfile declara `ARG NEXT_PUBLIC_SUPABASE_URL` e `ARG NEXT_PUBLIC_SUPABASE_ANON_KEY` no estágio de build, repassados para `ENV` antes de rodar `next build`
- **Variáveis de ambiente:** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas no painel do EasyPanel como **build args** do serviço (não só como env vars de runtime) — do contrário o build roda sem elas e o app sobe com URL/chave vazias
- **EasyPanel:** serviço tipo "App" apontando para o Dockerfile, configurado para passar os build args acima, expondo a porta do Next.js
- **Supabase:** permanece no Supabase Cloud, sem infraestrutura extra na VPS

## Fora de escopo

- Tela pública de cadastro de conta
- Testes automatizados (Jest/Playwright)
- Recuperação de senha / "esqueci minha senha"
- Múltiplos papéis de usuário (admin, vendedor, etc.) — apenas um nível de acesso autenticado
- Isolamento de dados por usuário (todo usuário autenticado vê e edita todos os leads — modelo de CRM compartilhado)
- Rate-limiting / proteção adicional contra força bruta no login além do limite padrão já aplicado pelo Supabase Auth
