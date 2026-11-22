// @ts-check
// Configuration used only by the GitHub Pages build (see .github/workflows/deploy.yml).
// It drops the Keystatic integration, so the writing UI and its API do not exist
// in the published output at all — they are not merely hidden behind a link.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';

export default defineConfig({
  site: 'https://ailerie.github.io',
  output: 'static',
  integrations: [react(), markdoc()],
  devToolbar: { enabled: false },
  // Kept apart from ./dist so a publish build never clobbers the local server build.
  outDir: './dist-publish',
});
