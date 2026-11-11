/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Hanya izinkan image dari domain yang dikenal (bukan **)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "mmcgxkjbmdfrgkhrajuc.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "fiihost.my.id" },
      { protocol: "https", hostname: "*.fiihost.my.id" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Keamanan Dasar ──────────────────────────────────────────────
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-DNS-Prefetch-Control",    value: "off" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

          // ── CSP — tanpa unsafe-eval di produksi ──────────────────────────
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js butuh unsafe-inline untuk inline styles/scripts dari framework
              // unsafe-eval dihapus — tidak diperlukan di Next.js 14 produksi
              "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://app.midtrans.com https://app.sandbox.midtrans.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // img hanya dari domain yang dikenal + blob untuk QR preview
              "img-src 'self' data: blob: https://*.supabase.co https://fiihost.my.id https://*.fiihost.my.id https://*.fiihosting.my.id",
              // connect hanya ke domain yang dikenal (bukan https: lebar)
              [
                "connect-src 'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",        // Supabase Realtime
                "https://fiihost.my.id",
                "https://*.fiihost.my.id",
                "https://*.fiihosting.my.id", // Coolify WA bot
                "https://app.midtrans.com",
                "https://app.sandbox.midtrans.com",
                "https://tripay.co.id",
                "https://api.xendit.co",
                "https://cdn.jsdelivr.net",   // jsQR CDN
              ].join(" "),
              "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Mencegah clickjacking
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },

      // API routes — tambahan header keamanan untuk response API
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control",          value: "no-store, no-cache, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
