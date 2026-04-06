import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  swcMinify: false, // Disable SWC minification — fixes variable collision in large files
};
export default nextConfig;
