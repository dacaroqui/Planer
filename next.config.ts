import type { NextConfig } from "next"
import { origenesPermitidos } from "./src/lib/origenes"

const enPlataforma = process.env.VERCEL === "1" || process.env.NETLIFY === "true"

const paquetesPdf = [
  "@react-pdf/renderer",
  "@react-pdf/font",
  "@react-pdf/layout",
  "@react-pdf/render",
  "@react-pdf/image",
  "@react-pdf/textkit",
  "pdfkit",
  "fontkit",
  "yoga-layout",
]

const nextConfig: NextConfig = {
  ...(enPlataforma ? {} : { output: "standalone" as const }),
  serverExternalPackages: paquetesPdf,
  outputFileTracingIncludes: {
    "/api/informes": ["./src/lib/fonts/**/*", "./node_modules/pdfkit/js/standard-fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
      allowedOrigins: origenesPermitidos(),
    },
  },
}

export default nextConfig
