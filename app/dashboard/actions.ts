"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Não há UI de erro plugada neste form fire-and-forget; registramos
    // para diagnóstico e ainda assim redirecionamos, pois o redirect()
    // via response já derruba os cookies de sessão no cliente.
    console.error("Erro ao encerrar sessão:", error.message);
  }
  redirect("/login");
}

export type CreateLeadState = {
  error: string | null;
};

export async function createLead(
  _prevState: CreateLeadState,
  formData: FormData
): Promise<CreateLeadState> {
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;

  if (!nome || !email) {
    return { error: "Nome e email são obrigatórios" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada, faça login novamente." };
  }

  try {
    const { error } = await supabase
      .from("aula_leads")
      .insert({ nome, email, status: "novo" });

    if (error) {
      return { error: "Não foi possível conectar, tente novamente" };
    }
  } catch {
    return { error: "Não foi possível conectar, tente novamente" };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
