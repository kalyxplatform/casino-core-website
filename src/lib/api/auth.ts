import type { User, RegisterData } from "@/context/AuthContext";

/**
 * AuthApi — single interface every screen uses to talk to the auth backend.
 * Swap implementations via NEXT_PUBLIC_AUTH_API ("mock" | "http").
 */
export interface AuthApi {
  login:    (email: string, password: string) => Promise<User>;
  register: (data: RegisterData)              => Promise<User>;
}

export class AuthApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AuthApiError";
  }
}

// ── Mock implementation (current behaviour) ──────────────────────────────

export class MockAuthApi implements AuthApi {
  async login(email: string, _password: string): Promise<User> {
    await delay(800);
    return {
      id: "usr_demo",
      email,
      username: email.split("@")[0],
      gcBalance: 250_000,
      scBalance: 12.50,
      level: 7,
      xp: 6_800,
      xpToNext: 10_000,
      avatarInitials: email.slice(0, 2).toUpperCase(),
    };
  }

  async register(data: RegisterData): Promise<User> {
    await delay(1000);
    return {
      id: "usr_" + Date.now(),
      email: data.email,
      username: data.username,
      gcBalance: 50_000,
      scBalance: 1.00,
      level: 1,
      xp: 0,
      xpToNext: 1000,
      avatarInitials: data.username.slice(0, 2).toUpperCase(),
    };
  }
}

// ── HTTP implementation (casino-core-webapi stub) ────────────────────────

export class HttpAuthApi implements AuthApi {
  constructor(private baseUrl: string) {}

  async login(email: string, password: string): Promise<User> {
    return this.post<User>("/auth/login", { email, password });
  }

  async register(data: RegisterData): Promise<User> {
    return this.post<User>("/auth/register", data);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (!res.ok) {
      const message = await res.text().catch(() => res.statusText);
      throw new AuthApiError(message || "Request failed", res.status);
    }
    return res.json() as Promise<T>;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

export function createAuthApi(): AuthApi {
  const mode = process.env.NEXT_PUBLIC_AUTH_API;
  if (mode === "http") {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) throw new Error("NEXT_PUBLIC_API_URL must be set when NEXT_PUBLIC_AUTH_API=http");
    return new HttpAuthApi(base);
  }
  return new MockAuthApi();
}

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
