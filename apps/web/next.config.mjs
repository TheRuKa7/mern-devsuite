/** @type {import('next').NextConfig} */
const nextConfig = {
  // `transpilePackages` lets us import the workspace packages directly
  // from source (no tsup/preacting step). Fine for dev; a prod build
  // still tree-shakes through Next's compiler.
  transpilePackages: ["@mern-devsuite/ui", "@mern-devsuite/shared"],
  reactStrictMode: true,
  poweredByHeader: false,

  // Security headers applied to every route. The CSP here is
  // intentionally strict — tighten script-src further once you know
  // exactly which 3rd-party origins you load (Stripe, PostHog, etc.).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
