import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/** The prefetched shell of `/support`. Reads no session — see `AppShell`. */
export default function LoadingSupport() {
  return (
    <AppShell current="support">
      <h1 className="text-xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Ask about your account, a game or a purchase. We reply here.
      </p>
      <SkeletonRegion label="Loading support">
        <div className="mt-5 space-y-3">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={1} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
