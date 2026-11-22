// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'http://127.0.0.1:4321',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), markdoc(), keystatic()],
  server: { host: '127.0.0.1', port: 4321 },
  devToolbar: { enabled: false },
});
