export function Alert({ tone, children }: { tone: 'error' | 'info'; children: React.ReactNode }) {
  const skin =
    tone === 'error'
      ? 'border-danger/40 bg-danger/10 text-danger'
      : 'border-accent/40 bg-accent/10 text-accent';
  return (
    <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${skin}`}>
      {children}
    </p>
  );
}
