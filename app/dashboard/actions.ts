"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
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
  const { error } = await supabase
    .from("aula_leads")
    .insert({ nome, email, status: "novo" });

  if (error) {
    return { error: "Não foi possível conectar, tente novamente" };
  }

  revalidatePath("/dashboard");
  return { error: null };
}
