import type { CountryOption } from '@/lib/webapi';
import type { DeclarationValues } from '@/lib/verification';

/**
 * The declared-identity fields (backend feature 007, contracts §2), shared by the
 * sign-up form and the verification page.
 *
 * Field names are the FORM's (`firstName`, `addressCountryId`); `declarationFrom`
 * maps them onto the wire's `snake_case` body. `defaults` is what the player typed
 * before a refusal, so a long form is not lost to one mistake.
 */
export function DeclarationFields({
  countries,
  defaults = {},
  defaultCountryId,
}: {
  countries: CountryOption[];
  defaults?: DeclarationValues;
  defaultCountryId?: string;
}) {
  const field = (
    name: keyof DeclarationValues,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaults[name] ?? ''} className="field" {...props} />
    </div>
  );

  const countrySelect = (name: 'addressCountryId' | 'nationalityCountryId', label: string) => (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required
        defaultValue={defaults[name] ?? defaultCountryId ?? ''}
        className="field"
      >
        <option value="" disabled>
          Select a country
        </option>
        {countries.map((country) => (
          <option key={country.id} value={country.id}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('firstName', 'Legal first name', { required: true, maxLength: 100, autoComplete: 'given-name' })}
        {field('lastName', 'Legal last name', { required: true, maxLength: 100, autoComplete: 'family-name' })}
      </div>
      {field('dateOfBirth', 'Date of birth', { required: true, type: 'date', autoComplete: 'bday' })}
      {field('addressLine1', 'Address', { required: true, maxLength: 200, autoComplete: 'address-line1' })}
      {field('addressLine2', 'Address line 2 (optional)', { maxLength: 200, autoComplete: 'address-line2' })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('city', 'City', { required: true, maxLength: 100, autoComplete: 'address-level2' })}
        {field('postalCode', 'Postal code', { required: true, maxLength: 20, autoComplete: 'postal-code' })}
      </div>
      {countrySelect('addressCountryId', 'Country of residence')}
      {countrySelect('nationalityCountryId', 'Nationality')}
    </>
  );
}
