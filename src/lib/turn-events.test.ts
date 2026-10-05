import { describe, expect, it } from 'vitest';
import answered from '@/test-fixtures/support/turn-stream-answered.json';
import ticketed from '@/test-fixtures/support/turn-stream-ticketed.json';
import failed from '@/test-fixtures/support/turn-stream-failed.json';
import { createTurnParser, type TurnEvent } from '@/lib/turn-events';

// Backend feature 009, T063 — the chat's event parser against the recorded streams
// (contracts README § A.4): `( status | delta | ticket )* ( done | error )`.

interface Frame {
  event: string;
  data: unknown;
}

const encoder = new TextEncoder();
const frame = ({ event, data }: Frame) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const wire = (events: Frame[]) => events.map(frame).join('');

/** Feed `text` in chunks of `size` BYTES, so a frame, a line and a character can all be split. */
function feed(text: string, size: number): { events: TurnEvent[]; cutOff: boolean } {
  const parser = createTurnParser();
  const bytes = encoder.encode(text);
  const events: TurnEvent[] = [];
  for (let at = 0; at < bytes.length; at += size) events.push(...parser.push(bytes.slice(at, at + size)));
  return { events, cutOff: parser.finish().cutOff };
}

const SIZES = [1, 2, 3, 5, 7, 13, 64, 100_000];

describe.each([
  ['turn-stream-answered.json', answered.events as Frame[]],
  ['turn-stream-ticketed.json', ticketed.events as Frame[]],
  ['turn-stream-failed.json', failed.events as Frame[]],
])('%s', (_name, recorded) => {
  it.each(SIZES)('split every %i bytes ⇒ the events in order, and not cut off', (size) => {
    const { events, cutOff } = feed(wire(recorded), size);
    expect(events).toStrictEqual(recorded);
    expect(cutOff).toBe(false);
  });

  it.each(SIZES)('split every %i bytes with comment lines between frames ⇒ the same events', (size) => {
    const text = `: ping\n\n${recorded.map((event) => `${frame(event)}: ping\n\n`).join('')}`;
    expect(feed(text, size).events).toStrictEqual(recorded);
  });

  it('without its last event ⇒ cut off', () => {
    const { events, cutOff } = feed(wire(recorded.slice(0, -1)), 7);
    expect(events).toStrictEqual(recorded.slice(0, -1));
    expect(cutOff).toBe(true);
  });
});

describe('createTurnParser', () => {
  const done: Frame = { event: 'done', data: { turn_no: 1, outcome: 'answered' } };

  it('an empty body is cut off', () => {
    expect(feed('', 1)).toStrictEqual({ events: [], cutOff: true });
  });

  it('a body of pings alone is cut off', () => {
    expect(feed(': ping\n\n: ping\n\n', 3)).toStrictEqual({ events: [], cutOff: true });
  });

  it('a last frame that never got its blank line is not an event', () => {
    const text = wire([{ event: 'delta', data: { text: 'a' } }]) + 'event: done\ndata: {"turn_no":1,"outcome":"answered"}\n';
    const { events, cutOff } = feed(text, 4);
    expect(events).toStrictEqual([{ event: 'delta', data: { text: 'a' } }]);
    expect(cutOff).toBe(true);
  });

  it('an unknown event name is tolerated: skipped, and the rest still read', () => {
    const text =
      frame({ event: 'delta', data: { text: 'a' } }) +
      frame({ event: 'thinking', data: { anything: [1, 2] } }) +
      'event: weird\ndata: not json\n\n' +
      frame(done);
    expect(feed(text, 5)).toStrictEqual({
      events: [{ event: 'delta', data: { text: 'a' } }, done],
      cutOff: false,
    });
  });

  it('a known event whose data is not its shape is skipped, never thrown on', () => {
    const text =
      'event: delta\ndata: {"text":7}\n\n' +
      'event: delta\ndata: {broken\n\n' +
      'event: ticket\ndata: {"reference":null}\n\n' +
      'event: status\ndata: {"tool":"x"}\n\n' +
      'event: done\ndata: {"turn_no":"1","outcome":"answered"}\n\n';
    expect(feed(text, 6)).toStrictEqual({ events: [], cutOff: true });
  });

  it('only the documented keys of an event are kept', () => {
    const text =
      'event: status\ndata: {"tool":"get_balances","label":"Checking","input":{"a":1}}\n\n' +
      'event: done\ndata: {"turn_no":2,"outcome":"answered","usage":{"x":1}}\n\n';
    expect(feed(text, 9).events).toStrictEqual([
      { event: 'status', data: { tool: 'get_balances', label: 'Checking' } },
      { event: 'done', data: { turn_no: 2, outcome: 'answered' } },
    ]);
  });

  it('text keeps its line breaks, its markup and its multi-byte characters across any split', () => {
    const text = 'Bet: 5 SC\n<b>win</b> → 0 SC 🎰 https://example.test';
    for (const size of SIZES) {
      const { events } = feed(wire([{ event: 'delta', data: { text } }, done]), size);
      expect(events[0]).toStrictEqual({ event: 'delta', data: { text } });
    }
  });

  it('CRLF line ends are read like LF', () => {
    const text = 'event: delta\r\ndata: {"text":"a"}\r\n\r\nevent: done\r\ndata: {"turn_no":1,"outcome":"answered"}\r\n\r\n';
    expect(feed(text, 3)).toStrictEqual({ events: [{ event: 'delta', data: { text: 'a' } }, done], cutOff: false });
  });

  it('nothing after done or error is an event', () => {
    const text = frame(done) + frame({ event: 'delta', data: { text: 'late' } }) + frame(done);
    expect(feed(text, 8)).toStrictEqual({ events: [done], cutOff: false });
  });

  it('a frame with no event name is not an event', () => {
    expect(feed('data: {"text":"a"}\n\n', 4)).toStrictEqual({ events: [], cutOff: true });
  });
});
