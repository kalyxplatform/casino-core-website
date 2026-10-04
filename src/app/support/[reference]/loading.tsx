import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/** The prefetched shell of `/support/[reference]`. Reads no session — see `AppShell`. */
export default function LoadingTicket() {
  return (
    <AppShell current="support">
      <Link href="/support" className="text-sm text-ink-muted hover:text-ink">
        ← All tickets
      </Link>
      <SkeletonRegion label="Loading the ticket">
        <div className="mt-4 space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
