import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';

/** There is no marketing page here — the root is just a fork in the road. */
export default async function Home() {
  redirect((await readSession()) ? '/account' : '/login');
}
