import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray package-lock.json in the home directory
  // otherwise makes Turbopack infer C:\Users\<user> as the project root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
