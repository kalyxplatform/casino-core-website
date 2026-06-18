const PLAYER_COUNTS = [
  1243, 876, 432, 2891, 654, 1102, 789, 345, 2134, 987,
   543, 1876, 432, 765, 1234, 890, 2341, 567, 1098, 432,
  3210, 1456, 876, 2134, 543, 789, 1234, 5678, 3456, 2109,
  4321, 1876, 2987, 1543, 3210, 2876, 1234, 876, 2341, 1543,
  3210, 2345, 1678, 3456,
];

function fmtPlayers(id: number): string {
  const n = PLAYER_COUNTS[(id - 1) % PLAYER_COUNTS.length];
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function CardFooter({ id }: { id: number }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
      <span className="text-xs" style={{ color: "var(--casino-text-muted)" }}>{fmtPlayers(id)}</span>
    </div>
  );
}
