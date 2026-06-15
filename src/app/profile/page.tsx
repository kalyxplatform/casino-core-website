"use client";

import { useState } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

type Section = "account" | "security" | "notifications" | "responsible";

export default function ProfilePage() {
  const { user, ready } = useProtectedRoute();

  if (!ready || !user) return <Skeleton />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-1">Profile &amp; Settings</h1>
      <p className="text-sm mb-8" style={{ color: "var(--casino-text-muted)" }}>
        Manage your account, security, and preferences.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        <SidebarNav />
        <div className="flex-1 space-y-6">
          <AccountSection user={user} />
          <SecuritySection />
          <NotificationsSection />
          <ResponsibleGamblingSection />
          <KYCSection />
        </div>
      </div>
    </div>
  );
}

// ── sidebar ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { label: string; icon: string; id: Section }[] = [
  { label: "Account Info",         icon: "👤", id: "account" },
  { label: "Security",             icon: "🔒", id: "security" },
  { label: "Notifications",        icon: "🔔", id: "notifications" },
  { label: "Responsible Gambling", icon: "🛡️", id: "responsible" },
];

function SidebarNav() {
  return (
    <nav className="lg:w-48 shrink-0">
      <div
        className="rounded-2xl p-2 space-y-0.5"
        style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="flex items-center gap-2.5 h-9 px-3 rounded-xl text-xs font-medium transition-colors hover:bg-white/6"
            style={{ color: "var(--casino-text-muted)" }}
          >
            <span>{item.icon}</span> {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ── account section ────────────────────────────────────────────────────────

function AccountSection({ user }: { user: { email: string; username: string } }) {
  const [username, setUsername] = useState(user.username);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card id="account" title="Account Information" icon="👤">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SettingField label="Email Address">
          <div
            className="h-11 px-3 flex items-center rounded-xl text-sm"
            style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border)", color: "var(--casino-text-muted)" }}
          >
            {user.email}
            <span
              className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,.15)", color: "var(--casino-success)" }}
            >
              Verified
            </span>
          </div>
        </SettingField>

        <SettingField label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 px-3 rounded-xl text-sm w-full outline-none"
            style={{
              background: "var(--casino-surface)",
              border: "1px solid var(--casino-border-bright)",
              color: "var(--casino-text)",
            }}
          />
        </SettingField>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <SaveButton onClick={save} saved={saved} />
      </div>
    </Card>
  );
}

// ── security section ───────────────────────────────────────────────────────

function SecuritySection() {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [saved, setSaved]       = useState(false);

  function save() {
    setSaved(true);
    setCurrent(""); setNext(""); setConfirm("");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card id="security" title="Security" icon="🔒">
      <div className="space-y-3">
        <SettingField label="Current Password">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
            placeholder="Enter current password"
            className="h-11 px-3 rounded-xl text-sm w-full outline-none"
            style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
          />
        </SettingField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SettingField label="New Password">
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
              placeholder="Min. 8 characters"
              className="h-11 px-3 rounded-xl text-sm w-full outline-none"
              style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
            />
          </SettingField>
          <SettingField label="Confirm New Password">
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="h-11 px-3 rounded-xl text-sm w-full outline-none"
              style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
            />
          </SettingField>
        </div>
      </div>

      <div className="mt-4">
        <SaveButton onClick={save} saved={saved} label="Update Password" />
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--casino-border)" }}>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--casino-text-muted)" }}>Two-Factor Authentication</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Authenticator App</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>Add an extra layer of security</p>
          </div>
          <Toggle defaultOn={false} />
        </div>
      </div>
    </Card>
  );
}

// ── notifications section ──────────────────────────────────────────────────

function NotificationsSection() {
  return (
    <Card id="notifications" title="Notifications" icon="🔔">
      <div className="space-y-4">
        {[
          { label: "Promotional Emails",   desc: "Bonus offers, new games, and event announcements", def: true },
          { label: "Daily Bonus Reminder", desc: "Get reminded when your daily bonus is ready",        def: true },
          { label: "VIP Level-Up",         desc: "Celebrate when you reach a new VIP tier",            def: true },
          { label: "Friend Activity",      desc: "When a friend joins or reaches a milestone",         def: false },
          { label: "Weekly Summary",       desc: "Your weekly stats and upcoming promotions",          def: false },
        ].map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{item.desc}</p>
            </div>
            <Toggle defaultOn={item.def} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── responsible gambling ───────────────────────────────────────────────────

function ResponsibleGamblingSection() {
  return (
    <Card id="responsible" title="Responsible Gambling" icon="🛡️">
      <div
        className="rounded-xl p-3 mb-5 text-xs leading-5"
        style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", color: "var(--casino-text-muted)" }}
      >
        CasinoCore is a <strong style={{ color: "var(--casino-text)" }}>free social casino</strong>. No real money is at stake.
        These tools are here if you want to manage your play time.
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold mb-2">Daily Play Limit</p>
          <p className="text-xs mb-2" style={{ color: "var(--casino-text-muted)" }}>
            Set a maximum number of hours per day
          </p>
          <select
            className="h-10 px-3 rounded-xl text-sm outline-none"
            style={{
              background: "var(--casino-surface)",
              border: "1px solid var(--casino-border-bright)",
              color: "var(--casino-text)",
              width: 180,
            }}
          >
            <option>No Limit</option>
            {[1, 2, 3, 4, 6, 8].map((h) => (
              <option key={h}>{h} Hour{h > 1 ? "s" : ""}</option>
            ))}
          </select>
        </div>

        <div className="h-px" style={{ background: "var(--casino-border)" }} />

        <div>
          <p className="text-sm font-semibold mb-1">Cool-off Period</p>
          <p className="text-xs mb-3" style={{ color: "var(--casino-text-muted)" }}>
            Temporarily suspend your account. Your progress is saved.
          </p>
          <div className="flex gap-2 flex-wrap">
            {["24 Hours", "7 Days", "30 Days"].map((label) => (
              <button
                key={label}
                className="h-8 px-4 rounded-full text-xs font-medium transition-all hover:bg-white/10"
                style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text-muted)" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px" style={{ background: "var(--casino-border)" }} />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-red-400">Self-Exclusion</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
              Permanently close your account. This cannot be undone.
            </p>
          </div>
          <button
            className="shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-colors hover:bg-red-500/20"
            style={{ border: "1px solid rgba(244,63,94,.4)", color: "var(--casino-error)" }}
          >
            Exclude Me
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── KYC section ───────────────────────────────────────────────────────────

function KYCSection() {
  return (
    <Card title="Identity Verification (KYC)" icon="🪪">
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "var(--casino-gold-soft)", border: "1px solid var(--casino-gold-bright)" }}
      >
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--casino-gold)" }}>
            Verification Required for Redemptions
          </p>
          <p className="text-xs leading-5" style={{ color: "var(--casino-text-muted)" }}>
            To redeem Sweep Coins for prizes, you must verify your identity.
            This is required by law and protects your account. Gold Coin play
            is always available without verification.
          </p>
          <button
            className="mt-3 h-8 px-5 rounded-full text-xs font-bold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,var(--casino-gold),#f97316)" }}
          >
            Start Verification
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: "1", label: "Email",     status: "complete",  desc: "Email confirmed" },
          { step: "2", label: "Identity",  status: "pending",   desc: "Gov. ID required" },
          { step: "3", label: "Address",   status: "locked",    desc: "Utility bill required" },
        ].map((s) => (
          <div
            key={s.step}
            className="rounded-xl p-3 text-center"
            style={{
              background: "var(--casino-surface)",
              border: `1px solid ${s.status === "complete" ? "rgba(16,185,129,.3)" : "var(--casino-border)"}`,
            }}
          >
            <div
              className="w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-2"
              style={{
                background: s.status === "complete" ? "rgba(16,185,129,.2)" : "var(--casino-surface-3)",
                color: s.status === "complete" ? "var(--casino-success)" : "var(--casino-text-muted)",
              }}
            >
              {s.status === "complete" ? "✓" : s.step}
            </div>
            <p className="text-xs font-semibold">{s.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── shared UI atoms ────────────────────────────────────────────────────────

function Card({ id, title, icon, children }: { id?: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="rounded-2xl p-5"
      style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
    >
      <div className="flex items-center gap-2 mb-5" style={{ borderBottom: "1px solid var(--casino-border)", paddingBottom: "1rem" }}>
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--casino-text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saved, label = "Save Changes" }: { onClick: () => void; saved: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-5 rounded-full text-xs font-bold text-white transition-all hover:scale-105"
      style={{
        background: saved
          ? "linear-gradient(135deg,var(--casino-success),#0891b2)"
          : "linear-gradient(135deg,var(--casino-purple),#4f46e5)",
      }}
    >
      {saved ? "✓ Saved!" : label}
    </button>
  );
}

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className="shrink-0 w-10 h-6 rounded-full relative transition-all"
      style={{ background: on ? "var(--casino-purple)" : "var(--casino-surface-3)" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? "calc(100% - 20px)" : "4px" }}
      />
    </button>
  );
}

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      {[120, 200, 160].map((h, i) => (
        <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "var(--casino-surface-2)" }} />
      ))}
    </div>
  );
}
