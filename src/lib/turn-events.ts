import type { SupportTurnOutcome } from './webapi';

/**
 * Backend feature 009 — reading the Server-Sent Events of one turn (contracts
 * README § A.4).
 *
 * Frames are `event: <name>\ndata: <json>\n\n`; a comment line (`: ping`) may
 * appear anywhere and carries nothing. The grammar is
 *
 *     ( status | delta | ticket )*  ( done | error )
 *
 * and a body that ends with neither `done` nor `error` was CUT OFF: the turn may
 * still be running or may be stored, so the page re-reads the conversation.
 *
 * The chat reads the body with a reader — the turn is the answer to a `POST`, so
 * `EventSource` cannot open it — and feeds the bytes here. Pure, no DOM, no
 * network: client components and tests import it alike.
 *
 * What comes out is DATA: each event is rebuilt from the keys the contract names,
 * with their types checked, and nothing here turns text into markup. An event
 * this page does not know, or one whose data is not its shape, is skipped rather
 * than thrown on — a newer `webapi` may say more than this page understands.
 */

export type TurnEvent =
  | { event: 'status'; data: { tool: string; label: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'ticket'; data: { reference: string } }
  | { event: 'done'; data: { turn_no: number; outcome: SupportTurnOutcome | string } }
  | { event: 'error'; data: { reason: string } };

export interface TurnParser {
  /** Feed the next bytes; returns the events they completed, in order. */
  push(bytes: Uint8Array): TurnEvent[];
  /** The body ended. `cutOff` is true when no `done` or `error` was read. */
  finish(): { cutOff: boolean };
}

const text = (value: unknown): value is string => typeof value === 'string';

function eventOf(name: string, json: string): TurnEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const fields = data as Record<string, unknown>;
  switch (name) {
    case 'status':
      return text(fields.tool) && text(fields.label)
        ? { event: 'status', data: { tool: fields.tool, label: fields.label } }
        : null;
    case 'delta':
      return text(fields.text) ? { event: 'delta', data: { text: fields.text } } : null;
    case 'ticket':
      return text(fields.reference) ? { event: 'ticket', data: { reference: fields.reference } } : null;
    case 'done':
      return typeof fields.turn_no === 'number' && text(fields.outcome)
        ? { event: 'done', data: { turn_no: fields.turn_no, outcome: fields.outcome } }
        : null;
    case 'error':
      return text(fields.reason) ? { event: 'error', data: { reason: fields.reason } } : null;
    default:
      return null;
  }
}

export function createTurnParser(): TurnParser {
  // `stream: true` keeps a character split across two chunks whole.
  const decoder = new TextDecoder();
  let buffer = '';
  let name = '';
  let data: string[] = [];
  let ended = false;

  const line = (raw: string, out: TurnEvent[]) => {
    if (raw === '') {
      // A blank line closes the frame.
      if (!ended && name !== '' && data.length > 0) {
        const event = eventOf(name, data.join('\n'));
        if (event) {
          out.push(event);
          if (event.event === 'done' || event.event === 'error') ended = true;
        }
      }
      name = '';
      data = [];
      return;
    }
    if (raw.startsWith(':')) return; // a comment
    const colon = raw.indexOf(':');
    const field = colon === -1 ? raw : raw.slice(0, colon);
    let value = colon === -1 ? '' : raw.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') name = value;
    else if (field === 'data') data.push(value);
  };

  const drain = (out: TurnEvent[]) => {
    for (;;) {
      const end = buffer.indexOf('\n');
      if (end === -1) return;
      const raw = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      line(raw.endsWith('\r') ? raw.slice(0, -1) : raw, out);
    }
  };

  return {
    push(bytes) {
      const out: TurnEvent[] = [];
      buffer += decoder.decode(bytes, { stream: true });
      drain(out);
      return out;
    },
    finish() {
      // A frame that never got its blank line was not sent whole: it is not an event.
      return { cutOff: !ended };
    },
  };
}
