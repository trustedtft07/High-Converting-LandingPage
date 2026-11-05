export interface SiteConfig {
  name: string;
  title: string;
  description: string;
  url: string;
  whatsappNumber: string;
  defaultSandboxSheetUrl: string;
}

export const siteConfig: SiteConfig = {
  name: "SheetFlow",
  title: "SheetFlow | Landing Page Cepat & Terintegrasi Google Sheets",
  description: "Layanan pembuatan landing page berkecepatan tinggi untuk bisnis dan event. Terintegrasi langsung ke Google Sheets dan notifikasi WhatsApp tanpa biaya bulanan.",
  url: "https://sheetflow.vercel.app",
  whatsappNumber: "6281234567890",
  defaultSandboxSheetUrl: "/sandbox-sheet"
};
