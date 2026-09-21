import { SkeletonBar, SkeletonRegion } from '@/components/Skeleton';

/**
 * The prefetched shell of `/register`.
 *
 * `/register` is the one unauthenticated page that calls the API — the country list
 * is required, because `country_id` is required and there is no GeoIP fallback — so
 * it is dynamic and needs a boundary like the signed-in pages do.
 */
export default function LoadingRegister() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-ink-muted">Takes a few seconds. No real money is involved.</p>

      <SkeletonRegion label="Loading the registration form">
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((field) => (
            <div key={field} className="space-y-1.5">
              <SkeletonBar className="h-4 w-20" />
              <SkeletonBar className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <SkeletonBar className="h-11 w-full rounded-lg" />
        </div>
      </SkeletonRegion>
    </main>
  );
}
