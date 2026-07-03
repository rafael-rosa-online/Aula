# Design: Login + Mini CRM (Exercício)

Data: 2026-07-03

## Objetivo

Exercício prático para treinar a construção de um sistema de login/senha que dá acesso a um dashboard protegido de CRM, usando uma stack moderna e alinhada ao projeto real do usuário (`aiox-crm`).

## Arquitetura geral

- **Frontend + Backend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Autenticação:** Supabase Auth (email/senha), gerenciada via `@supabase/ssr` (sessão em cookies)
- **Banco de dados:** Supabase Postgres (cloud), tabela `leads` (nome, email, status, criado_em)
- **Proteção de dados:** Row Level Security (RLS) na tabela `leads`, com policy explícita: qualquer usuário autenticado pode SELECT/INSERT/UPDATE (modelo de CRM compartilhado pela equipe — **não há isolamento por usuário**, não existe coluna de dono/`user_id`). Anônimo (sem sessão) não acessa nada. Não há operação de exclusão de lead no exercício, então a policy **não concede DELETE** — só as três operações realmente usadas.
  ```sql
  alter table leads enable row level security;

  create policy "authenticated_full_access" on leads
    for select, insert, update
    to authenticated
    using (true)
    with check (true);
  ```
  Esse modelo "compartilhado" (`using (true)`) só é aceitável porque **não existe cadastro público de conta** (ver "Criação de usuário" abaixo) — todo usuário autenticado é criado manualmente e é, por definição, confiável. Se no futuro for adicionado cadastro público, essa policy precisa ser revisada junto.
- **Deploy:** Docker container rodando em VPS via EasyPanel; Supabase permanece 100% no Supabase Cloud

## Páginas e componentes

- **`/login`** — formulário público (email + senha), usa `supabase.auth.signInWithPassword()`. A própria página `/login` (Server Component) chama `getUser()` no carregamento; se já houver usuário válido, redireciona para `/dashboard` antes de renderizar o formulário — essa checagem fica na página, não no middleware, para não misturar essa regra com o matcher de rotas protegidas
- **`/dashboard`** — rota protegida:
  - Cabeçalho com "Bem-vindo, [email]" e botão "Sair"
  - Tabela de leads (nome, email, status) vinda do Supabase
  - Formulário para adicionar novo lead
- **`middleware.ts`** — em toda requisição, chama `supabase.auth.getUser()` (não `getSession()`) para revalidar o token direto com o servidor do Supabase — evita confiar em cookie local potencialmente expirado ou adulterado. Sem usuário válido em rota protegida → redireciona para `/login`. O cookie de sessão renovado precisa ser setado tanto no objeto `request` quanto no `response` reconstruído (`NextResponse.next({ request })` seguido de `response.cookies.set(...)`) — é assim que o `@supabase/ssr` propaga a sessão renovada para os Server Components na mesma requisição; setar só num dos dois faz a sessão cair de forma inconsistente
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
3. Com sessão válida → página busca os leads usando o token do usuário logado (não chave admin); RLS garante que só usuários autenticados acessam a tabela, com SELECT/INSERT/UPDATE liberados a qualquer autenticado (não há isolamento por usuário — ver policy completa na seção de Arquitetura)
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
- RLS: acesso à tabela `leads` sem token (anônimo) deve falhar
- RLS (acesso compartilhado): criar um segundo usuário de teste no Supabase e confirmar que ele consegue ver os leads criados pelo primeiro usuário — prova de fato o modelo compartilhado (uma única conta de teste não é suficiente para validar isso)

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
