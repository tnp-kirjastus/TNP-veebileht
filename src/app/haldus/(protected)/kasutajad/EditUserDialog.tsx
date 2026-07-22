"use client";

import { useEffect, useCallback, useActionState } from "react";
import { updateUser } from "@/app/haldus/user-actions";
import { FormField } from "@/components/admin/FormField";
import { clsx } from "clsx";

interface EditUserDialogProps {
  open: boolean;
  userId: string;
  email: string;
  role: string;
  onClose: () => void;
}

export function EditUserDialog({ open, userId, email, role, onClose }: EditUserDialogProps) {
  const [state, action, pending] = useActionState(updateUser, undefined);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  useEffect(() => {
    if (!pending && state?.success) {
      const timer = setTimeout(onClose, 1200);
      return () => clearTimeout(timer);
    }
  }, [pending, state, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} />
      <form
        action={action}
        className="relative bg-panel border border-line p-8 max-w-md w-full shadow-lg"
      >
        <h2 className="font-heading text-xl mb-6">Muuda kasutajat</h2>

        <input type="hidden" name="id" value={userId} />

        <div className="grid gap-4">
          <FormField label="E-post" required>
            <input
              name="email"
              type="email"
              required
              maxLength={255}
              defaultValue={email}
              className="border border-line bg-paper p-2 text-sm font-normal"
            />
          </FormField>

          <FormField label="Roll" required>
            <select
              name="role"
              required
              defaultValue={role}
              className="border border-line bg-paper p-2 text-sm font-normal"
            >
              <option value="viewer">viewer (ainult vaatamine)</option>
              <option value="editor">editor (muutmine, loomine)</option>
              <option value="admin">admin (kustutamine, import, tellimused)</option>
            </select>
          </FormField>

          <FormField label="Uus parool (j&auml;ta t&uuml;hjaks kui ei soovi muuta)">
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="border border-line bg-paper p-2 text-sm font-normal"
            />
          </FormField>
        </div>

        {state?.error && <p className="text-accent text-sm font-bold mt-4">{state.error}</p>}
        {state?.success && <p className="text-green-700 dark:text-green-400 text-sm font-bold mt-4">{state.success}</p>}

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className={clsx(
              "px-5 py-2.5 border border-line text-sm font-bold hover:bg-soft",
              pending && "opacity-50"
            )}
          >
            T&uuml;hista
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2.5 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {pending ? "Salvestan…" : "Salvesta"}
          </button>
        </div>
      </form>
    </div>
  );
}
