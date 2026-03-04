import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg'],
            manifest: {
                name: 'GPS Dozor: Ghost Run',
                short_name: 'Ghost Run',
                description: 'Race your ghost. Own the road.',
                theme_color: '#050505',
                background_color: '#050505',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.mapbox\.com\/.*/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'mapbox-tiles',
                            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                ],
            },
        }),
    ],

    server: {
        proxy: {
            '/api': {
                target: 'https://a1.gpsguard.eu',
                changeOrigin: true,
                secure: true,
                headers: {
                    // Dev-only: hardcoded demo credentials via proxy
                    Authorization: `Basic ${Buffer.from('api_gpsdozor:yakmwlARdn').toString('base64')}`,
                },
            },
        },
    },

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
})
