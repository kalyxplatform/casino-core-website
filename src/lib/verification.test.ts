import { describe, expect, it } from 'vitest';
import type { ApiResponse, VerificationStanding } from '@/lib/webapi';
import {
  NO_REQUIREMENTS,
  declarationFrom,
  describeTrigger,
  minimumAgeFor,
  noticeHasContent,
  noticeView,
  requirementsFrom,
  standingFrom,
} from '@/lib/verification';
import * as fixtures from '@/test-fixtures/verification';

// Backend feature 007, PR W — how the site reads the contracts' answers.

const as = <T,>(body: unknown) => body as ApiResponse<T>;

describe('tolerance: a backend without the 007 routes means "nothing required"', () => {
  it.each([
    ['404 (route not deployed)', fixtures.routeNotFound],
    ['403', fixtures.unauthorized],
  ])('GET /verification answering %s ⇒ clear', (_name, body) => {
    expect(standingFrom(as(body))).toEqual({ status: 'clear' });
  });

  it.each([
    ['404 (route not deployed)', fixtures.routeNotFound],
    ['403 (brand key refused)', fixtures.unauthorized],
    ['500 policy unavailable', fixtures.policyUnavailable],
  ])('GET /verification/registration-requirements answering %s ⇒ the plain form', (_n, body) => {
    expect(requirementsFrom(as(body))).toEqual(NO_REQUIREMENTS);
  });

  it('a real failure is "unavailable", not "clear" — and never a closed action', () => {
    expect(standingFrom(as(fixtures.policyUnavailable))).toEqual({ status: 'unavailable' });
    expect(standingFrom(as({ code: 200, data: 'not a standing' }))).toEqual({
      status: 'unavailable',
    });
  });
});

describe('the standing → a notice', () => {
  const view = (body: unknown) => {
    const result = standingFrom(as<VerificationStanding>(body));
    if (result.status !== 'standing') throw new Error(`expected a standing, got ${result.status}`);
    return noticeView(result.standing);
  };

  it('standing-clear: nothing to say', () => {
    expect(noticeHasContent(view(fixtures.standingClear))).toBe(false);
  });

  it('standing-suggested: one suggestion, nothing required, every action open', () => {
    const notice = view(fixtures.standingSuggested);
    expect(notice.required).toEqual([]);
    expect(notice.suggested).toEqual([
      { rule: 'verify-after-first-bet', moment: 'After 1 bet', level: 'Verified identity', requiredFrom: null },
    ]);
    expect(notice.closed).toEqual({ game: false, purchase: false, withdrawal: false });
    expect(notice.canDeclare).toBe(true);
  });

  it('dismissal-success: a dismissed suggestion is not shown', () => {
    expect(view(fixtures.dismissalSuccess).suggested).toEqual([]);
  });

  it('standing-required-game: the game is closed, the purchase is open', () => {
    const notice = view(fixtures.standingRequiredGame);
    expect(notice.required.map((rule) => rule.moment)).toEqual(['Before your first bet']);
    expect(notice.closed).toEqual({ game: true, purchase: false, withdrawal: false });
  });

  it('standing-demanded: the operator reason, and the declared identity never copied', () => {
    const notice = view(fixtures.standingDemanded);
    expect(notice.demandReason).toBe('Please verify your identity to continue');
    expect(notice.nextStep).toMatch(/being reviewed/);
    const serialised = JSON.stringify(notice);
    expect(serialised).not.toContain('Beridze');
    expect(serialised).not.toContain('1990-04-12');
    expect(serialised).not.toContain('Rustaveli');
  });

  it.each([
    [{ kind: 'registration' }, 'At sign-up'],
    [{ kind: 'bets', count: 0 }, 'Before your first bet'],
    [{ kind: 'bets', count: 100 }, 'After 100 bets'],
    [{ kind: 'purchases', count: 0 }, 'Before your first purchase'],
    [{ kind: 'purchases', amount: '2000', currency: 'EUR' }, 'Once your purchases reach 2000 EUR'],
    [{ kind: 'withdrawal' }, 'Before any withdrawal'],
    [{ kind: 'days', count: 30 }, '30 days after sign-up'],
    [{ kind: 'operator' }, 'Requested by the casino'],
  ])('describes %j as "%s"', (trigger, words) => {
    expect(describeTrigger(trigger)).toBe(words);
  });
});

describe('registration requirements', () => {
  it('registration-requirements-required: fields shown, and the US minimum applies to a US player', () => {
    const requirements = requirementsFrom(as(fixtures.registrationRequirementsRequired));
    expect(requirements.declarationRequired).toBe(true);
    expect(minimumAgeFor(requirements, 'US')).toBe(21);
    expect(minimumAgeFor(requirements, 'GE')).toBe(18);
    expect(minimumAgeFor(requirements, undefined)).toBe(18);
  });

  it('registration-requirements-none: no fields', () => {
    expect(requirementsFrom(as(fixtures.registrationRequirementsNone)).declarationRequired).toBe(false);
  });
});

describe('the declaration form → the wire', () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };

  const complete = {
    firstName: ' Nino ',
    lastName: 'Beridze',
    dateOfBirth: '1990-04-12',
    addressLine1: '12 Rustaveli Avenue',
    addressLine2: '',
    city: 'Tbilisi',
    postalCode: '0108',
    addressCountryId: '1',
    nationalityCountryId: '1',
  };

  it('is EXACTLY declaration-request.json — trimmed, with an empty line 2 sent as null', () => {
    expect(declarationFrom(form(complete))).toEqual({ declaration: fixtures.declarationRequest });
  });

  it('refuses a missing field before spending a round trip', () => {
    expect(declarationFrom(form({ ...complete, city: '  ' }))).toEqual({ error: 'Enter your city.' });
    expect(declarationFrom(form({ ...complete, nationalityCountryId: '' }))).toEqual({
      error: 'Choose your nationality.',
    });
  });
});
