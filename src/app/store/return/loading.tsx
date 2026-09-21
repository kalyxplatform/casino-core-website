import { AppShell } from '@/components/AppShell';
import { SkeletonBar, SkeletonRegion } from '@/components/Skeleton';

/**
 * The prefetched shell of `/store/return`.
 *
 * This one is not reached by a click on a link — a payment provider navigates the
 * browser here — so it is never prefetched. It earns its place anyway: the page
 * behind it reads the order, and a player arriving from a payment should see that
 * something is being checked rather than a blank frame.
 */
export default function LoadingStoreReturn() {
  return (
    <AppShell current="store">
      <h1 className="text-xl font-semibold tracking-tight">Purchase</h1>

      <SkeletonRegion label="Checking your payment">
        <div className="mt-4 space-y-4 rounded-xl border border-edge bg-surface p-5">
          <SkeletonBar className="h-9 w-full rounded-lg" />
          <div className="divide-y divide-edge">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex justify-between gap-4 py-2">
                <SkeletonBar className="h-4 w-20" />
                <SkeletonBar className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
