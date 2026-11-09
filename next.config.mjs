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
  // Support wildcard subdomain routing
  async rewrites() {
    return {
      beforeFiles: [
        // Route subdomain requests ke /kost/[subdomain]
        // kostholland.fiihost.my.id → /kost/kostholland
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>.+)\\.fiihost\\.my\\.id',
            },
          ],
          destination: '/kost/:subdomain/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
