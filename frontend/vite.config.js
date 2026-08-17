import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

/** aaPanel / OpenLiteSpeed drop a protected `.user.ini` in the site root. Vite cannot delete it. */
const PROTECTED_OUT_FILES = new Set(['.user.ini']);

function emptyOutDirKeepProtected() {
  let outDir = resolve('dist');
  return {
    name: 'empty-outdir-keep-protected',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    buildStart() {
      if (!existsSync(outDir)) return;
      for (const name of readdirSync(outDir)) {
        if (PROTECTED_OUT_FILES.has(name)) continue;
        rmSync(join(outDir, name), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    emptyOutDir: false,
  },
  plugins: [
    emptyOutDirKeepProtected(),
    {
      name: 'html-build-stamp',
      transformIndexHtml(html) {
        const stamp = new Date().toISOString();
        return html.replace(
          '</head>',
          `    <meta name="app-build" content="${stamp}" />\n  </head>`
        );
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-icon.svg'],
      manifest: {
        name: 'StackPay',
        short_name: 'StackPay',
        description: 'Stack earnings, grow your balance, and withdraw to crypto.',
        theme_color: '#0B0B0B',
        background_color: '#0B0B0B',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'business'],
        lang: 'en',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['stackpay.online', 'www.stackpay.online', 'localhost'],
    proxy: {
      '/api': {
        target: 'https://stackpay.site',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://stackpay.site',
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['stackpay.online', 'www.stackpay.online', 'localhost'],
  },
});
