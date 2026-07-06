import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leads } = await supabase
    .from("aula_leads")
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
