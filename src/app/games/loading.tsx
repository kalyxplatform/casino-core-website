import { AppShell } from '@/components/AppShell';
import { SkeletonBar, SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/** The prefetched shell of `/games`. See `app/account/loading.tsx`. */
export default function LoadingGames() {
  return (
    <AppShell current="games">
      <h1 className="text-xl font-semibold tracking-tight">Games</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Rounds are settled against the balance you pick — the same balance the account
        page shows.
      </p>

      <SkeletonRegion label="Loading the games lobby">
        <div className="mt-5 rounded-xl border border-edge bg-surface p-4">
          <SkeletonBar className="h-3 w-16" />
          <div className="mt-3 flex gap-2">
            <SkeletonBar className="h-9 w-28 rounded-lg" />
            <SkeletonBar className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
