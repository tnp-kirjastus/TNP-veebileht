"use client";

import { useActionState } from "react";
import { saveCategory } from "@/app/haldus/taxonomy-actions";
import { FormField } from "@/components/admin/FormField";

export function CategoryForm({ category }: { category?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);

  return (
    <form action={action} className="border border-line bg-panel p-5 grid gap-4 max-w-2xl">
      <h3 className="font-heading text-lg">{category ? "Muuda kategooriat" : "Uus kategooria"}</h3>
      {category && <input type="hidden" name="id" value={String(category.id)} />}
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="Nimi" required>
          <input name="name_et" required maxLength={200} defaultValue={category ? String(category.name_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="URL-i nimi" required>
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={category ? String(category.slug ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="Järjekord">
          <input name="sort_order" type="number" min="0" defaultValue={category ? String(category.sort_order ?? 0) : "0"} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
<<<<<<< HEAD
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50">
=======
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 bg-ink text-white text-sm font-bold disabled:opacity-50">
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
        {pending ? "Salvestan…" : category ? "Salvesta" : "Loo kategooria"}
      </button>
    </form>
  );
}
