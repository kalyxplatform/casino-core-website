export function Logo({ size = 32, letters }: { size?: number; letters?: string }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--casino-purple)",
      }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.3 }}>
        {letters ?? "CC"}
      </span>
    </div>
  );
}
