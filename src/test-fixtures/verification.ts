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
