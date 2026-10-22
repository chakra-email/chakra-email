import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  allowedDevOrigins: ['chakra-email.test'],
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  outputFileTracingIncludes: {
    '/*': ['../../docs/*.md', '../../examples/**/*.tsx'],
  },
  experimental: { optimizePackageImports: ['@chakra-ui/react'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      ...[
        '/og-image',
        '/og-image/:path*',
        '/social-image',
        '/:path*/social-image',
      ].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default config;
