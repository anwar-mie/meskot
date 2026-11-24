import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@meskot/shared-types', '@meskot/shared-schemas'],
};

export default nextConfig;
