/** Normalize a US phone number to E.164 (+1XXXXXXXXXX). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.startsWith("+") && digits.length >= 11 && digits.length <= 15)
    return `+${digits}`;
  return null;
}

export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
