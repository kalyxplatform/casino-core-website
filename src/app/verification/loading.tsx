import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/** The prefetched shell of `/verification`. Reads no session — see `AppShell`. */
export default function LoadingVerification() {
  return (
    <AppShell current="verification">
      <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
      <p className="mt-1 text-sm text-ink-muted">
        What this casino asks you to verify, and what you can do about it.
      </p>
      <SkeletonRegion label="Loading your verification">
        <div className="mt-5">
          <SkeletonCard lines={2} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
