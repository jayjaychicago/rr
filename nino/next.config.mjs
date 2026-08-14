/** @type {import('next').NextConfig} */
// LAB_BASE_PATH lets the guided lab mount this app under a path on its OWN port,
// so a remote tester only needs one port open. Unset => unchanged.
const basePath = process.env.LAB_BASE_PATH || undefined;
const nextConfig = {
  output: "standalone",
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
