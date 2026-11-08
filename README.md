# Landing Page & Google Sheets Lead Engine

Infrastruktur landing page berkecepatan tinggi untuk bisnis lokal dan startup. Dibangun menggunakan Astro 5 dan Tailwind CSS v4, mengalirkan data prospek secara terproteksi ke Google Sheets tanpa biaya langganan aplikasi form bulanan.

## Fitur Teknis

- **Performa Ringan**: 0kB runtime JavaScript pada seluruh konten statis. JavaScript hanya dimuat secara parsial untuk interaksi formulir pendaftaran.
- **Serverless API Proxy (`/api/lead`)**: Browser pengunjung tidak pernah berinteraksi langsung dengan URL Google Apps Script, mencegah kebocoran endpoint dan manipulasi data.
- **Perlindungan Spam Multi-Lapis**:
  - *Honeypot Trap*: Menyaring bot pengisi formulir otomatis.
  - *In-Memory Rate Limiting*: Membatasi maksimal 3 kiriman per 10 menit per IP.
  - *Spreadsheet Formula Sanitizer*: Menghapus karakter berbahaya (`=`, `+`, `-`, `@`, `\t`, `\r`) untuk mencegah serangan Google Sheets Formula Injection.
  - *Origin Validation*: Membatasi domain pemanggil hanya dari origin yang diizinkan.
- **Pelacakan Kampanye Pemasaran**: Menangkap parameter kampanye (`utm_source`, `utm_medium`, `utm_campaign`, dan perujuk) secara otomatis.
- **Pengalihan WhatsApp**: Opsi direct WhatsApp dengan draf pesan otomatis sesuai paket yang dipilih calon pelanggan.

## Tech Stack

- **Framework**: Astro 5 (Static Output + Hybrid Serverless Adapter)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Bahasa**: TypeScript (Strict Mode)
- **Deployment**: `@astrojs/vercel`
- **Optimasi Build**: `@astrojs/sitemap`, `astro-seo`, `astro-compressor` (Gzip & Brotli)

## Struktur Direktori

```text
├── public/
│   ├── favicon.svg
│   ├── og-cover.svg
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── FaqAccordion.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── LeadForm.astro
│   │   ├── Navbar.astro
│   │   ├── PricingTiers.astro
│   │   ├── ProblemSolution.astro
│   │   └── StickyMobileCta.astro
│   ├── config/
│   │   └── site.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── api/
│   │   │   └── lead.ts
│   │   ├── index.astro
│   │   └── sandbox-sheet.astro
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── rateLimiter.ts
│       ├── security.ts
│       └── validation.ts
├── .env.example
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Konfigurasi Environment Variables

Salin `.env.example` menjadi `.env.local` untuk pengujian lokal:

```bash
cp .env.example .env.local
```

Variabel yang didukung:

| Variabel | Deskripsi | Wajib |
| :--- | :--- | :--- |
| `GOOGLE_SCRIPT_WEBHOOK_URL` | URL deployment Web App dari Google Apps Script | Ya (untuk mode live) |
| `WEBHOOK_SECRET_KEY` | Token autentikasi antara Astro API route dan Apps Script | Ya (jika Apps Script memvalidasi token) |
| `FORMSPREE_ENDPOINT` | URL fallback Formspree opsional (`https://formspree.io/f/...`) | Tidak |
| `PUBLIC_WHATSAPP_NUMBER` | Nomor WhatsApp bisnis dengan kode negara (contoh: `6281234567890`) | Ya |
| `PUBLIC_SANDBOX_SHEET_URL` | Tautan publik Google Sheet untuk demonstrasi portofolio | Ya |

## Setup Google Apps Script (Backend Spreadsheet)

1. Buat spreadsheet baru di Google Sheets.
2. Buat baris judul pada baris pertama (`Row 1`):
   - Kolom A: `Timestamp`
   - Kolom B: `Full Name`
   - Kolom C: `Email`
   - Kolom D: `Phone`
   - Kolom E: `Package`
   - Kolom F: `Notes`
   - Kolom G: `UTM Source`
   - Kolom H: `UTM Medium`
   - Kolom I: `UTM Campaign`
   - Kolom J: `Referrer`
3. Buka menu **Extensions > Apps Script**, masukkan script berikut ke dalam `Code.gs`:

```javascript
const SHEET_NAME = 'Sheet1';
const EXPECTED_SECRET_KEY = 'your_secret_key_here';
const MAX_ROWS = 51;
const NOTIFY_EMAIL = '';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Server busy' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const payload = JSON.parse(e.postData.contents);

    if (EXPECTED_SECRET_KEY && payload.secretKey !== EXPECTED_SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName(SHEET_NAME) || doc.getActiveSheet();

    const rowData = [
      payload.timestamp || new Date().toISOString(),
      payload.fullName || '-',
      payload.email || '-',
      payload.phone || '-',
      payload.package || '-',
      payload.notes || '-',
      payload.utmSource || '-',
      payload.utmMedium || '-',
      payload.utmCampaign || '-',
      payload.referrer || '-'
    ];

    sheet.appendRow(rowData);

    const totalRows = sheet.getLastRow();
    if (totalRows > MAX_ROWS) {
      const rowsToDelete = totalRows - MAX_ROWS;
      sheet.deleteRows(2, rowsToDelete);
    }

    if (NOTIFY_EMAIL && NOTIFY_EMAIL.length > 5) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: `[Lead Baru] ${payload.fullName} - ${payload.package}`,
        body: `Nama: ${payload.fullName}\nEmail: ${payload.email}\nWhatsApp: ${payload.phone}\nPaket: ${payload.package}\nCatatan: ${payload.notes}\nUTM: ${payload.utmSource} / ${payload.utmCampaign}`
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

4. Klik tombol **Deploy > New deployment**.
5. Pilih tipe **Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
6. Salin Web app URL dan masukkan ke dalam `GOOGLE_SCRIPT_WEBHOOK_URL` di environment variable.

## Development & Build

```bash
# Instalasi dependensi
npm install

# Menjalankan development server lokal
npm run dev

# Verifikasi tipe data dan diagnostik Astro
npx astro check

# Kompilasi production build
npm run build

# Menjalankan preview hasil build lokal
npm run preview
```

## Panduan Deployment ke Vercel

1. Hubungkan repositori GitHub ini ke dashboard Vercel.
2. Pada **Project Settings > Environment Variables**, tambahkan:
   - `GOOGLE_SCRIPT_WEBHOOK_URL`
   - `WEBHOOK_SECRET_KEY`
   - `PUBLIC_WHATSAPP_NUMBER`
   - `PUBLIC_SANDBOX_SHEET_URL`
3. Pada tab **Domains**, tambahkan domain atau subdomain yang Anda inginkan (misalnya `lp.domainanda.com`).
4. Di panel DNS penyedia domain Anda, tambahkan CNAME record yang diarahkan ke Vercel (`cname.vercel-dns.com`).
