'use server';

import * as webapi from '@/lib/webapi';
import { ResponderCodes, type AccountBalance } from '@/lib/webapi';
import { readSession } from '@/lib/session';

/**
 * The balance, re-read on every live-channel open (backend feature 006, FR-004).
 *
 * Balance only — not `router.refresh()`, which would re-render the whole page and
 * re-run every call behind it on each reopen (PERF-M3). `null` when there is no
 * session or the read failed: the page keeps what it shows and the next event or
 * reopen corrects it.
 */
export async function refreshBalanceAction(): Promise<AccountBalance[] | null> {
  const session = await readSession();
  if (!session) return null;
  const balance = await webapi.getBalance(session.token);
  return balance.code === ResponderCodes.SUCCESS && balance.data ? balance.data : null;
}
