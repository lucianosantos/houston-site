import process from 'node:process'
import { getSiteSettings } from './scripts/site-settings.mjs'

const settings = getSiteSettings()
const verification = process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export default defineNuxtConfig({
  srcDir: 'app/',
  ssr: true,
  compatibilityDate: '2026-10-22',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: 'en-US' },
      meta: [
        { name: 'theme-color', content: '#101212' },
        { name: 'color-scheme', content: 'dark' },
        ...(verification ? [{ name: 'google-site-verification', content: verification }] : [])
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  nitro: {
    preset: 'static',
    output: { publicDir: 'dist' },
    prerender: { routes: ['/', '/en-us', '/pt-br'], crawlLinks: false, failOnError: true, autoSubfolderIndex: false }
  },
  runtimeConfig: {
    public: { ...settings }
  },
  typescript: { strict: true }
})



