/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/events/list',
        permanent: true,
      },
    ];
  }
};

export default nextConfig;
