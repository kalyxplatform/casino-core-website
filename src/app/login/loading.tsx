import { SkeletonBar, SkeletonRegion } from '@/components/Skeleton';

/**
 * The prefetched shell of `/login`.
 *
 * `/login` makes no API call at all — it reads the cookie and renders a form — but
 * reading the cookie is enough to make the route dynamic, and a dynamic route with
 * no boundary is not prefetched. So even this page cost a full round trip to `iad1`
 * on every click before there was a shell to hand over immediately.
 */
export default function LoadingLogin() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Player area for <span className="text-ink">casino-core</span>.
      </p>

      <SkeletonRegion label="Loading the sign-in form">
        <div className="mt-8 space-y-4">
          {[0, 1].map((field) => (
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
