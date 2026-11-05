import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import compressor from 'astro-compressor';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://sheetflow.vercel.app',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap(),
    compressor()
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
});
