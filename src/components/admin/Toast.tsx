"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 0;

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id}
            className={`px-5 py-3 font-bold text-sm border shadow-lg flex items-center justify-between gap-3 cursor-pointer ${
              t.type === "success" ? "bg-leaf/10 text-leaf border-leaf/20" :
              t.type === "error" ? "bg-accent/10 text-accent border-accent/20" :
              "bg-blue-100 text-blue-800 border-blue-200"
            }`}
            onClick={() => remove(t.id)}>
            <span>{t.message}</span>
            <span className="text-xs opacity-50">✕</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
