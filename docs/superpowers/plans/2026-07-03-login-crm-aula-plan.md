# Login + Mini CRM (Exercício) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um app Next.js com login via Supabase Auth protegendo um dashboard de mini-CRM (tabela de leads), pronto para deploy numa VPS via EasyPanel.

**Architecture:** Next.js (App Router) com Supabase Auth (`@supabase/ssr`) gerenciando sessão via cookies; middleware revalida a sessão em `/dashboard/:path*`; RLS no Postgres do Supabase protege a tabela `leads` com modelo de acesso compartilhado (qualquer autenticado lê/escreve, sem isolamento por usuário); deploy via Dockerfile multi-stage rodando na VPS.

**Tech Stack:** Next.js (App Router, TypeScript, Tailwind CSS), `@supabase/supabase-js`, `@supabase/ssr`, Supabase Postgres (cloud), Docker, EasyPanel.

## Global Constraints

- Sem tela pública de cadastro de conta — usuários são criados manualmente no painel do Supabase (spec, "Criação de usuário").
- Sem testes automatizados nesta versão — validação é manual, seguindo o checklist da spec seção "Testes".
- RLS: nenhuma policy concede DELETE (não existe funcionalidade de excluir lead).
- Middleware `config.matcher` restrito a `/dashboard/:path*` — nunca deve rodar em `/login` ou assets estáticos.
- Middleware usa sempre `supabase.auth.getUser()`, nunca `getSession()` isoladamente, para revalidar a sessão contra o servidor.
- Variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem estar disponíveis como **build args** do Docker, não só como env vars de runtime.
- Este plano substitui o ciclo padrão de teste automatizado (red/green) por verificação manual no navegador ao final de cada tarefa funcional — decisão explícita da spec, não uma omissão.

Referência: `docs/superpowers/specs/2026-07-03-login-crm-aula-design.md`

---

## File Structure

```
aula/
├── app/
│   ├── login/
│   │   ├── page.tsx          # Server Component: redireciona se já logado, renderiza LoginForm
│   │   └── login-form.tsx    # Client Component: formulário de login
│   ├── dashboard/
│   │   ├── page.tsx          # Server Component: header, tabela de leads, formulário de novo lead
│   │   └── actions.ts        # Server Actions: createLead, logout
│   ├── layout.tsx             # gerado pelo create-next-app
│   ├── page.tsx               # gerado pelo create-next-app (pode redirecionar para /login)
│   └── globals.css
├── lib/
│   └── supabase/
│       ├── client.ts          # createClient() para uso no navegador (Client Components)
│       ├── server.ts          # createClient() para uso em Server Components/Actions
│       └── middleware.ts       # updateSession() usado pelo middleware.ts raiz
├── middleware.ts               # raiz do projeto: chama updateSession, define config.matcher
├── supabase/
│   └── schema.sql              # tabela leads + RLS policies (executado manualmente no Supabase)
├── Dockerfile
├── .dockerignore
├── .env.local                  # não versionado
├── .env.local.example
├── next.config.ts              # output: 'standalone'
└── docs/superpowers/
    ├── specs/2026-07-03-login-crm-aula-design.md
    └── plans/2026-07-03-login-crm-aula-plan.md
```

---

## Task 1: Scaffold do projeto Next.js

**Files:**
- Create: projeto inteiro via `create-next-app` em `C:\Users\rafae\Documents\aula`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: projeto Next.js rodando em `npm run dev`, disponível para as próximas tasks usarem `app/`, `lib/`

- [ ] **Step 1: Rodar o scaffold do Next.js**

Run (dentro de `C:\Users\rafae\Documents\aula`, que já tem `.git` e a pasta `docs/` — o create-next-app não sobrescreve o que já existe):

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-npm
```

Quando perguntar sobre Turbopack, aceite o padrão. Se perguntar se a pasta não está vazia, confirme que quer continuar (a pasta só tem `.git` e `docs/`, não há conflito de arquivos).

- [ ] **Step 2: Configurar `output: 'standalone'` para o build Docker enxuto**

Edite `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 3: Verificar que o projeto roda**

Run: `npm run dev`
Expected: servidor sobe em `http://localhost:3000`, a página inicial padrão do Next.js aparece no navegador. Pare o servidor (Ctrl+C) depois de confirmar.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with standalone output"
```

---

## Task 2: Criar tabela `leads` e policies RLS no Supabase

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: tabela `leads` (colunas: `id`, `nome`, `email`, `status`, `criado_em`) com RLS habilitado, acessível pelas próximas tasks via `@supabase/supabase-js`

- [ ] **Step 1: Escrever o schema SQL**

Create `supabase/schema.sql`:

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  status text not null default 'novo',
  criado_em timestamptz not null default now()
);

alter table leads enable row level security;

create policy "authenticated_can_select" on leads
  for select
  to authenticated
  using (true);

create policy "authenticated_can_insert" on leads
  for insert
  to authenticated
  with check (true);

create policy "authenticated_can_update" on leads
  for update
  to authenticated
  using (true)
  with check (true);
```

- [ ] **Step 2: Rodar o SQL no Supabase**

No painel do Supabase (supabase.com) do projeto: SQL Editor → colar o conteúdo de `supabase/schema.sql` → Run.

Expected: mensagem de sucesso, tabela `leads` aparece em Table Editor com RLS ativado (ícone de cadeado).

- [ ] **Step 3: Criar dois usuários de teste**

No painel: Authentication → Users → Add user → criar dois usuários com email/senha (ex: `teste1@aula.com` e `teste2@aula.com`). Vão ser usados no Task 9 para provar o modelo de acesso compartilhado.

- [ ] **Step 4: Guardar as credenciais do projeto Supabase**

No painel: Project Settings → API. Anote `Project URL` e `anon public key` — serão usados no Task 3.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add leads table schema and RLS policies"
```

---

## Task 3: Instalar dependências do Supabase e configurar variáveis de ambiente

**Files:**
- Modify: `package.json` (via npm install)
- Create: `.env.local`
- Create: `.env.local.example`
- Modify: `.gitignore` (verificar que `.env.local` já está ignorado — o create-next-app já inclui isso por padrão)

**Interfaces:**
- Produces: `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` disponíveis para os clients do Task 4

- [ ] **Step 1: Instalar os pacotes**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: pacotes adicionados em `package.json` e `package-lock.json`.

- [ ] **Step 2: Criar `.env.local.example`**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Criar `.env.local` com as credenciais reais**

Create `.env.local` (usando os valores anotados no Task 2, Step 4):

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

- [ ] **Step 4: Confirmar que `.env.local` está no `.gitignore`**

Run: `grep -n "env" .gitignore`
Expected: linha `.env*` ou `.env.local` presente (o create-next-app já adiciona isso).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "Install Supabase dependencies and add env var template"
```

(`.env.local` não é commitado — contém segredos)

---

## Task 4: Criar os clients Supabase (browser, server, middleware)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

**Interfaces:**
- Produces:
  - `createClient()` em `lib/supabase/client.ts` — retorna um `SupabaseClient` para uso em Client Components
  - `createClient()` em `lib/supabase/server.ts` — função `async`, retorna `Promise<SupabaseClient>` para uso em Server Components/Actions
  - `updateSession(request: NextRequest)` em `lib/supabase/middleware.ts` — retorna `Promise<NextResponse>`, usado pelo Task 5

- [ ] **Step 1: Criar o client de navegador**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Criar o client de servidor**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component não pode escrever cookies — o middleware
            // (lib/supabase/middleware.ts) já cuida do refresh da sessão.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Criar o helper de middleware**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros de tipo (os três arquivos usam apenas tipos exportados por `@supabase/ssr` e `next/server`/`next/headers`).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/
git commit -m "Add Supabase client helpers for browser, server, and middleware"
```

---

## Task 5: Middleware raiz com matcher restrito a `/dashboard`

**Files:**
- Create: `middleware.ts` (raiz do projeto)

**Interfaces:**
- Consumes: `updateSession` de `lib/supabase/middleware.ts` (Task 4)
- Produces: proteção automática de qualquer rota sob `/dashboard`

- [ ] **Step 1: Criar o middleware raiz**

Create `middleware.ts`:

```ts
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 2: Verificação manual — sem sessão, `/dashboard` deve redirecionar**

Run: `npm run dev`, acesse `http://localhost:3000/dashboard` no navegador sem estar logado.
Expected: redireciona automaticamente para `/login` (a página ainda não existe — Next.js vai mostrar 404 em `/login`, o que é esperado até o Task 6. O importante aqui é confirmar que `/dashboard` NÃO renderiza nada e a URL muda para `/login`).

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "Add root middleware protecting /dashboard routes"
```

---

## Task 6: Página de login

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/login-form.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts` (Server Component) e de `lib/supabase/client.ts` (Client Component)
- Produces: rota `/login` funcional, redireciona usuário já autenticado para `/dashboard`

- [ ] **Step 1: Criar o Client Component do formulário**

Create `app/login/login-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Email ou senha inválidos");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <div>
        <label htmlFor="email" className="block text-sm">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded border px-3 py-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Criar o Server Component da página**

Create `app/login/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 3: Verificação manual — login com credenciais corretas**

Run: `npm run dev`, acesse `http://localhost:3000/login`, entre com um dos usuários criados no Task 2 (ex: `teste1@aula.com`).
Expected: após o submit, redireciona para `/dashboard` (que ainda vai dar 404 até o Task 7 — confirme só que a URL mudou e não apareceu erro de login).

- [ ] **Step 4: Verificação manual — login com credenciais erradas**

No formulário, tente uma senha errada.
Expected: mensagem "Email ou senha inválidos" aparece, sem redirecionar.

- [ ] **Step 5: Commit**

```bash
git add app/login/
git commit -m "Add login page with Supabase Auth"
```

---

## Task 7: Página do dashboard (header + tabela de leads)

**Files:**
- Create: `app/dashboard/actions.ts`
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`
- Produces: `logout()` Server Action (usada também pelo Task 8 se necessário), rota `/dashboard` renderizando dados reais

- [ ] **Step 1: Criar o arquivo de Server Actions com `logout`**

Create `app/dashboard/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Criar a página do dashboard**

Create `app/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <header className="flex items-center justify-between">
        <p>Bem-vindo, {user?.email}</p>
        <form action={logout}>
          <button type="submit" className="rounded border px-3 py-1 text-sm">
            Sair
          </button>
        </form>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Nome</th>
            <th className="py-2">Email</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads?.map((lead) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2">{lead.nome}</td>
              <td className="py-2">{lead.email}</td>
              <td className="py-2">{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

Nota: a página chama `getUser()` de novo (além do middleware) para ler o email do usuário logado — o middleware só decide se redireciona ou não, ele não repassa os dados do usuário para a página. É o padrão recomendado pelo próprio Supabase (middleware para revalidar/proteger, página para ler os dados que precisa exibir); é aceito ter duas chamadas por navegação nesse exercício.

- [ ] **Step 3: Verificação manual — dashboard renderiza com sessão válida**

Run: `npm run dev`, faça login com `teste1@aula.com`.
Expected: `/dashboard` mostra "Bem-vindo, teste1@aula.com", botão "Sair" e uma tabela vazia (ainda não há leads).

- [ ] **Step 4: Verificação manual — logout funciona**

Clique em "Sair".
Expected: redireciona para `/login`. Tente acessar `/dashboard` direto pela URL depois.
Expected: redireciona de volta para `/login` (sessão foi encerrada).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/
git commit -m "Add dashboard page with leads table and logout"
```

---

## Task 8: Cadastro de novo lead

**Files:**
- Modify: `app/dashboard/actions.ts`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Produces: `createLead(formData: FormData)` Server Action

- [ ] **Step 1: Adicionar a Server Action `createLead`**

Modify `app/dashboard/actions.ts` — adicionar a função abaixo (mantendo `logout` já existente):

```ts
import { revalidatePath } from "next/cache";

export async function createLead(formData: FormData) {
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;

  if (!nome || !email) {
    throw new Error("Nome e email são obrigatórios");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .insert({ nome, email, status: "novo" });

  if (error) {
    throw new Error("Não foi possível conectar, tente novamente");
  }

  revalidatePath("/dashboard");
}
```

O arquivo final `app/dashboard/actions.ts` deve ter os imports de `redirect`, `revalidatePath` e `createClient` no topo, seguidos das duas funções (`logout` e `createLead`).

- [ ] **Step 2: Adicionar o formulário na página**

Modify `app/dashboard/page.tsx` — importar `createLead` e adicionar o formulário depois da tabela:

```tsx
import { createLead, logout } from "./actions";
```

```tsx
      <form action={createLead} className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Novo lead</h2>
        <input
          name="nome"
          placeholder="Nome"
          required
          className="w-full rounded border px-3 py-2"
        />
        <input
          name="email"
          placeholder="Email"
          type="email"
          required
          className="w-full rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
          Adicionar
        </button>
      </form>
```

(inserir esse bloco de `<form>` logo depois de `</table>`, ainda dentro do `<main>`)

- [ ] **Step 3: Verificação manual — cadastrar um lead**

Com o app rodando e logado, preencha o formulário "Novo lead" e envie.
Expected: a página recarrega e o novo lead aparece na tabela acima.

- [ ] **Step 4: Verificação manual — campos obrigatórios**

Tente enviar o formulário com o campo "Nome" vazio.
Expected: o navegador bloqueia o submit (atributo `required` do HTML) antes mesmo de chamar a Server Action.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/
git commit -m "Add lead creation form and server action"
```

---

## Task 9: Checklist manual completo (spec "Testes")

**Files:** nenhum arquivo novo — esta task só executa e confirma o comportamento already implementado.

**Interfaces:** nenhuma nova

- [ ] **Step 1: Rodar o app localmente**

Run: `npm run dev`

- [ ] **Step 2: Percorrer o checklist da spec**

Confirme cada item, na ordem (todos já devem passar pelos Tasks 1-8; esta task é a validação final antes do deploy):

- [ ] Login com credenciais corretas → acessa dashboard
- [ ] Login com credenciais erradas → mostra "Email ou senha inválidos"
- [ ] Acesso a `/dashboard` sem sessão (aba anônima) → redireciona para `/login`
- [ ] Logout → volta ao login e bloqueia acesso subsequente a `/dashboard`
- [ ] Cadastro de lead → aparece na tabela
- [ ] RLS anônimo: abra o SQL Editor do Supabase e rode `select * from leads;` **sem** estar autenticado como usuário do app (isso é sempre com a `service_role`/painel, então não serve pra esse teste — em vez disso, confirme direto na tabela do Supabase Table Editor que RLS está habilitado, ícone de cadeado visível, como já verificado no Task 2)
- [ ] RLS acesso compartilhado: faça logout, entre com `teste2@aula.com` (o segundo usuário criado no Task 2) e confirme que os leads criados por `teste1@aula.com` aparecem na tabela — prova que o modelo compartilhado funciona

- [ ] **Step 3: Se algum item falhar, voltar à task correspondente**

Não commitar nada nesta task — se algo falhar, o fix pertence à task original (ex: bug no login pertence ao Task 6).

---

## Task 10: Dockerfile para deploy

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `output: "standalone"` configurado no Task 1
- Produces: imagem Docker buildável, pronta para o Task 11

- [ ] **Step 1: Criar `.dockerignore`**

Create `.dockerignore`:

```
node_modules
.next
.git
.env.local
docs
```

- [ ] **Step 2: Criar o Dockerfile multi-stage**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

- [ ] **Step 3: Testar o build localmente**

Run (substituindo pelos valores reais do `.env.local`):

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon \
  -t aula-crm .
```

Expected: build completa sem erros, termina com a imagem `aula-crm` criada.

- [ ] **Step 4: Rodar o container localmente**

Run: `docker run -p 3000:3000 aula-crm`
Acesse `http://localhost:3000/login` no navegador.
Expected: mesmo comportamento do `npm run dev` — login funciona, dashboard carrega os leads.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "Add multi-stage Dockerfile for production deploy"
```

---

## Task 11: Deploy na VPS via EasyPanel

**Files:** nenhum arquivo novo no projeto — configuração feita no painel do EasyPanel

**Interfaces:** nenhuma nova

- [ ] **Step 1: Subir o código para um repositório Git remoto**

Se ainda não existir remoto, criar um repositório (GitHub/GitLab) e:

```bash
git remote add origin <url-do-repositorio>
git push -u origin master
```

- [ ] **Step 2: Criar o serviço no EasyPanel**

No painel do EasyPanel da VPS: criar novo serviço do tipo "App", apontando para o repositório Git e o `Dockerfile` na raiz.

- [ ] **Step 3: Configurar os build args**

Na configuração do serviço, adicionar como **build arguments** (não apenas variáveis de runtime):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Com os mesmos valores do `.env.local`.

- [ ] **Step 4: Expor a porta e fazer o deploy**

Configurar a porta do serviço para `3000` (a mesma exposta no Dockerfile). Disparar o deploy pelo painel.

- [ ] **Step 5: Verificação manual em produção**

Acesse a URL pública gerada pelo EasyPanel.
Expected: `/login` carrega, login funciona, `/dashboard` mostra os leads cadastrados durante os testes locais (mesmo banco Supabase Cloud).

- [ ] **Step 6: Rodar o checklist do Task 9 de novo, agora em produção**

Repita os itens do Task 9 apontando para a URL da VPS, não para `localhost`.

---

## Self-Review (registrado para referência)

- **Cobertura da spec:** Arquitetura → Tasks 2-4; Páginas/componentes → Tasks 5-8; Fluxo de dados → Tasks 6-8; Tratamento de erros → Tasks 6 e 8 (mensagens de erro); Testes → Task 9; Deploy → Tasks 10-11. Todas as seções da spec têm task correspondente.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todo código é completo e copiável.
- **Consistência de tipos:** `createClient` (server) é sempre `async`/`await`da; `createClient` (browser) é síncrona — usado corretamente em cada arquivo (Client Components não usam `await` nela). `logout` e `createLead` exportadas de `app/dashboard/actions.ts` e importadas com os mesmos nomes em `app/dashboard/page.tsx`.
