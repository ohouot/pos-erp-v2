import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sortie autonome (server.js + seules les dépendances réellement utilisées)
  // pour une image Docker de production légère — voir apps/web/Dockerfile.
  output: "standalone",
};

export default nextConfig;
