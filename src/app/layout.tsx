import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const dynamic = "force-dynamic"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Planer · Requerimientos CIFES y Luvania",
  description: "Planer, la mesa interna para radicar y seguir requerimientos de Producto, Marketing, Comercial, Innovación, Administración y Growth.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className={`${poppins.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
