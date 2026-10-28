import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generated-project workspaces live under .data and must not be watched/bundled.
  outputFileTracingExcludes: { "*": [".data/**", "templates/**"] },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
