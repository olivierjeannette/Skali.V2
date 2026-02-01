import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // Stratégies de cache personnalisées
    runtimeCaching: [
      // Cache les pages statiques (stale-while-revalidate)
      {
        urlPattern: /^https?.*\.(html|htm)$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-pages-cache",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 heures
          },
        },
      },
      // Cache les assets statiques (cache first)
      {
        urlPattern: /^https?.*\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-images-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
          },
        },
      },
      // Cache les fonts
      {
        urlPattern: /^https?.*\.(woff|woff2|ttf|otf|eot)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-fonts-cache",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
          },
        },
      },
      // Cache les CSS/JS (stale-while-revalidate)
      {
        urlPattern: /^https?.*\.(css|js)$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-resources-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
          },
        },
      },
      // API calls - Network first (données fraîches prioritaires)
      {
        urlPattern: /\/api\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 5 * 60, // 5 minutes
          },
          networkTimeoutSeconds: 10,
        },
      },
      // Supabase API - Network only (données sensibles)
      {
        urlPattern: /.*supabase\.co.*/,
        handler: "NetworkOnly",
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "gstatic-fonts-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimisations
  reactStrictMode: true,
  poweredByHeader: false,

  // Compression
  compress: true,

  // Images optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Headers sécurité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // Cache les assets PWA
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/workbox-:hash.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(withPWA(nextConfig));
