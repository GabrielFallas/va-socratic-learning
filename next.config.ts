import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native CommonJS addon — keep it external so webpack/
  // turbopack don't try to bundle the .node binary into the server output.
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config, { isServer }) => {
    // ── GLTF / GLB assets ──────────────────────────────────────
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: "asset/resource",
    });

    // ── Kaplay: canvas/browser-only — stub on SSR ──────────────
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        kaplay: false,
      };
    }

    return config;
  },
  experimental: {
    // streaming responses
  },
};

export default nextConfig;
