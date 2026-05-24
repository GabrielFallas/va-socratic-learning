import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
