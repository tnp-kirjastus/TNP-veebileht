"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ProfileDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const ProfileDrawerContext = createContext<ProfileDrawerContextType>({
  isOpen: false, open: () => {}, close: () => {},
});

export function ProfileDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <ProfileDrawerContext.Provider value={{ isOpen, open, close }}>
      {children}
    </ProfileDrawerContext.Provider>
  );
}

export function useProfileDrawer() {
  return useContext(ProfileDrawerContext);
}
