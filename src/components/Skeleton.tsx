/**
 * The placeholders a `loading.tsx` and a `<Suspense>` fallback are built from.
 *
 * These exist because of a measured fact about this deployment rather than for
 * decoration. The Vercel function runs in `iad1` and the CDN edge serving a
 * European player is `fra1`, so a dynamic page costs ~110 ms of Atlantic before
 * any rendering starts, and webapi is Cloud Run in `us-central1` behind that. The
 * distance is not ours to remove. What was ours is that a route using `cookies()`
 * is dynamic, and per Next's own table a dynamic route with no `loading.js` is not
 * prefetched AT ALL and has its client cache off — so every click sat on the old
 * page for the whole round trip with nothing acknowledging it.
 *
 * A skeleton is what makes the boundary exist. It has to be renderable with no
 * request data at all, or it would be dynamic too and there would be nothing to
 * prefetch — which is why nothing here takes a prop that comes from the session.
 *
 * They are `aria-hidden` and the region that holds them is marked busy: a screen
 * reader should hear "loading", not a shape.
 */

/** One grey bar. `className` carries its size, because only the caller knows it. */
export function SkeletonBar({ className = 'h-4 w-24' }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-surface-raised ${className}`} />;
}

/** A labelled row, as `dl` rows and balance cards are both built from. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <SkeletonBar className="h-3 w-16" />
      {Array.from({ length: lines }, (_, line) => (
        <div key={line} className="mt-2">
          <SkeletonBar className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

/**
 * The wrapper every skeleton goes in.
 *
 * `aria-busy` with a `status` role is the whole accessibility story here: the
 * shapes are hidden, and the one thing announced is that something is loading.
 */
export function SkeletonRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
