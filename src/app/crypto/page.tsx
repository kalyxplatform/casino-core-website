"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useBrand } from "@/context/BrandContext";
import { fmtCompact, fmtSC } from "@/lib/format/currency";
import { CRYPTOS, CoinIcon, RATES } from "@/components/crypto/GetCoinsModal";

// Rates imported from modal; shown as GC per $1
const PACKAGES = [
  { gc: 50_000,    sc: 0.50,  usd: 4.99  },
  { gc: 200_000,   sc: 2.00,  usd: 19.99 },
  { gc: 500_000,   sc: 5.50,  usd: 49.99 },
  { gc: 1_000_000, sc: 12.00, usd: 99.99 },
  { gc: 2_500_000, sc: 30.00, usd: 249.99},
];

function cryptoPrice(usd: number, coinId: string) {
  const rate = RATES[coinId] ?? 1;
  const amt = usd / rate;
  if (amt < 0.0001) return amt.toFixed(8);
  if (amt < 1)      return amt.toFixed(6);
  if (amt < 1000)   return amt.toFixed(4);
  return amt.toFixed(2);
}

const HOW_IT_WORKS = [
  { n: "01", icon: "🎁",  title: "Pick a Package",   desc: "Choose how many Gold Coins and Sweep Coins you want." },
  { n: "02", icon: "🪙",  title: "Select Crypto",    desc: "Pick from 10+ cryptocurrencies. We show the exact amount to send." },
  { n: "03", icon: "📤",  title: "Send Payment",     desc: "Send to our deposit address. Confirmations typically take 1–5 min." },
  { n: "04", icon: "✅",  title: "Coins Credited",   desc: "Your GC and SC are instantly added to your account after confirmation." },
];

export default function CryptoPage() {
  const { openCoins, openAuth, user } = useAuth();
  const { brand } = useBrand();

  if (!brand.features.showCrypto) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <span className="text-5xl block mb-4">🚫</span>
        <h1 className="text-2xl font-black mb-2">Not available on {brand.name}</h1>
        <p className="text-sm mb-6" style={{ color: "var(--casino-text-muted)" }}>
          Crypto deposits aren&apos;t supported on this brand. Play with Gold Coins
          and redeem Sweep Coins for prizes instead.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 px-6 rounded-full text-sm font-semibold text-white items-center"
          style={{ background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))" }}
        >
          Back to Lobby
        </Link>
      </div>
    );
  }

  function handleBuy() {
    if (!user) { openAuth("register"); return; }
    openCoins();
  }

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-16 text-center"
        style={{ background: "var(--casino-surface)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[5%] w-96 h-96 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle,#F7931A,transparent 70%)" }} />
          <div className="absolute bottom-[-20%] left-[5%] w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#627EEA,transparent 70%)" }} />
        </div>

        <div className="relative max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            {CRYPTOS.slice(0, 6).map((c) => (
              <div key={c.id} className="hover:scale-110 transition-transform">
                <CoinIcon coin={c} size={36} />
              </div>
            ))}
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Buy Coins with{" "}
            <span style={{
              backgroundImage: "linear-gradient(135deg,#F7931A,#627EEA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Crypto
            </span>
          </h1>

          <p className="text-base md:text-lg mb-8 max-w-xl mx-auto" style={{ color: "var(--casino-text-muted)" }}>
            Instant deposits with Bitcoin, Ethereum, USDT, Solana and 7 more.
            No banks. No waiting. Coins credited in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleBuy}
              className="h-12 px-8 rounded-full text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#F7931A,#627EEA)" }}
            >
              Buy Coins with Crypto →
            </button>
            <a
              href="#rates"
              className="h-12 px-8 rounded-full text-sm font-medium flex items-center justify-center transition-all hover:bg-white/8"
              style={{ border: "1px solid var(--casino-border-bright)", color: "var(--casino-text)" }}
            >
              See Live Rates
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {["⚡ Instant Confirmation","🔒 Non-Custodial","🌐 10+ Chains","0️⃣ No Hidden Fees"].map((t) => (
              <span key={t} className="text-xs font-medium" style={{ color: "var(--casino-text-muted)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-xl font-black text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl p-5 relative"
              style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
            >
              <span className="absolute top-4 right-4 text-4xl font-black opacity-10" style={{ color: "var(--casino-text)" }}>
                {step.n}
              </span>
              <span className="text-3xl block mb-3">{step.icon}</span>
              <p className="font-bold text-sm mb-1">{step.title}</p>
              <p className="text-xs leading-5" style={{ color: "var(--casino-text-muted)" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported cryptos + live rates */}
      <section
        id="rates"
        className="py-12"
        style={{ background: "var(--casino-surface)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-xl font-black text-center mb-2">Supported Currencies</h2>
          <p className="text-sm text-center mb-8" style={{ color: "var(--casino-text-muted)" }}>
            Live rates · Prices update every 60 seconds
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {CRYPTOS.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.01]"
                style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
              >
                <CoinIcon coin={c} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{c.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: `${c.color}22`, color: c.color }}>
                      {c.symbol}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--casino-text-muted)" }}>{c.network}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: "var(--casino-text)" }}>
                    ${RATES[c.id]?.toLocaleString() ?? "—"}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--casino-text-muted)" }}>per coin</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages grid */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-xl font-black text-center mb-2">Coin Packages</h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--casino-text-muted)" }}>
          Example prices for BTC · ETH · USDT shown
        </p>

        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--casino-border)" }}>
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr style={{ background: "var(--casino-surface-2)", borderBottom: "1px solid var(--casino-border)" }}>
                <th className="text-left px-4 py-3 text-xs font-bold" style={{ color: "var(--casino-text-muted)" }}>Package</th>
                <th className="text-right px-4 py-3 text-xs font-bold" style={{ color: "var(--casino-text-muted)" }}>USD</th>
                <th className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#F7931A" }}>BTC</th>
                <th className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#627EEA" }}>ETH</th>
                <th className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#26A17B" }}>USDT</th>
              </tr>
            </thead>
            <tbody>
              {PACKAGES.map((p, i) => (
                <tr
                  key={i}
                  className="transition-colors hover:bg-white/3"
                  style={{ borderBottom: i < PACKAGES.length - 1 ? "1px solid var(--casino-border)" : "none" }}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: "var(--casino-gold)" }}>{fmtCompact(p.gc)} GC</span>
                    <span className="text-xs ml-2" style={{ color: "var(--casino-sc)" }}>+ {fmtSC(p.sc)} SC</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${p.usd}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "#F7931A" }}>
                    {cryptoPrice(p.usd, "btc")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "#627EEA" }}>
                    {cryptoPrice(p.usd, "eth")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" style={{ color: "#26A17B" }}>
                    {cryptoPrice(p.usd, "usdt")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleBuy}
            className="h-11 px-10 rounded-full text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#F7931A,#627EEA)" }}
          >
            Buy Coins with Crypto →
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-black text-center mb-6">Crypto FAQ</h2>
        <div className="space-y-3">
          {[
            ["Which cryptocurrencies do you accept?", "We accept BTC, ETH, USDT (ERC-20/TRC-20), USDC, BNB (BEP-20), SOL, LTC, DOGE, XRP, and TRX. More coins are added regularly."],
            ["How long do deposits take?", "Most deposits confirm within 1–5 minutes. Bitcoin can take up to 10–20 minutes during peak network congestion."],
            ["Are there any deposit fees?", "CasinoCore charges no deposit fees. You may pay a small network (gas) fee to your wallet provider."],
            ["What happens if I send the wrong coin?", "Always send only the coin shown on the deposit address. Sending an incompatible token to an address will result in permanent loss. We cannot recover these funds."],
            ["Is there a minimum deposit?", "The minimum deposit is the 'Starter' package ($4.99 equivalent). There is no maximum."],
            ["Are crypto transactions anonymous?", "Blockchain transactions are pseudonymous. KYC verification is required only for Sweep Coin redemptions, not for deposits or GC play."],
          ].map(([q, a]) => (
            <details
              key={q}
              className="rounded-2xl overflow-hidden group"
              style={{ background: "var(--casino-surface-2)", border: "1px solid var(--casino-border)" }}
            >
              <summary className="px-5 py-4 text-sm font-semibold cursor-pointer list-none flex items-center justify-between"
                style={{ color: "var(--casino-text)" }}>
                {q}
                <span className="text-lg transition-transform group-open:rotate-45" style={{ color: "var(--casino-text-muted)" }}>+</span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-6" style={{ color: "var(--casino-text-muted)" }}>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
