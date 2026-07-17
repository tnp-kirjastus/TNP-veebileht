"use client";

import { useActionState } from "react";
import { saveSeries } from "@/app/haldus/taxonomy-actions";
import { FormField } from "@/components/admin/FormField";

export function SeriesForm({ series }: { series?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveSeries, undefined);

  return (
    <form action={action} className="border border-line bg-panel p-5 grid gap-4 max-w-2xl">
      <h3 className="font-heading text-lg">{series ? "Muuda sarja" : "Uus sari"}</h3>
      {series && <input type="hidden" name="id" value={String(series.id)} />}
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="Nimi" required>
          <input name="name_et" required maxLength={200} defaultValue={series ? String(series.name_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="URL-i nimi" required>
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={series ? String(series.slug ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      <FormField label="Kirjeldus">
        <textarea name="description_et" rows={3} maxLength={5000} defaultValue={series ? String(series.description_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
      </FormField>
      <FormField label="Kaanepilt (failinimi)">
        <input name="cover_image" maxLength={500} defaultValue={series ? String(series.cover_image ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
      </FormField>
      {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50">
        {pending ? "Salvestan…" : series ? "Salvesta" : "Loo sari"}
      </button>
    </form>
  );
}
