import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://igbo.ai',
  output: 'static',
  vite: {
    build: { assetsInlineLimit: 0 },
    server: { proxy: { '/api': 'http://localhost:8787' } },
  },
});
