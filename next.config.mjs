/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Tidak perlu rewrites di sini — subdomain routing ditangani di middleware.ts

  // Headers: izinkan load script dari CDN dan WebSocket Supabase Realtime
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://app.midtrans.com https://app.sandbox.midtrans.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              // wss:// untuk Supabase Realtime + https: untuk API calls
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
