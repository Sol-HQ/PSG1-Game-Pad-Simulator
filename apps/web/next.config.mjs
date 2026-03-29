/** @type {import('next').NextConfig} */
// PADSIM PSG1 demo app — transpiles @psg1/core from monorepo source
const nextConfig = {
  transpilePackages: ["@psg1/core"],
};

export default nextConfig;
