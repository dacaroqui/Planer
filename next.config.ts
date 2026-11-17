import type { NextConfig } from "next"
import { origenesPermitidos } from "./src/lib/origenes"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: origenesPermitidos(),
    },
  },
}

export default nextConfig
