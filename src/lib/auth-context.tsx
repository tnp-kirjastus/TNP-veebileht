"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: "not_initialized" }),
  signUp: async () => ({ error: "not_initialized" }),
  requestPasswordReset: async () => ({ error: "not_initialized" }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const sb = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) setProfile(data as Profile);
  }, [sb]);

  const ensureProfile = useCallback(async (authUser: User) => {
    const { data } = await sb.from("profiles").select("id").eq("id", authUser.id).maybeSingle();
    if (data) {
      await fetchProfile(authUser.id);
      return;
    }
    await fetch("/api/profiil/create-profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: authUser.user_metadata?.full_name ?? "" }),
    });
    await fetchProfile(authUser.id);
  }, [sb, fetchProfile]);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) ensureProfile(session.user);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) ensureProfile(session.user);
      else setProfile(null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [sb, ensureProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: "Sisselogimine ebaõnnestus. Kontrolli e-posti ja parooli." };
    return {};
  }, [sb]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/profiil` } });
    if (error) {
      if (error.message?.includes("already")) return { error: "Selle e-posti aadressiga on juba konto loodud." };
      if (error.message?.includes("password")) return { error: error.message };
      return { error: `Registreerimine ebaõnnestus: ${error.message}` };
    }
    if (data.user && data.session) {
      const res = await fetch("/api/profiil/create-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      if (!res.ok) return { error: "Konto loodi, kuid profiili salvestamine ebaõnnestus." };
    }
    return {};
  }, [sb]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    setProfile(null);
  }, [sb]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profiil/parool-uus`,
    });
    // Keep the public response neutral so account existence is not disclosed.
    if (error) return { error: "Parooli taastamise kirja saatmine ebaõnnestus." };
    return {};
  }, [sb]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, requestPasswordReset, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
