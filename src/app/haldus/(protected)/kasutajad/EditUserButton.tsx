"use client";

import { useState } from "react";
import { EditUserDialog } from "./EditUserDialog";

export function EditUserButton({ userId, email, role }: { userId: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-8 px-3 border border-line text-xs font-bold text-muted hover:border-ink hover:text-ink"
      >
        Muuda
      </button>
      <EditUserDialog
        open={open}
        userId={userId}
        email={email}
        role={role}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
