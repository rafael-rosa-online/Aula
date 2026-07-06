"use client";

import { useActionState } from "react";
import { createLead, type CreateLeadState } from "./actions";

const initialState: CreateLeadState = { error: null };

export function LeadForm() {
  const [state, formAction] = useActionState(createLead, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded border p-4">
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
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">
        Adicionar
      </button>
    </form>
  );
}
