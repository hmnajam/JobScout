import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native / heavy Node-only packages out of the bundle; load them at
  // runtime from node_modules instead.
  serverExternalPackages: [
    "better-sqlite3",
    "pdf-parse",
    "mammoth",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
