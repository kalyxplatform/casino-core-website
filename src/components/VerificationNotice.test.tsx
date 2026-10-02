import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerificationNotice } from '@/components/VerificationNotice';
import { noticeView } from '@/lib/verification';
import type { VerificationStanding } from '@/lib/webapi';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 007, PR W — the standing banner and the blocking panel, and
// SEC-M10: operator-written text is rendered as text, never as markup.

vi.mock('@/actions/verification', () => ({ dismissAction: async () => ({ error: null, dismissed: true }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const view = (data: unknown) => noticeView(data as VerificationStanding);

describe('VerificationNotice', () => {
  it('a suggestion is a dismissable banner, not a block', () => {
    render(<VerificationNotice view={view(fixtures.standingSuggested.data)} action="game" />);
    expect(screen.getByRole('region', { name: 'Verification suggested' }).textContent).toContain(
      'After 1 bet',
    );
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy();
    expect(screen.queryByText(/paused/)).toBeNull();
  });

  it('a required rule closing this page\'s action is a blocking panel with the next step', () => {
    render(<VerificationNotice view={view(fixtures.standingRequiredGame.data)} action="game" />);
    expect(screen.getByRole('heading').textContent).toBe(
      'Playing games is paused until your identity is verified',
    );
    expect(screen.getByText(/^Declare your identity:/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Verify your identity' }).getAttribute('href')).toBe(
      '/verification',
    );
    expect(screen.queryByRole('button', { name: 'Not now' })).toBeNull();
  });

  it('SEC-M10: demand_reason, rejection_reason and rule names render as TEXT, never markup', () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script><b>bold</b>';
    const standing = {
      ...fixtures.standingDemanded.data,
      demand_reason: hostile,
      rejection_reason: hostile,
      asking: [
        { ...fixtures.standingDemanded.data.asking[0], rule: hostile },
        { ...fixtures.standingSuggested.data.asking[0], rule: `${hostile}-suggested` },
      ],
    };
    const { container } = render(<VerificationNotice view={view(standing)} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    // The literal characters are on screen, exactly as the operator typed them.
    expect(container.textContent).toContain(hostile);
    // And the rule name a dismissal posts is the literal string, not parsed markup.
    const rule = container.querySelector<HTMLInputElement>('input[name="rule"]');
    expect(rule?.value).toBe(`${hostile}-suggested`);
  });
});

describe('SEC-M10: no markup injection anywhere in the site', () => {
  // jsdom gives `import.meta.url` a non-file scheme; vitest runs from the repo root.
  const root = join(process.cwd(), 'src');
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });

  it('nothing in src/ uses dangerouslySetInnerHTML', () => {
    // As a JSX prop or an object key — the comments that name the rule do not count.
    const offenders = sources(root).filter((file) =>
      /dangerouslySetInnerHTML\s*[=:]/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
