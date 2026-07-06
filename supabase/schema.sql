-- Tabela do exercício "aula" (login + mini-CRM).
-- Nome prefixado com aula_ porque este projeto Supabase é compartilhado com dados
-- de produção da agência (clientes, campanhas, criativos, etc.) — aula_leads
-- existe só para este exercício e não deve ser confundida com dados reais.

create table aula_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  status text not null default 'novo',
  criado_em timestamptz not null default now()
);

alter table aula_leads enable row level security;

create policy "authenticated_can_select" on aula_leads
  for select
  to authenticated
  using (true);

create policy "authenticated_can_insert" on aula_leads
  for insert
  to authenticated
  with check (true);

create policy "authenticated_can_update" on aula_leads
  for update
  to authenticated
  using (true)
  with check (true);
