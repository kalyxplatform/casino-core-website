import type {
  ApiResponse,
  Declaration,
  RegistrationRequirements,
  VerificationAsking,
  VerificationStanding,
  VerificationTrigger,
} from './webapi';

/**
 * Backend feature 007 — reading a verification answer into what a page shows.
 *
 * Pure functions and constants only, so components, Server Actions and tests can
 * all import it. It is NOT `server-only` and it must not become a `'use server'`
 * module: those may export only async functions (see `checkout-state.ts`).
 *
 * The one rule this module exists to keep: the standing carries `declared`, the
 * player's own legal name, date of birth and address. `noticeView` is how a page
 * hands the standing to a client component — it copies what a notice renders and
 * drops `declared`, so that block never reaches the RSC payload of a page that
 * did not ask for it.
 */

/* ------------------------------------------------------------- tolerance */

/**
 * How a page reads `GET /verification`.
 *
 * `clear` is "nothing is required of you", and it is ALSO what a `404` or a `403`
 * means here. The website may deploy before `webapi` serves the route (backend
 * `rollout.md`, step 4): until then the route is an unknown one and the backend's
 * exception filter answers `code 404`. A `403` is tolerated the same way: every
 * other call on the page already treats it as signed out, so the notice need not.
 * The gates on launch and checkout are the authority either way — a standing the
 * site cannot read never closes anything.
 *
 * `unavailable` is a real failure (`500 verification-policy-unavailable`, a
 * transport error, a shape this app cannot read). A notice shows nothing for it;
 * the verification page says so.
 */
export type StandingResult =
  | { status: 'clear' }
  | { status: 'unavailable' }
  | { status: 'standing'; standing: VerificationStanding };

const NOT_SERVED = new Set([403, 404]);

const isStanding = (data: unknown): data is VerificationStanding => {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<VerificationStanding>;
  return (
    typeof candidate.level === 'number' &&
    typeof candidate.state === 'string' &&
    typeof candidate.next_step === 'string' &&
    Array.isArray(candidate.asking) &&
    typeof candidate.actions === 'object' &&
    candidate.actions !== null
  );
};

export function standingFrom(response: ApiResponse<VerificationStanding>): StandingResult {
  if (NOT_SERVED.has(response.code)) return { status: 'clear' };
  if (response.code !== 200 || !isStanding(response.data)) return { status: 'unavailable' };
  return { status: 'standing', standing: response.data };
}

/** What the sign-up form needs. `minimum_age` is null when the backend did not say. */
export interface SignUpRequirements {
  declarationRequired: boolean;
  minimumAge: number | null;
  countryMinimumAge: Record<string, number>;
}

export const NO_REQUIREMENTS: SignUpRequirements = {
  declarationRequired: false,
  minimumAge: null,
  countryMinimumAge: {},
};

/**
 * `GET /verification/registration-requirements` → the sign-up form's shape.
 *
 * Anything but a readable `200` — the `404` of a backend that has not deployed the
 * route, a `403` brand-key refusal, an outage — is "nothing required": the plain
 * feature-001 form. That is safe because `POST /registration` is the authority: a
 * brand that does require a declaration answers `400 declaration is required for
 * this brand`, and `registerAction` reopens the form with the fields shown.
 */
export function requirementsFrom(
  response: ApiResponse<RegistrationRequirements>,
): SignUpRequirements {
  const data = response.data;
  if (response.code !== 200 || typeof data !== 'object' || data === null) return NO_REQUIREMENTS;
  const countryMinimumAge: Record<string, number> = {};
  if (typeof data.country_minimum_age === 'object' && data.country_minimum_age !== null) {
    for (const [iso, age] of Object.entries(data.country_minimum_age)) {
      if (Number.isInteger(age)) countryMinimumAge[iso.toUpperCase()] = age;
    }
  }
  return {
    declarationRequired: data.declaration_required === true,
    minimumAge: Number.isInteger(data.minimum_age) ? data.minimum_age : null,
    countryMinimumAge,
  };
}

/** The minimum age that applies to a player registering under `iso2`. */
export function minimumAgeFor(
  requirements: SignUpRequirements,
  iso2: string | undefined,
): number | null {
  if (iso2) {
    const country = requirements.countryMinimumAge[iso2.toUpperCase()];
    if (country !== undefined) return country;
  }
  return requirements.minimumAge;
}

/* ---------------------------------------------------------------- words */

export const LEVEL_LABELS: Record<number, string> = {
  0: 'Not verified',
  1: 'Declared identity',
  2: 'Verified identity',
  3: 'Enhanced due diligence',
};

export const levelLabel = (level: number): string => LEVEL_LABELS[level] ?? `Level ${level}`;

const STATE_LABELS: Record<string, string> = {
  none: 'Nothing submitted',
  declared: 'Identity declared',
  submitted: 'Documents submitted',
  verified: 'Verified',
  enhanced: 'Enhanced checks complete',
  rejected: 'Rejected',
  expired: 'Expired',
};

export const stateLabel = (state: string): string => STATE_LABELS[state] ?? state;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * One rule's moment, in words. `amount` is the RULE's threshold — an exact
 * decimal string copied from the policy — and is shown as given, never parsed.
 */
export function describeTrigger(trigger: VerificationTrigger): string {
  const { kind, count, amount, currency } = trigger;
  const threshold = amount !== undefined ? `${amount}${currency ? ` ${currency}` : ''}` : null;
  switch (kind) {
    case 'registration':
      return 'At sign-up';
    case 'bets':
      if (!count) return 'Before your first bet';
      return `After ${plural(count, 'bet', 'bets')}`;
    case 'purchases':
      if (threshold) return `Once your purchases reach ${threshold}`;
      if (!count) return 'Before your first purchase';
      return `After ${plural(count, 'purchase', 'purchases')}`;
    case 'withdrawal':
      return threshold ? `Before a withdrawal above ${threshold}` : 'Before any withdrawal';
    case 'days':
      return count ? `${plural(count, 'day', 'days')} after sign-up` : 'After sign-up';
    case 'operator':
      return 'Requested by the casino';
    default:
      return 'By this casino’s policy';
  }
}

export const NEXT_STEP_TEXT: Record<string, string | null> = {
  declare: 'Declare your identity: your legal name, date of birth, address and nationality.',
  submit:
    'Submit your identity documents. Document upload is not available on this site yet — contact support to complete it.',
  wait: 'Your details are being reviewed. There is nothing more to do for now.',
  none: null,
};

export const nextStepText = (step: string | null | undefined): string | null =>
  step ? (NEXT_STEP_TEXT[step] ?? null) : null;

/**
 * The verification refusals `POST /games/launch` and `POST /store/checkout` can
 * answer (contracts §5, §6 and the shared `500`). Slugs, so mapped to sentences.
 */
export const VERIFICATION_REFUSALS: Record<string, string> = {
  'verification-required': 'This casino needs to verify your identity first.',
  'verification-policy-unavailable':
    'Identity checks are temporarily unavailable, so this is paused. Try again shortly.',
};

/** What a refused Play or Buy shows under its error: the next step, and where to take it. */
export interface VerificationHint {
  nextStep: string | null;
}

/* ---------------------------------------------------------------- notice */

export interface NoticeRule {
  rule: string;
  moment: string;
  level: string;
  requiredFrom: string | null;
}

export type GatedAction = 'game' | 'purchase' | 'withdrawal';

/**
 * The standing, minus `declared`, in the words a notice renders.
 *
 * Every string in here that came from the backend — `rule`, `demandReason`,
 * `rejectionReason` — is OPERATOR-written and is rendered as text, never as
 * markup (SEC-M10).
 */
export interface NoticeView {
  level: string;
  state: string;
  nextStep: string | null;
  canDeclare: boolean;
  required: NoticeRule[];
  suggested: NoticeRule[];
  closed: Record<GatedAction, boolean>;
  demandReason: string | null;
  rejectionReason: string | null;
}

const toRule = (asking: VerificationAsking): NoticeRule => ({
  rule: asking.rule,
  moment: describeTrigger(asking.trigger ?? { kind: '' }),
  level: levelLabel(asking.level),
  // A date, not a time: the day is what a player can act on, and slicing the ISO
  // string renders the same on the server and in the browser.
  requiredFrom: typeof asking.required_from === 'string' ? asking.required_from.slice(0, 10) : null,
});

const isClosed = (verdict: { open: boolean } | undefined) => verdict?.open === false;

export function noticeView(standing: VerificationStanding): NoticeView {
  const asking = standing.asking ?? [];
  return {
    level: levelLabel(standing.level),
    state: stateLabel(standing.state),
    nextStep: nextStepText(standing.next_step),
    canDeclare: standing.next_step === 'declare',
    required: asking.filter((rule) => rule.mode === 'required').map(toRule),
    suggested: asking.filter((rule) => rule.mode === 'suggested' && !rule.dismissed).map(toRule),
    closed: {
      game: isClosed(standing.actions?.game),
      purchase: isClosed(standing.actions?.purchase),
      withdrawal: isClosed(standing.actions?.withdrawal),
    },
    demandReason: standing.demand_reason ?? null,
    rejectionReason: standing.rejection_reason ?? null,
  };
}

/** True when a notice has anything to say. */
export const noticeHasContent = (view: NoticeView): boolean =>
  view.required.length > 0 ||
  view.suggested.length > 0 ||
  view.demandReason !== null ||
  view.rejectionReason !== null ||
  Object.values(view.closed).some(Boolean);

/* ----------------------------------------------------------- declaration */

/**
 * The declaration form's field names. They are the FORM's, not the wire's — the
 * Server Action is the one place that maps them onto the `snake_case` body, as
 * `packageId` and `gameCode` are elsewhere.
 */
export const DECLARATION_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'addressLine1',
  'addressLine2',
  'city',
  'postalCode',
  'addressCountryId',
  'nationalityCountryId',
] as const;

export type DeclarationValues = Partial<Record<(typeof DECLARATION_FIELDS)[number], string>>;

/** The submitted values, so a refused form can be shown again as it was typed. */
export function declarationValues(formData: FormData): DeclarationValues {
  const values: DeclarationValues = {};
  for (const field of DECLARATION_FIELDS) {
    const raw = formData.get(field);
    if (typeof raw === 'string') values[field] = raw;
  }
  return values;
}

const positiveId = (raw: string | undefined): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
};

/**
 * Form → `declaration-request.json`. Trims text (the backend refuses leading or
 * trailing spaces rather than trimming them) and sends an empty second address
 * line as `null`. It checks only presence; every rule is the backend's, and its
 * `400` message is the rule's text, never the value, so it is shown as given.
 */
export function declarationFrom(
  formData: FormData,
): { declaration: Declaration } | { error: string } {
  const values = declarationValues(formData);
  const text = (field: keyof DeclarationValues) => (values[field] ?? '').trim();

  const missing: [keyof DeclarationValues, string][] = [
    ['firstName', 'your first name'],
    ['lastName', 'your last name'],
    ['dateOfBirth', 'your date of birth'],
    ['addressLine1', 'the first line of your address'],
    ['city', 'your city'],
    ['postalCode', 'your postal code'],
  ];
  for (const [field, words] of missing) {
    if (!text(field)) return { error: `Enter ${words}.` };
  }

  const addressCountryId = positiveId(values.addressCountryId);
  if (addressCountryId === null) return { error: 'Choose the country of your address.' };
  const nationalityCountryId = positiveId(values.nationalityCountryId);
  if (nationalityCountryId === null) return { error: 'Choose your nationality.' };

  return {
    declaration: {
      first_name: text('firstName'),
      last_name: text('lastName'),
      date_of_birth: text('dateOfBirth'),
      address: {
        line1: text('addressLine1'),
        line2: text('addressLine2') || null,
        city: text('city'),
        postal_code: text('postalCode'),
        country_id: addressCountryId,
      },
      nationality_country_id: nationalityCountryId,
    },
  };
}

/** What the declaration form and the dismiss button get back. */
export interface DeclarationState {
  error: string | null;
  values: DeclarationValues;
}

export const emptyDeclaration: DeclarationState = { error: null, values: {} };

export interface DismissState {
  error: string | null;
  dismissed: boolean;
}

export const emptyDismiss: DismissState = { error: null, dismissed: false };

/** The sentences the two player-facing writes answer with. Slugs in, words out. */
export const DECLARATION_ERRORS: Record<string, string> = {
  'already-declared':
    'Your identity has already been declared. To correct it, contact support.',
  'under-age':
    'You are under the minimum age for this casino, so your account has been closed. Contact support if this is wrong.',
  'verification-policy-unavailable': VERIFICATION_REFUSALS['verification-policy-unavailable'],
};

export const REGISTRATION_DECLARATION_MISSING = 'declaration is required for this brand';
