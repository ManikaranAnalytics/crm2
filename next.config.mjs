/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mailparser', '@kenjiuno/msgreader', 'sanitize-html'],
  turbopack: {},
};

export default nextConfig;
