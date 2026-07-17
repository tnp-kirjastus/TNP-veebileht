"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";

export function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
<<<<<<< HEAD
    <label
      className={clsx("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 text-sm font-bold", className)}
      htmlFor={htmlFor}
    >
=======
    <label className={clsx("grid gap-2 text-sm font-bold", className)} htmlFor={htmlFor}>
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      <span>{label}{required && <span className="text-accent ml-1">*</span>}</span>
      {children}
      {error && <p className="text-xs text-accent font-normal">{error}</p>}
    </label>
  );
}
