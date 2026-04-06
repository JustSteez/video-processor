/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'fluent-ffmpeg',
    'better-sqlite3',
  ],
  experimental: {
    serverActions: { bodySizeLimit: '500mb' },
  },
}
module.exports = nextConfig
