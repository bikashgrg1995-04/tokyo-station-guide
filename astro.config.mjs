// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),

  vite: {
    // Changes on every build: cached pages from an older build point at files that no longer exist.
    define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
    server: {
      allowedHosts: ['.trycloudflare.com'],
    },
  },
});