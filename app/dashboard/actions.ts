"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createLead(formData: FormData) {
  const nome = formData.get("nome") as string;
  const email = formData.get("email") as string;

  if (!nome || !email) {
    throw new Error("Nome e email são obrigatórios");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("aula_leads")
    .insert({ nome, email, status: "novo" });

  if (error) {
    throw new Error("Não foi possível conectar, tente novamente");
  }

  revalidatePath("/dashboard");
}
