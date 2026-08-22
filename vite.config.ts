import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'ms-icon-144x144.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png'
      ],
      manifest: {
        short_name: 'Tasquera',
        description: 'A calm, focused to-do list. Tasks, without the noise.',
        theme_color: '#131211',
        background_color: '#131211',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}']
      }
    }),
    {
      // Ship the third-party notices with the built app so license texts
      // travel alongside the distributed software (also embedded in the bundle
      // via the in-app licenses view).
      name: 'copy-third-party-notices',
      closeBundle() {
        copyFileSync(resolve('THIRD_PARTY_NOTICES.md'), resolve('dist/THIRD_PARTY_NOTICES.md'))
      },
    },
  ],
})

