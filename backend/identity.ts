/** Shared, strict Philippine mobile number parsing for auth and registration. */
export function normalizePhilippineMobileNumber(input: string): string | null {
  const value = String(input ?? '').trim().replace(/[\s()-]/g, '');
  if (/^09\d{9}$/.test(value)) return `+63${value.slice(1)}`;
  if (/^\+639\d{9}$/.test(value)) return value;
  return null;
}
export function validatePhilippineMobileNumber(input: string): boolean {
  return normalizePhilippineMobileNumber(input) !== null;
}
export function normalizeEmail(input: string): string | null {
  const email = String(input ?? '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
export function classifyLoginIdentifier(input: string): { type: 'email'; value: string } | { type: 'phone'; value: string } | null {
  const email = normalizeEmail(input);
  if (email) return { type: 'email', value: email };
  const phone = normalizePhilippineMobileNumber(input);
  return phone ? { type: 'phone', value: phone } : null;
}
