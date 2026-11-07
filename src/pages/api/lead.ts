import type { APIRoute } from 'astro';
import { isRateLimited } from '../../utils/rateLimiter';
import {
  isAllowedOrigin,
  maskEmail,
  maskPhone,
  sanitizeSpreadsheetCell
} from '../../utils/security';
import {
  PACKAGE_LABELS,
  isValidPackageId,
  normalizeIndonesianPhone,
  validateLeadInput,
  type LeadSubmissionInput
} from '../../utils/validation';

export const prerender = false;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function resolveClientIp(request: Request, fallbackAddress?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return fallbackAddress || 'unknown';
}

function isConfiguredWebhookUrl(url?: string): url is string {
  if (!url) return false;
  return (
    url.startsWith('https://script.google.com/macros/s/') &&
    !url.includes('/xxx/')
  );
}

function isConfiguredFormspreeUrl(url?: string): url is string {
  if (!url) return false;
  return url.startsWith('https://formspree.io/f/');
}

export const POST: APIRoute = async (context) => {
  const { request } = context;

  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return jsonResponse({ ok: false, error: 'Origin tidak diizinkan.' }, 403);
  }

  let rawBody: LeadSubmissionInput;
  try {
    rawBody = (await request.json()) as LeadSubmissionInput;
  } catch {
    return jsonResponse({ ok: false, error: 'Format data tidak valid.' }, 400);
  }

  if (rawBody.companyFax && rawBody.companyFax.trim().length > 0) {
    return jsonResponse({ ok: true, mode: 'sandbox' }, 200);
  }

  const validation = validateLeadInput(rawBody);
  if (!validation.valid) {
    return jsonResponse(
      { ok: false, error: validation.error || 'Data tidak valid.' },
      400
    );
  }

  let fallbackIp = 'unknown';
  try {
    fallbackIp = context.clientAddress || 'unknown';
  } catch {
    fallbackIp = 'unknown';
  }

  const clientIp = resolveClientIp(request, fallbackIp);
  if (isRateLimited(clientIp)) {
    return jsonResponse({ ok: true, mode: 'sandbox' }, 200);
  }

  const normalizedPhone = normalizeIndonesianPhone(rawBody.phone);
  const packageLabel = isValidPackageId(rawBody.packageId)
    ? PACKAGE_LABELS[rawBody.packageId]
    : sanitizeSpreadsheetCell(rawBody.packageId);

  const sanitizedRecord = {
    timestamp: new Date().toISOString(),
    fullName: sanitizeSpreadsheetCell(rawBody.fullName),
    email: sanitizeSpreadsheetCell(maskEmail(rawBody.email)),
    phone: sanitizeSpreadsheetCell(maskPhone(normalizedPhone)),
    package: sanitizeSpreadsheetCell(packageLabel),
    notes: sanitizeSpreadsheetCell(rawBody.notes || '-'),
    utmSource: sanitizeSpreadsheetCell(rawBody.utmSource || 'direct'),
    utmMedium: sanitizeSpreadsheetCell(rawBody.utmMedium || 'none'),
    utmCampaign: sanitizeSpreadsheetCell(rawBody.utmCampaign || 'organic'),
    referrer: sanitizeSpreadsheetCell(rawBody.referrer || 'direct')
  };

  const googleWebhookUrl = import.meta.env.GOOGLE_SCRIPT_WEBHOOK_URL;
  const webhookSecretKey = import.meta.env.WEBHOOK_SECRET_KEY || '';
  const formspreeEndpoint = import.meta.env.FORMSPREE_ENDPOINT;

  if (isConfiguredWebhookUrl(googleWebhookUrl)) {
    try {
      const upstream = await fetch(googleWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: webhookSecretKey,
          ...sanitizedRecord
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!upstream.ok) {
        return jsonResponse(
          { ok: false, error: 'Gagal menyinkronkan data ke spreadsheet.' },
          502
        );
      }

      return jsonResponse({ ok: true, mode: 'live' }, 200);
    } catch {
      return jsonResponse(
        { ok: false, error: 'Waktu koneksi ke layanan penyimpanan habis.' },
        504
      );
    }
  }

  if (isConfiguredFormspreeUrl(formspreeEndpoint)) {
    try {
      const upstream = await fetch(formspreeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(sanitizedRecord),
        signal: AbortSignal.timeout(8000)
      });

      if (!upstream.ok) {
        return jsonResponse(
          { ok: false, error: 'Gagal meneruskan notifikasi formulir.' },
          502
        );
      }

      return jsonResponse({ ok: true, mode: 'live' }, 200);
    } catch {
      return jsonResponse(
        { ok: false, error: 'Waktu koneksi ke layanan email habis.' },
        504
      );
    }
  }

  return jsonResponse({ ok: true, mode: 'sandbox' }, 200);
};
