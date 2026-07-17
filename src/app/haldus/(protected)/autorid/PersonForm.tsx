"use client";

import { useActionState } from "react";
import { savePerson } from "@/app/haldus/taxonomy-actions";
import { FormField } from "@/components/admin/FormField";

export function PersonForm({ person }: { person?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(savePerson, undefined);

  return (
    <form action={action} className="border border-line bg-panel p-5 grid gap-4 max-w-2xl">
      <h3 className="font-heading text-lg">{person ? "Muuda autorit" : "Uus autor"}</h3>
      {person && <input type="hidden" name="id" value={String(person.id)} />}
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="Nimi" required>
          <input name="name" required maxLength={200} defaultValue={person ? String(person.name ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="URL-i nimi" required>
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={person ? String(person.slug ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      <FormField label="Biograafia">
        <textarea name="bio_et" rows={4} maxLength={5000} defaultValue={person ? String(person.bio_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
      </FormField>
      {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50">
        {pending ? "Salvestan…" : person ? "Salvesta" : "Loo autor"}
      </button>
    </form>
  );
}
