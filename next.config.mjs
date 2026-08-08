/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin (via jwks-rsa -> jose) is an ESM/CJS-mixed dependency
  // chain that Next's webpack bundler mis-bundles for the serverless
  // function output, causing `ERR_REQUIRE_ESM` at runtime in production
  // (works locally because `next dev` doesn't bundle server code the same
  // way). Marking it external makes Next leave it out of the bundle and
  // let Node's native `require` resolve it directly from node_modules at
  // runtime instead, which handles the ESM/CJS interop correctly.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

export default nextConfig;
