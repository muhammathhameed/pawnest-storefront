/** @type {import('next').NextConfig} */
export default {
  // Lets the OMS import ../../packages/shared (RBAC, schemas) without publishing it.
  experimental: { externalDir: true },
  // Admin portal: never indexed, never framed.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
      ],
    }];
  },
};
