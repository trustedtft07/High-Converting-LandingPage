const DANGEROUS_CELL_PREFIX = /^[=+\-@\t\r\n]+/;

export function sanitizeSpreadsheetCell(value: string): string {
  const cleaned = value.replace(/[\r\n\t]+/g, ' ').trim();
  return cleaned.replace(DANGEROUS_CELL_PREFIX, '');
}

export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const [localPart, domainPart] = trimmed.split('@');
  if (!localPart || !domainPart) return '***@***';
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domainPart}`;
  }
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.trim();
  if (digits.length < 8) return '****';
  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-3);
  return `${prefix}****${suffix}`;
}

export function isAllowedOrigin(originHeader: string | null): boolean {
  if (!originHeader) return true;
  try {
    const parsed = new URL(originHeader);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'ahmadandhikaharirie.my.id' ||
      host.endsWith('.ahmadandhikaharirie.my.id') ||
      host.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}
