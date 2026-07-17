"use client";

import { useActionState } from "react";
import { createUser } from "@/app/haldus/user-actions";
import { FormField } from "@/components/admin/FormField";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="border border-line bg-panel p-5 grid gap-4 max-w-2xl">
      <h3 className="font-heading text-lg">Uus kasutaja</h3>
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <FormField label="E-post" required>
          <input name="email" type="email" required maxLength={255} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
        <FormField label="Parool" required>
          <input name="password" type="password" required minLength={8} maxLength={128} className="border border-line bg-paper p-2 text-sm font-normal" />
        </FormField>
      </div>
      <FormField label="Roll" required>
        <select name="role" required defaultValue="viewer" className="border border-line bg-paper p-2 text-sm font-normal">
          <option value="viewer">viewer (ainult vaatamine)</option>
          <option value="editor">editor (muutmine, loomine)</option>
          <option value="admin">admin (kustutamine, import, tellimused)</option>
        </select>
      </FormField>
      {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
      {state?.success && <p className="text-green-700 dark:text-green-400 text-sm font-bold">{state.success}</p>}
<<<<<<< HEAD
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50">
=======
      <button type="submit" disabled={pending} className="justify-self-start min-h-10 px-6 bg-ink text-white text-sm font-bold disabled:opacity-50">
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
        {pending ? "Loon…" : "Loo kasutaja"}
      </button>
    </form>
  );
}
