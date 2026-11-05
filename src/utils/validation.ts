export const VALID_PACKAGES = [
  'landing-page-standar',
  'landing-page-bisnis',
  'custom-development'
] as const;

export type PackageId = (typeof VALID_PACKAGES)[number];

export const PACKAGE_LABELS: Record<PackageId, string> = {
  'landing-page-standar': 'Landing Page Standar (Rp 1.200.000)',
  'landing-page-bisnis': 'Landing Page Bisnis + UTM (Rp 2.400.000)',
  'custom-development': 'Custom Development & Funnel'
};

export interface LeadSubmissionInput {
  fullName: string;
  email: string;
  phone: string;
  packageId: string;
  notes?: string;
  companyFax?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const BLOCKED_TERMS = [
  'anjing',
  'bangsat',
  'kontol',
  'memek',
  'ngentot',
  'tolol',
  'goblok',
  'bajingan',
  'jancok',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'viagra',
  'casino'
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDONESIAN_PHONE_PATTERN = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;

export function normalizeIndonesianPhone(rawPhone: string): string {
  return rawPhone.replace(/[\s\-().]/g, '').trim();
}

export function containsBlockedTerms(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKED_TERMS.some((term) => {
    const boundaryPattern = new RegExp(`\\b${term}\\b`, 'i');
    return boundaryPattern.test(normalized);
  });
}

export function isValidPackageId(value: string): value is PackageId {
  return (VALID_PACKAGES as readonly string[]).includes(value);
}

export function validateLeadInput(input: LeadSubmissionInput): ValidationResult {
  const fullName = (input.fullName || '').trim();
  const email = (input.email || '').trim().toLowerCase();
  const phone = normalizeIndonesianPhone(input.phone || '');
  const packageId = (input.packageId || '').trim();
  const notes = (input.notes || '').trim();

  if (fullName.length < 2 || fullName.length > 80) {
    return {
      valid: false,
      error: 'Nama lengkap wajib diisi minimal 2 hingga 80 karakter.'
    };
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 120) {
    return {
      valid: false,
      error: 'Masukkan alamat email aktif dengan format yang benar.'
    };
  }

  if (!INDONESIAN_PHONE_PATTERN.test(phone)) {
    return {
      valid: false,
      error: 'Masukkan nomor WhatsApp Indonesia yang valid (contoh: 081234567890).'
    };
  }

  if (!isValidPackageId(packageId)) {
    return {
      valid: false,
      error: 'Pilih salah satu paket layanan yang tersedia.'
    };
  }

  if (notes.length > 500) {
    return {
      valid: false,
      error: 'Catatan kebutuhan maksimal 500 karakter.'
    };
  }

  if (containsBlockedTerms(`${fullName} ${email} ${notes}`)) {
    return {
      valid: false,
      error: 'Mohon gunakan bahasa yang wajar pada data formulir.'
    };
  }

  return { valid: true };
}
