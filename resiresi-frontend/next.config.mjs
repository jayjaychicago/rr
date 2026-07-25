/** @type {import('next').NextConfig} */
const nextConfig = {
  // The APIblaze widgets (apiblaze/react) ship as compiled "use client" modules.
  // Transpiling the package through Next's own build fixes the client/server
  // module interop — otherwise Next's dev bundler throws
  // "__webpack_require__.n is not a function" when the Developers page loads them.
  transpilePackages: ["apiblaze"],
};

export default nextConfig;
