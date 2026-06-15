"use client";

import { useState, useRef, FormEvent, InputHTMLAttributes } from "react";
import { useAuth, RegisterData } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { useModal } from "@/hooks/useModal";
import { Logo } from "@/components/brand/Logo";
import { useRouter } from "next/navigation";

// ── tiny primitives ────────────────────────────────────────────────────────

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--casino-text-muted)" }}>
        {label}
      </label>
      {children}
      {error && <span className="text-xs" style={{ color: "var(--casino-error)" }}>{error}</span>}
    </div>
  );
}

function TextInput({
  value, onChange, error, ...rest
}: { value: string; onChange: (v: string) => void; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="h-11 px-3 rounded-xl text-sm outline-none transition-all w-full"
      style={{
        background: "var(--casino-surface)",
        border: `1.5px solid ${error ? "var(--casino-error)" : focused ? "var(--casino-purple)" : "var(--casino-border-bright)"}`,
        color: "var(--casino-text)",
        boxShadow: focused && !error ? "0 0 0 3px var(--casino-purple-glow)" : "none",
      }}
      {...rest}
    />
  );
}

function PasswordInput({
  value, onChange, error, placeholder,
}: { value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-11 pl-3 pr-14 rounded-xl text-sm outline-none transition-all w-full"
        style={{
          background: "var(--casino-surface)",
          border: `1.5px solid ${error ? "var(--casino-error)" : focused ? "var(--casino-purple)" : "var(--casino-border-bright)"}`,
          color: "var(--casino-text)",
          boxShadow: focused && !error ? "0 0 0 3px var(--casino-purple-glow)" : "none",
        }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-0.5 rounded transition-colors hover:bg-white/10"
        style={{ color: "var(--casino-text-muted)" }}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function Checkbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="mt-0.5 w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all"
        style={{
          background: checked ? "var(--casino-purple)" : "transparent",
          border: `1.5px solid ${checked ? "var(--casino-purple)" : "var(--casino-border-bright)"}`,
        }}
      >
        {checked && <span className="text-white text-[9px] leading-none font-bold">✓</span>}
      </button>
      <span className="text-xs leading-[1.5]" style={{ color: "var(--casino-text-muted)" }}>
        {children}
      </span>
    </label>
  );
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

// ── validation ─────────────────────────────────────────────────────────────

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function isAgeValid(dob: string) {
  if (!dob) return false;
  const birth = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  return age > 18 || (age === 18 && (m > 0 || today.getDate() >= birth.getDate()));
}

// ── login form ─────────────────────────────────────────────────────────────

function LoginForm({ onDone }: { onDone: () => void }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isValidEmail(email))  errs.email    = "Enter a valid email address";
    if (password.length < 6)   errs.password = "At least 6 characters required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError("");
    try {
      await login(email, password);
      onDone();
    } catch {
      setApiError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email Address" error={errors.email}>
        <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} />
      </Field>

      <Field label="Password" error={errors.password}>
        <PasswordInput value={password} onChange={setPassword} error={errors.password} />
        <button type="button" className="self-end text-xs mt-0.5 hover:underline" style={{ color: "var(--casino-purple)" }}>
          Forgot password?
        </button>
      </Field>

      {apiError && <ErrorBanner>{apiError}</ErrorBanner>}

      <PrimaryButton loading={loading}>Sign In</PrimaryButton>
    </form>
  );
}

// ── register form ──────────────────────────────────────────────────────────

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { register } = useAuth();
  const [email, setEmail]       = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob]           = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [optIn, setOptIn]       = useState(true);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isValidEmail(email))     errs.email    = "Enter a valid email address";
    if (username.length < 3)      errs.username  = "At least 3 characters required";
    if (password.length < 8)      errs.password  = "At least 8 characters required";
    if (!isAgeValid(dob))         errs.dob       = "You must be 18 or older";
    if (!agreed)                  errs.agreed    = "You must accept the terms";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setApiError("");
    try {
      const data: RegisterData = { email, username, password, dob };
      await register(data);
      onDone();
    } catch {
      setApiError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {/* Welcome bonus */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{
          background: "linear-gradient(135deg,var(--casino-gold-soft),var(--casino-purple-soft))",
          border: "1px solid var(--casino-gold-bright)",
        }}
      >
        <span className="text-xl shrink-0">🎁</span>
        <div>
          <p className="text-xs font-bold" style={{ color: "var(--casino-gold)" }}>Welcome Bonus — Claim on signup</p>
          <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>50,000 Gold Coins &amp; 1.00 Sweep Coin, completely FREE</p>
        </div>
      </div>

      <Field label="Email Address" error={errors.email}>
        <TextInput type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} />
      </Field>
      <Field label="Username" error={errors.username}>
        <TextInput value={username} onChange={setUsername} placeholder="coolplayer99" error={errors.username} />
      </Field>
      <Field label="Password" error={errors.password}>
        <PasswordInput value={password} onChange={setPassword} placeholder="Min. 8 characters" error={errors.password} />
      </Field>
      <Field label="Date of Birth" error={errors.dob}>
        <TextInput type="date" value={dob} onChange={setDob} error={errors.dob} />
      </Field>

      <div className="flex flex-col gap-2 pt-1">
        <Checkbox checked={agreed} onChange={setAgreed}>
          I am 18+ and agree to the{" "}
          <span style={{ color: "var(--casino-purple)" }}>Terms of Service</span> and{" "}
          <span style={{ color: "var(--casino-purple)" }}>Privacy Policy</span>.
          This is for entertainment purposes only.
        </Checkbox>
        {errors.agreed && <span className="text-xs pl-6" style={{ color: "var(--casino-error)" }}>{errors.agreed}</span>}
        <Checkbox checked={optIn} onChange={setOptIn}>
          Send me exclusive bonuses and casino promotions.
        </Checkbox>
      </div>

      {apiError && <ErrorBanner>{apiError}</ErrorBanner>}

      <PrimaryButton loading={loading} gold>Create Free Account</PrimaryButton>
    </form>
  );
}

// ── small shared pieces ────────────────────────────────────────────────────

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl text-sm"
      style={{
        background: "rgba(244,63,94,.08)",
        border: "1px solid rgba(244,63,94,.25)",
        color: "var(--casino-error)",
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children, loading, gold }: { children: React.ReactNode; loading: boolean; gold?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 rounded-full font-semibold text-sm text-white transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{
        background: gold
          ? "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))"
          : "linear-gradient(135deg,var(--casino-purple),#4f46e5)",
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner /> {gold ? "Creating Account…" : "Signing In…"}
        </span>
      ) : children}
    </button>
  );
}

// ── modal shell ────────────────────────────────────────────────────────────

export default function AuthModal() {
  const { showModal, activeTab, closeAuth, setTab } = useAuth();
  const { brand } = useBrand();
  const router  = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogProps = useModal<HTMLDivElement>(showModal, closeAuth, { labelledBy: "auth-modal-title" });

  if (!showModal) return null;

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeAuth();
  }

  function handleDone() {
    closeAuth();
    router.push("/dashboard");
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)" }}
    >
      <div
        {...dialogProps}
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        style={{
          background: "var(--casino-surface-2)",
          border: "1px solid var(--casino-border-bright)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,var(--casino-purple),transparent)" }}
        />

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          {/* Close */}
          <button
            onClick={closeAuth}
            aria-label="Close sign in dialog"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-xl transition-colors hover:bg-white/10"
            style={{ color: "var(--casino-text-muted)" }}
          >
            ×
          </button>

          {/* Brand */}
          <div id="auth-modal-title" className="flex items-center gap-2 mb-5">
            <Logo size={28} letters={brand.logoLetters} />
            <span className="font-bold text-sm tracking-tight" style={{ color: "var(--casino-text)" }}>
              {brand.name}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1" style={{ background: "var(--casino-surface)" }}>
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: activeTab === tab ? "var(--casino-surface-3)" : "transparent",
                  color: activeTab === tab ? "var(--casino-text)" : "var(--casino-text-muted)",
                  boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,.4)" : "none",
                }}
              >
                {tab === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {activeTab === "login"
            ? <LoginForm onDone={handleDone} />
            : <RegisterForm onDone={handleDone} />
          }

          <p className="text-center text-xs mt-4" style={{ color: "var(--casino-text-muted)" }}>
            {activeTab === "login" ? (
              <>No account?{" "}
                <button onClick={() => setTab("register")} className="font-semibold hover:underline" style={{ color: "var(--casino-purple)" }}>
                  Join free →
                </button>
              </>
            ) : (
              <>Already playing?{" "}
                <button onClick={() => setTab("login")} className="font-semibold hover:underline" style={{ color: "var(--casino-purple)" }}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

