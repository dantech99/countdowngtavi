// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),

  site: 'https://countdowngtavi.com',

  integrations: [sitemap()],

  // Declara los locales ante el framework. La generación de rutas es manual,
  // vía el rest param [...locale] de src/pages, y el idioma se deriva con
  // getLangFromUrl: un solo camino de código, cubierto por tests, sin depender
  // de cómo interactúa la i18n nativa con rutas de rest param.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // Names come from the Vercel Marketplace Upstash integration, which injects
  // its credentials with a KV_ prefix — not the UPSTASH_REDIS_REST_* names the
  // SDK's own fromEnv() looks for. Declared optional on purpose: a clone
  // without an .env still has to build.
  // The endpoint answers 503 at runtime instead of the build failing outright.
  env: {
    schema: {
      KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
