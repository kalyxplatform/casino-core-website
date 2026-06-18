"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import { fmtCompact, fmtSC } from "@/lib/format/currency";

// ── data ───────────────────────────────────────────────────────────────────

export type CryptoOption = {
  id: string;
  name: string;
  symbol: string;
  color: string;
  textColor: string;
  network: string;
  addressPrefix: string;
};

export const CRYPTOS: CryptoOption[] = [
  { id: "btc",  name: "Bitcoin",       symbol: "BTC",  color: "#F7931A", textColor: "#fff",    network: "Bitcoin",        addressPrefix: "bc1q" },
  { id: "eth",  name: "Ethereum",      symbol: "ETH",  color: "#627EEA", textColor: "#fff",    network: "ERC-20",         addressPrefix: "0x"   },
  { id: "usdt", name: "Tether",        symbol: "USDT", color: "#26A17B", textColor: "#fff",    network: "ERC-20 / TRC-20",addressPrefix: "T"    },
  { id: "usdc", name: "USD Coin",      symbol: "USDC", color: "#2775CA", textColor: "#fff",    network: "ERC-20",         addressPrefix: "0x"   },
  { id: "bnb",  name: "BNB",           symbol: "BNB",  color: "#F3BA2F", textColor: "#1a1a1a", network: "BEP-20",         addressPrefix: "0x"   },
  { id: "sol",  name: "Solana",        symbol: "SOL",  color: "#9945FF", textColor: "#fff",    network: "Solana",         addressPrefix: ""     },
  { id: "ltc",  name: "Litecoin",      symbol: "LTC",  color: "#A5A9B5", textColor: "#fff",    network: "Litecoin",       addressPrefix: "ltc1" },
  { id: "doge", name: "Dogecoin",      symbol: "DOGE", color: "#C2A633", textColor: "#fff",    network: "Dogecoin",       addressPrefix: "D"    },
  { id: "xrp",  name: "XRP",           symbol: "XRP",  color: "#00AAE4", textColor: "#fff",    network: "XRPL",           addressPrefix: "r"    },
  { id: "trx",  name: "TRON",          symbol: "TRX",  color: "#EF0027", textColor: "#fff",    network: "TRC-20",         addressPrefix: "T"    },
];

type Package = {
  id: string;
  gc: number;
  sc: number;
  usd: number;
  popular?: boolean;
  tag?: string;
};

const PACKAGES: Package[] = [
  { id: "starter",  gc: 50_000,    sc: 0.50,  usd: 4.99  },
  { id: "popular",  gc: 200_000,   sc: 2.00,  usd: 19.99, popular: true, tag: "Best Value" },
  { id: "value",    gc: 500_000,   sc: 5.50,  usd: 49.99  },
  { id: "premium",  gc: 1_000_000, sc: 12.00, usd: 99.99  },
  { id: "vip",      gc: 2_500_000, sc: 30.00, usd: 249.99, tag: "VIP" },
];

// Mocked rates (USD per 1 coin)
export const RATES: Record<string, number> = {
  btc: 67_420,
  eth:  3_580,
  usdt: 1.00,
  usdc: 1.00,
  bnb:   580,
  sol:   175,
  ltc:    83,
  doge: 0.175,
  xrp:  0.62,
  trx:  0.12,
};

function cryptoAmount(usd: number, coinId: string): string {
  const rate = RATES[coinId] ?? 1;
  const amount = usd / rate;
  if (amount < 0.0001) return amount.toFixed(8);
  if (amount < 1)      return amount.toFixed(6);
  if (amount < 1000)   return amount.toFixed(4);
  return amount.toFixed(2);
}

function fakeAddress(coin: CryptoOption): string {
  const chars = "0123456789abcdef";
  let addr = coin.addressPrefix;
  while (addr.length < 34) addr += chars[Math.floor(Math.random() * chars.length)];
  return addr;
}

// Stable addresses — generated once per session, keyed by coin id
const ADDRESS_CACHE: Record<string, string> = {};
function getAddress(coin: CryptoOption): string {
  if (!ADDRESS_CACHE[coin.id]) ADDRESS_CACHE[coin.id] = fakeAddress(coin);
  return ADDRESS_CACHE[coin.id];
}

// ── step types ─────────────────────────────────────────────────────────────

type Step = "packages" | "crypto" | "address" | "success";

// ── modal ──────────────────────────────────────────────────────────────────

export default function GetCoinsModal() {
  const { showCoinsModal, closeCoins, user, openAuth } = useAuth();
  const [step, setStep]           = useState<Step>("packages");
  const [pkg, setPkg]             = useState<Package>(PACKAGES[1]);
  const [coin, setCoin]           = useState<CryptoOption>(CRYPTOS[0]);
  const [copied, setCopied]       = useState(false);
  const [countdown, setCountdown] = useState(1800); // 30 min
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogProps = useModal<HTMLDivElement>(showCoinsModal, closeCoins, { labelledBy: "coins-modal-title" });

  // Reset steps when modal closes (wait for exit animation)
  useEffect(() => {
    if (showCoinsModal) return;
    const t = setTimeout(() => { setStep("packages"); setCountdown(1800); }, 300);
    return () => clearTimeout(t);
  }, [showCoinsModal]);

  // Countdown timer once on the address step
  useEffect(() => {
    if (step !== "address") return;
    const t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  if (!showCoinsModal) return null;

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeCoins();
  }

  function copyAddress() {
    const addr = getAddress(coin);
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function simulateSuccess() {
    setStep("success");
  }

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.78)", backdropFilter: "blur(12px)" }}
    >
      <div
        {...dialogProps}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        style={{
          background: "var(--casino-surface-2)",
          border: "1px solid var(--casino-border-bright)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "var(--casino-gold-bright)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--casino-border)" }}>
          <div>
            <h2 id="coins-modal-title" className="font-black text-base">Get Coins</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
              {step === "packages" && "Choose a coin package"}
              {step === "crypto"   && "Select cryptocurrency"}
              {step === "address"  && `Send ${coin.symbol} to this address`}
              {step === "success"  && "Payment confirmed!"}
            </p>
          </div>
          <button
            onClick={closeCoins}
            aria-label="Close get coins dialog"
            className="w-8 h-8 flex items-center justify-center rounded-full text-xl transition-colors hover:bg-white/10"
            style={{ color: "var(--casino-text-muted)" }}
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-0 px-6 py-3" style={{ borderBottom: "1px solid var(--casino-border)" }}>
            {(["packages", "crypto", "address"] as Step[]).map((s, i) => {
              const steps: Step[] = ["packages", "crypto", "address"];
              const idx = steps.indexOf(s);
              const cur = steps.indexOf(step);
              const done = idx < cur;
              const active = idx === cur;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                      style={{
                        background: done ? "var(--casino-success)" : active ? "var(--casino-gold)" : "var(--casino-surface-3)",
                        color: done || active ? "#fff" : "var(--casino-text-muted)",
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <span className="text-[10px] hidden sm:block" style={{ color: active ? "var(--casino-text)" : "var(--casino-text-muted)" }}>
                      {s === "packages" ? "Package" : s === "crypto" ? "Crypto" : "Pay"}
                    </span>
                  </div>
                  {i < 2 && <div className="flex-1 h-px mx-2" style={{ background: done ? "var(--casino-success)" : "var(--casino-border)" }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {step === "packages" && (
            <PackageStep
              packages={PACKAGES}
              selected={pkg}
              onSelect={setPkg}
              onNext={() => {
                if (!user) { closeCoins(); openAuth("register"); return; }
                setStep("crypto");
              }}
              isLoggedIn={!!user}
            />
          )}
          {step === "crypto" && (
            <CryptoStep
              cryptos={CRYPTOS}
              selected={coin}
              pkg={pkg}
              onSelect={setCoin}
              onNext={() => { setCountdown(1800); setStep("address"); }}
              onBack={() => setStep("packages")}
            />
          )}
          {step === "address" && (
            <AddressStep
              coin={coin}
              pkg={pkg}
              address={getAddress(coin)}
              copied={copied}
              onCopy={copyAddress}
              countdownLabel={`${mins}:${secs}`}
              countdownSeconds={countdown}
              onConfirm={simulateSuccess}
              onBack={() => setStep("crypto")}
            />
          )}
          {step === "success" && (
            <SuccessStep pkg={pkg} coin={coin} onDone={closeCoins} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── step components ────────────────────────────────────────────────────────

function PackageStep({
  packages, selected, onSelect, onNext, isLoggedIn,
}: {
  packages: Package[]; selected: Package;
  onSelect: (p: Package) => void; onNext: () => void; isLoggedIn: boolean;
}) {
  return (
    <div className="space-y-3">
      {packages.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className="w-full rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
          style={{
            background: selected.id === p.id ? "var(--casino-gold-soft)" : "var(--casino-surface)",
            border: `1.5px solid ${selected.id === p.id ? "var(--casino-gold)" : "var(--casino-border)"}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: selected.id === p.id ? "var(--casino-gold)" : "var(--casino-border-bright)",
                  background: selected.id === p.id ? "var(--casino-gold)" : "transparent",
                }}>
                {selected.id === p.id && <span className="w-2 h-2 rounded-full" style={{ background: "#431407" }} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "var(--casino-gold)" }}>
                    {fmtCompact(p.gc)} GC
                  </span>
                  <span className="text-xs" style={{ color: "var(--casino-sc)" }}>
                    + {fmtSC(p.sc)} SC
                  </span>
                  {p.tag && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: p.popular ? "var(--casino-gold-soft)" : "var(--casino-purple-soft)",
                        color: p.popular ? "var(--casino-gold)" : "var(--casino-purple-light)",
                      }}>
                      {p.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>
                  Gold Coins + Sweep Coins
                </p>
              </div>
            </div>
            <span className="text-base font-black">${p.usd}</span>
          </div>
        </button>
      ))}

      <button
        onClick={onNext}
        className="w-full h-11 rounded-full font-bold text-sm text-white mt-2 transition-all hover:brightness-110 hover:scale-[1.02]"
        style={{ background: "var(--casino-purple)" }}
      >
        {isLoggedIn ? `Continue with ${fmtCompact(selected.gc)} GC Pack →` : "Sign Up to Purchase →"}
      </button>
    </div>
  );
}

function CryptoStep({
  cryptos, selected, pkg, onSelect, onNext, onBack,
}: {
  cryptos: CryptoOption[]; selected: CryptoOption; pkg: Package;
  onSelect: (c: CryptoOption) => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {cryptos.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="rounded-2xl p-3 flex items-center gap-2.5 text-left transition-all hover:scale-[1.02]"
            style={{
              background: selected.id === c.id ? `${c.color}18` : "var(--casino-surface)",
              border: `1.5px solid ${selected.id === c.id ? c.color : "var(--casino-border)"}`,
            }}
          >
            <CoinIcon coin={c} size={32} />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{c.symbol}</p>
              <p className="text-[10px] truncate" style={{ color: "var(--casino-text-muted)" }}>{c.network}</p>
            </div>
            {selected.id === c.id && (
              <span className="ml-auto text-xs shrink-0" style={{ color: c.color }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl p-3 flex items-center justify-between text-xs"
        style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border)" }}>
        <span style={{ color: "var(--casino-text-muted)" }}>You pay</span>
        <span className="font-bold">
          {cryptoAmount(pkg.usd, selected.id)}{" "}
          <span style={{ color: selected.color }}>{selected.symbol}</span>
          <span className="font-normal ml-1.5" style={{ color: "var(--casino-text-muted)" }}>
            ≈ ${pkg.usd}
          </span>
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="h-10 px-4 rounded-full text-sm font-medium transition-colors hover:bg-white/8"
          style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text-muted)" }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-10 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: selected.color }}
        >
          Pay with {selected.symbol} →
        </button>
      </div>
    </div>
  );
}

function AddressStep({
  coin, pkg, address, copied, onCopy, countdownLabel, countdownSeconds, onConfirm, onBack,
}: {
  coin: CryptoOption; pkg: Package; address: string;
  copied: boolean; onCopy: () => void;
  countdownLabel: string; countdownSeconds: number;
  onConfirm: () => void; onBack: () => void;
}) {
  const urgent = countdownSeconds < 300;
  return (
    <div className="space-y-4">
      {/* Amount due */}
      <div className="rounded-2xl p-4 text-center"
        style={{ background: `${coin.color}14`, border: `1px solid ${coin.color}44` }}>
        <p className="text-xs mb-1" style={{ color: "var(--casino-text-muted)" }}>Send exactly</p>
        <p className="text-2xl font-black" style={{ color: coin.color }}>
          {cryptoAmount(pkg.usd, coin.id)} {coin.symbol}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--casino-text-muted)" }}>≈ ${pkg.usd} USD · {coin.network}</p>
      </div>

      {/* QR placeholder */}
      <div className="flex justify-center">
        <div className="w-36 h-36 rounded-2xl flex flex-col items-center justify-center gap-2"
          style={{ background: "white", border: `3px solid ${coin.color}` }}>
          <QRGrid color={coin.color} />
        </div>
      </div>

      {/* Address */}
      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "var(--casino-text-muted)" }}>
          {coin.symbol} Deposit Address ({coin.network})
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-10 px-3 rounded-xl text-xs font-mono overflow-hidden"
            style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)", lineHeight: "40px", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
          >
            {address}
          </div>
          <button
            onClick={onCopy}
            className="shrink-0 h-10 px-4 rounded-xl text-xs font-bold transition-all hover:scale-105"
            style={{
              background: copied ? "rgba(16,185,129,.2)" : "var(--casino-surface-3)",
              border: `1px solid ${copied ? "var(--casino-success)" : "var(--casino-border)"}`,
              color: copied ? "var(--casino-success)" : "var(--casino-text)",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Warnings */}
      <div className="space-y-2">
        <WarningRow>
          Send only <strong>{coin.symbol}</strong> on the <strong>{coin.network}</strong> network.
          Sending a different token will result in permanent loss.
        </WarningRow>
        <WarningRow>
          Send the <strong>exact amount</strong> shown. Partial payments are held for 24h.
        </WarningRow>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between text-xs px-1">
        <span style={{ color: "var(--casino-text-muted)" }}>Address expires in</span>
        <span className="font-mono font-bold" style={{ color: urgent ? "var(--casino-error)" : "var(--casino-gold)" }}>
          {countdownLabel}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="h-10 px-4 rounded-full text-sm font-medium transition-colors hover:bg-white/8"
          style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text-muted)" }}
        >
          ← Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 h-10 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: "var(--casino-success)" }}
        >
          I've Sent the Payment ✓
        </button>
      </div>
    </div>
  );
}

function SuccessStep({ pkg, coin, onDone }: { pkg: Package; coin: CryptoOption; onDone: () => void }) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl animate-pulse-glow"
        style={{ background: "rgba(16,185,129,.15)", border: "2px solid var(--casino-success)" }}>
        ✅
      </div>
      <div>
        <h3 className="text-lg font-black">Payment Received!</h3>
        <p className="text-sm mt-1" style={{ color: "var(--casino-text-muted)" }}>
          Your coins are being credited to your account.
        </p>
      </div>
      <div className="rounded-2xl p-4 space-y-2"
        style={{ background: "var(--casino-surface)", border: "1px solid var(--casino-border)" }}>
        <Row label="Gold Coins" value={`+${fmtCompact(pkg.gc)} GC`} valueColor="var(--casino-gold)" />
        <Row label="Sweep Coins" value={`+${fmtSC(pkg.sc)} SC`} valueColor="var(--casino-sc)" />
        <Row label="Paid with" value={`${cryptoAmount(pkg.usd, coin.id)} ${coin.symbol}`} valueColor={coin.color} />
        <Row label="Status" value="Confirming on chain…" valueColor="var(--casino-text-muted)" />
      </div>
      <p className="text-xs" style={{ color: "var(--casino-text-muted)" }}>
        Confirmations typically take 1–5 minutes depending on network congestion.
      </p>
      <button
        onClick={onDone}
        className="w-full h-10 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
        style={{ background: "var(--casino-purple)" }}
      >
        Back to Casino
      </button>
    </div>
  );
}

// ── atoms ──────────────────────────────────────────────────────────────────

export function CoinIcon({ coin, size = 28 }: { coin: CryptoOption; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-black shrink-0"
      style={{
        width: size,
        height: size,
        background: coin.color,
        color: coin.textColor,
        fontSize: size * 0.3,
      }}
    >
      {coin.symbol.slice(0, 3)}
    </div>
  );
}

function QRGrid({ color }: { color: string }) {
  // Static pattern that resembles a QR code
  const pattern = [
    1,1,1,0,1,0,1,1,1,
    1,0,1,0,0,1,1,0,1,
    1,1,1,0,1,0,1,1,1,
    0,1,0,1,0,1,0,1,0,
    1,0,1,0,1,0,1,0,1,
    0,1,0,1,0,0,0,1,0,
    1,1,1,0,0,1,1,1,1,
    1,0,1,1,0,1,0,0,1,
    1,1,1,0,1,0,1,1,1,
  ];
  return (
    <div className="grid grid-cols-9 gap-px" style={{ width: 90, height: 90 }}>
      {pattern.map((cell, i) => (
        <div key={i} style={{ background: cell ? color : "transparent", borderRadius: 1 }} />
      ))}
    </div>
  );
}

function WarningRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl text-xs leading-5"
      style={{ background: "var(--casino-gold-soft)", border: "1px solid var(--casino-gold-bright)", color: "var(--casino-text-muted)" }}>
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>{children}</span>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "var(--casino-text-muted)" }}>{label}</span>
      <span className="font-bold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
