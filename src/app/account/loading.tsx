import { AppShell } from '@/components/AppShell';
import { SkeletonBar, SkeletonCard, SkeletonRegion } from '@/components/Skeleton';

/**
 * The prefetched shell of `/account`.
 *
 * Nothing here reads the session, on purpose — see `AppShell`. This is what the
 * browser already holds when the player clicks "Profile", so the click paints at
 * once instead of holding the previous page for the ~250 ms the round trip to
 * `iad1` and back actually takes.
 */
export default function LoadingAccount() {
  return (
    <AppShell current="account">
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>

      <SkeletonRegion label="Loading your profile">
        <dl className="mt-4 divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-surface">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 px-4 py-3">
              <SkeletonBar className="h-4 w-20" />
              <SkeletonBar className="h-4 w-32" />
            </div>
          ))}
        </dl>

        <div className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Balance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
        </div>
      </SkeletonRegion>
    </AppShell>
  );
}
