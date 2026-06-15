"use client";

import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from "react";
import { createAuthApi } from "@/lib/api/auth";

export type User = {
  id: string;
  email: string;
  username: string;
  gcBalance: number;
  scBalance: number;
  level: number;
  xp: number;
  xpToNext: number;
  avatarInitials: string;
};

type AuthState = {
  user: User | null;
  hydrated: boolean;
  showModal: boolean;
  activeTab: "login" | "register";
  showCoinsModal: boolean;
};

type AuthAction =
  | { type: "HYDRATE"; payload: User | null }
  | { type: "SET_USER"; payload: User }
  | { type: "LOGOUT" }
  | { type: "OPEN_MODAL"; tab?: "login" | "register" }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_TAB"; tab: "login" | "register" }
  | { type: "OPEN_COINS" }
  | { type: "CLOSE_COINS" };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "HYDRATE":     return { ...state, user: action.payload, hydrated: true };
    case "SET_USER":    return { ...state, user: action.payload, showModal: false };
    case "LOGOUT":      return { ...state, user: null };
    case "OPEN_MODAL":  return { ...state, showModal: true, activeTab: action.tab ?? state.activeTab };
    case "CLOSE_MODAL": return { ...state, showModal: false };
    case "SET_TAB":     return { ...state, activeTab: action.tab };
    case "OPEN_COINS":  return { ...state, showCoinsModal: true };
    case "CLOSE_COINS": return { ...state, showCoinsModal: false };
    default: return state;
  }
}

export type RegisterData = {
  email: string;
  username: string;
  password: string;
  dob: string;
};

type ContextValue = AuthState & {
  login:         (email: string, password: string) => Promise<void>;
  register:      (data: RegisterData) => Promise<void>;
  logout:        () => void;
  openAuth:      (tab?: "login" | "register") => void;
  closeAuth:     () => void;
  setTab:        (tab: "login" | "register") => void;
  openCoins:     () => void;
  closeCoins:    () => void;
};

const Ctx = createContext<ContextValue | null>(null);
const STORAGE_KEY = "ccore_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    hydrated: false,
    showModal: false,
    activeTab: "login",
    showCoinsModal: false,
  });

  const api = useMemo(() => createAuthApi(), []);

  useEffect(() => {
    let parsed: User | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const candidate = JSON.parse(raw);
        if (isStoredUser(candidate)) parsed = candidate;
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: "HYDRATE", payload: parsed });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await api.login(email, password);
    persist(user);
    dispatch({ type: "SET_USER", payload: user });
  }, [api]);

  const register = useCallback(async (data: RegisterData) => {
    const user = await api.register(data);
    persist(user);
    dispatch({ type: "SET_USER", payload: user });
  }, [api]);

  const logout     = useCallback(() => { localStorage.removeItem(STORAGE_KEY); dispatch({ type: "LOGOUT" }); }, []);
  const openAuth   = useCallback((tab?: "login" | "register") => dispatch({ type: "OPEN_MODAL", tab }), []);
  const closeAuth  = useCallback(() => dispatch({ type: "CLOSE_MODAL" }), []);
  const setTab     = useCallback((tab: "login" | "register") => dispatch({ type: "SET_TAB", tab }), []);
  const openCoins  = useCallback(() => dispatch({ type: "OPEN_COINS" }), []);
  const closeCoins = useCallback(() => dispatch({ type: "CLOSE_COINS" }), []);

  const value = useMemo<ContextValue>(() => ({
    ...state, login, register, logout, openAuth, closeAuth, setTab, openCoins, closeCoins,
  }), [state, login, register, logout, openAuth, closeAuth, setTab, openCoins, closeCoins]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

// ── helpers ────────────────────────────────────────────────────────────────

function persist(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function isStoredUser(v: unknown): v is User {
  if (!v || typeof v !== "object") return false;
  const u = v as Record<string, unknown>;
  return typeof u.id === "string"
      && typeof u.email === "string"
      && typeof u.username === "string"
      && typeof u.gcBalance === "number"
      && typeof u.scBalance === "number";
}
