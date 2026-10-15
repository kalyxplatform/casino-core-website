import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/**
 * The shell of `/verification/return` (backend feature 015). Never prefetched —
 * the hand-off navigates the browser here — but a player arriving back from the
 * verification provider sees that their standing is being read. Reads no session.
 */
export default function LoadingVerificationReturn() {
  return (
    <AppShell current="verification">
      <h1 className="text-xl font-semibold tracking-tight">Verification</h1>
      <SkeletonRegion label="Loading your verification">
        <div className="mt-5">
          <SkeletonCard lines={2} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
