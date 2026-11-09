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
  // Support wildcard subdomain routing untuk kost publik
  // kostholland.fiihost.my.id → /kost/kostholland
  // fiihost.my.id sendiri TIDAK di-rewrite (halaman utama tetap normal)
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              // Hanya match subdomain yang bukan www dan bukan apex domain
              // Match: kostholland.fiihost.my.id
              // TIDAK match: fiihost.my.id atau www.fiihost.my.id
              value: '^(?!www\\.)(?<subdomain>[a-z0-9-]+)\\.fiihost\\.my\\.id$',
            },
          ],
          destination: '/kost/:subdomain/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
