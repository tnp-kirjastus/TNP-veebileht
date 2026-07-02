import type { ReactNode } from "react";
export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="flex items-end justify-between gap-4"><div><h1 className="font-heading text-5xl">{title}</h1><p className="text-muted mt-3">{description}</p></div>{action}</div>; }

