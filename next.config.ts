import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION ??
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("./package.json") as { version: string }).version,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // web-ifc loads .wasm files at runtime — tell webpack to emit them as assets
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
      });
    }
    return config;
  },
};

export default nextConfig;
