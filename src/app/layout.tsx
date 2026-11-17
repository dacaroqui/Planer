import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const dynamic = "force-dynamic"

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
})

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Mesa · Requerimientos CIFES y Luvania",
  description: "Mesa interna para radicar y seguir requerimientos de Desarrollo y Marketing.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
