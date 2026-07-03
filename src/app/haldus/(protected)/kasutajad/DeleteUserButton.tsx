"use client";

import { deleteUser } from "@/app/haldus/user-actions";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  return (
    <form
      action={deleteUser}
      onSubmit={(e) => {
        if (!window.confirm(`Kas oled kindel, et soovid kustutada kasutaja ${email}?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        className="min-h-8 px-3 border border-line text-xs font-bold text-muted hover:border-accent hover:text-accent"
      >
        Kustuta
      </button>
    </form>
  );
}
