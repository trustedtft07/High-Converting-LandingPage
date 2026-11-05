interface ImportMetaEnv {
  readonly GOOGLE_SCRIPT_WEBHOOK_URL?: string;
  readonly WEBHOOK_SECRET_KEY?: string;
  readonly PUBLIC_WHATSAPP_NUMBER?: string;
  readonly PUBLIC_SANDBOX_SHEET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
