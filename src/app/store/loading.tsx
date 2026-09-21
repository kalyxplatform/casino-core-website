import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/** The prefetched shell of `/store`. See `app/account/loading.tsx`. */
export default function LoadingStore() {
  return (
    <AppShell current="store">
      <h1 className="text-xl font-semibold tracking-tight">Balance</h1>

      <SkeletonRegion label="Loading the store">
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>

        <h2 className="mt-8 text-xl font-semibold tracking-tight">Get coins</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Payment runs against the sandbox provider. No real money is taken.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
