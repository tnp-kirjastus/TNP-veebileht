"use client";

import { useActionState } from "react";
import { saveCampaign } from "@/app/haldus/taxonomy-actions";
import { FormField } from "@/components/admin/FormField";

export function CampaignForm({ campaign }: { campaign?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveCampaign, undefined);

  return (
    <form action={action} className="border border-line bg-panel p-5 grid gap-4 max-w-2xl">
      <h3 className="font-heading text-lg">{campaign ? "Muuda kampaaniat" : "Uus kampaania"}</h3>
      {campaign && <input type="hidden" name="id" value={String(campaign.id)} />}
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="Nimi" required>
          <input name="name_et" required maxLength={200} defaultValue={campaign ? String(campaign.name_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="URL-i nimi" required>
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={campaign ? String(campaign.slug ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      <FormField label="Kirjeldus">
        <textarea name="description_et" rows={3} maxLength={5000} defaultValue={campaign ? String(campaign.description_et ?? "") : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
      </FormField>
      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <FormField label="Algus">
          <input name="starts_at" type="date" defaultValue={campaign?.starts_at ? String(campaign.starts_at).slice(0, 10) : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="Lõpp">
          <input name="ends_at" type="date" defaultValue={campaign?.ends_at ? String(campaign.ends_at).slice(0, 10) : ""} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="Olek">
          <select name="is_active" defaultValue={campaign?.is_active !== false ? "true" : "false"} className="border border-line bg-paper p-2 text-sm font-normal">
            <option value="true">Aktiivne</option>
            <option value="false">Mitteaktiivne</option>
          </select>
        </FormField>
      </div>
      {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 bg-ink text-white text-sm font-bold disabled:opacity-50">
        {pending ? "Salvestan…" : campaign ? "Salvesta" : "Loo kampaania"}
      </button>
    </form>
  );
}
