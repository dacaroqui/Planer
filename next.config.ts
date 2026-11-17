import type { NextConfig } from "next"
import { origenesPermitidos } from "./src/lib/origenes"

const enPlataforma = process.env.VERCEL === "1" || process.env.NETLIFY === "true"

const nextConfig: NextConfig = {
  ...(enPlataforma ? {} : { output: "standalone" as const }),
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: origenesPermitidos(),
    },
  },
}

export default nextConfig
