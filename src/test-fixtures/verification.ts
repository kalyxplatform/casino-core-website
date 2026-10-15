/**
 * Backend feature 007's contract fixtures, copied key for key from
 * `casino-core-backend/specs/007-flexible-kyc-policy/contracts/`. Those files are
 * the authority; these copies exist so the website's tests run without the
 * backend checked out beside it.
 */

const declared = {
  first_name: 'Nino',
  last_name: 'Beridze',
  date_of_birth: '1990-04-12',
  address: {
    line1: '12 Rustaveli Avenue',
    line2: null,
    city: 'Tbilisi',
    postal_code: '0108',
    country_id: 1,
  },
  nationality_country_id: 1,
};

const allOpen = {
  game: { open: true },
  purchase: { open: true },
  withdrawal: { open: true },
};

/** `declaration-request.json`. */
export const declarationRequest = declared;

/** `registration-declaration-request.json`. */
export const registrationDeclarationRequest = {
  email: 'nino@example.com',
  password: 'Str0ng!Passw0rd',
  country_id: 1,
  declaration: declared,
};

export const standingClear = {
  code: 200,
  message: 'ok',
  data: {
    level: 0,
    state: 'none',
    next_step: 'none',
    declared: null,
    asking: [],
    actions: allOpen,
    rejection_reason: null,
    demand_reason: null,
  },
};

export const standingSuggested = {
  code: 200,
  message: 'ok',
  data: {
    level: 0,
    state: 'none',
    next_step: 'declare',
    declared: null,
    asking: [
      {
        rule: 'verify-after-first-bet',
        trigger: { kind: 'bets', count: 1 },
        level: 2,
        mode: 'suggested',
        required_from: null,
        dismissed: false,
      },
    ],
    actions: allOpen,
    rejection_reason: null,
    demand_reason: null,
  },
};

export const standingRequiredGame = {
  code: 200,
  message: 'ok',
  data: {
    level: 0,
    state: 'none',
    next_step: 'declare',
    declared: null,
    asking: [
      {
        rule: 'verify-before-first-bet',
        trigger: { kind: 'bets', count: 0 },
        level: 2,
        mode: 'required',
        required_from: null,
        dismissed: false,
      },
    ],
    actions: {
      game: { open: false, reason: 'verification-required' },
      purchase: { open: true },
      withdrawal: { open: true },
    },
    rejection_reason: null,
    demand_reason: null,
  },
};

export const standingDemanded = {
  code: 200,
  message: 'ok',
  data: {
    level: 1,
    state: 'declared',
    next_step: 'wait',
    declared,
    asking: [
      {
        rule: 'operator-demand',
        trigger: { kind: 'operator' },
        level: 2,
        mode: 'required',
        required_from: null,
        dismissed: false,
      },
    ],
    actions: {
      game: { open: false, reason: 'verification-required' },
      purchase: { open: false, reason: 'verification-required' },
      withdrawal: { open: false, reason: 'verification-required' },
    },
    rejection_reason: null,
    demand_reason: 'Please verify your identity to continue',
  },
};

/** `dismissal-success.json`. */
export const dismissalSuccess = {
  ...standingSuggested,
  data: {
    ...standingSuggested.data,
    asking: [{ ...standingSuggested.data.asking[0], dismissed: true }],
  },
};

export const registrationRequirementsRequired = {
  code: 200,
  message: 'ok',
  data: { declaration_required: true, minimum_age: 18, country_minimum_age: { US: 21 } },
};

export const registrationRequirementsNone = {
  code: 200,
  message: 'ok',
  data: { declaration_required: false, minimum_age: 18, country_minimum_age: {} },
};

export const policyUnavailable = { code: 500, message: 'verification-policy-unavailable' };
export const registrationDeclarationMissing = {
  code: 400,
  message: 'declaration is required for this brand',
};
export const registrationUnderAge = { code: 415, message: 'under-age' };
export const verificationRequired = { code: 415, message: 'verification-required' };

/** What the backend's exception filter answers for a route it does not serve yet. */
export const routeNotFound = {
  code: 404,
  message: 'Route GET:/verification not found',
  error: 'Not Found',
};
export const unauthorized = { code: 403, message: 'Unauthorized' };

/* ------------------------------------------------------------------ 015 */

/**
 * Backend feature 015's contract fixtures (the verification provider: identity
 * documents), copied key for key from
 * `casino-core-backend/specs/015-veriff-identity-verification/contracts/`.
 */

const declared015 = {
  first_name: 'Jose',
  last_name: 'Alvarez',
  date_of_birth: '1990-04-01',
  address: {
    line1: '1 Test Street',
    line2: null,
    city: 'Testville',
    postal_code: '00000',
    country_id: 1,
  },
  nationality_country_id: 1,
};

const asking015 = [
  {
    rule: 'verify-before-first-bet',
    trigger: { kind: 'bets', count: 0 },
    level: 2,
    mode: 'required',
    required_from: null,
    dismissed: false,
  },
];

const gameClosed015 = {
  game: { open: false, reason: 'verification-required' },
  purchase: { open: true },
  withdrawal: { open: true },
};

const REFERENCE_015 = '9b1d3f7a2c4e6a8b0d2f4a6c8e0b2d4f';
const HANDOFF_015 = `https://integrations.platform.example/verification/handoff/${REFERENCE_015}`;

const session015 = (status: string, hint: string | null) => ({
  reference: REFERENCE_015,
  status,
  started_at: '2026-10-13T10:00:00.000Z',
  resume_url: HANDOFF_015,
  hint,
});

const standing015 = (
  state: string,
  nextStep: string,
  verificationSession: ReturnType<typeof session015> | null,
) => ({
  code: 200,
  message: 'ok',
  data: {
    level: 1,
    state,
    declared: declared015,
    asking: asking015,
    actions: gameClosed015,
    rejection_reason: null,
    demand_reason: null,
    next_step: nextStep,
    verification_session: verificationSession,
  },
});

/** `standing-session-none-submit.json`. */
export const standingSessionNoneSubmit = standing015('declared', 'submit', null);

/** `standing-session-started.json`. */
export const standingSessionStarted = standing015('declared', 'submit', session015('started', null));

/** `standing-session-submitted.json`. */
export const standingSessionSubmitted = standing015(
  'submitted',
  'wait',
  session015('submitted', null),
);

/** `standing-session-resubmission.json`. */
export const standingSessionResubmission = standing015(
  'declared',
  'submit',
  session015('resubmission_requested', 'Poor image quality'),
);

/** `standing-session-provider-off.json`. */
export const standingSessionProviderOff = standing015('declared', 'wait', null);

/** `standing-session-declined-exhausted.json`. */
export const standingSessionDeclinedExhausted = {
  code: 200,
  message: 'ok',
  data: {
    ...standing015('rejected', 'none', null).data,
    rejection_reason: 'We could not verify your identity from the documents provided.',
  },
};

/** The same session, but `review` (the status the contract's table names beside `submitted`). */
export const standingSessionReview = standing015('submitted', 'wait', session015('review', null));

/** A resubmission whose reason code is outside 201 – 217: `hint: null` (D-075, US2's review, item 1). */
export const standingSessionResubmissionNoHint = standing015(
  'declared',
  'submit',
  session015('resubmission_requested', null),
);

/** `session-start-success.json`. */
export const sessionStartSuccess = {
  code: 200,
  message: 'ok',
  data: {
    reference: REFERENCE_015,
    redirect_url: HANDOFF_015,
    already_started: false,
    expires_at: '2026-10-20T10:00:00.000Z',
  },
};

/** `session-start-already-started.json`. */
export const sessionStartAlreadyStarted = {
  code: 200,
  message: 'ok',
  data: { ...sessionStartSuccess.data, already_started: true },
};

/** `session-start-declaration-required.json`. */
export const sessionStartDeclarationRequired = { code: 415, message: 'declaration-required' };
/** `session-start-not-available.json`. */
export const sessionStartNotAvailable = { code: 415, message: 'verification-not-available' };
/** `session-start-limit.json`. */
export const sessionStartLimit = { code: 415, message: 'verification-limit' };
/** `session-start-provider-unavailable.json`. */
export const sessionStartProviderUnavailable = {
  code: 415,
  message: 'verification-provider-unavailable',
};
/** `session-start-no-return-url.json`. */
export const sessionStartNoReturnUrl = { code: 500, message: 'verification-unavailable' };

export const verificationReference015 = REFERENCE_015;
export const verificationHandoff015 = HANDOFF_015;
