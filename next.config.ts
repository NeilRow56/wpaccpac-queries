import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'w0mlmrgwbziwquaq.public.blob.vercel-storage.com'
      },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'static.vecteezy.com' },
      { protocol: 'https', hostname: 'avatar.vercel.sh' },
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.pexels.com' }
    ]
  }
}

export default nextConfig
//Next.js 16 automatically sets both turbopack.root and outputFileTracingRoot to the project root if you don’t manually override them.

//No hardcoded paths → no warnings on Vercel.

//Your reactCompiler and images.remotePatterns stay intact.
