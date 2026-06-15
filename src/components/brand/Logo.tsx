/**
 * Brand logo: a rounded square with the brand's gradient and 2-letter mark.
 * Centralised so Header, Footer, AuthModal, NotFound all share one source.
 */
export function Logo({ size = 32, letters }: { size?: number; letters?: string }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,var(--casino-purple),var(--casino-gold))",
      }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.3 }}>
        {letters ?? "CC"}
      </span>
    </div>
  );
}
