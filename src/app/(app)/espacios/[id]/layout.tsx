import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Esqueleto } from "@/components/esqueleto"
import { NombreMiga } from "@/components/migas"
import { MarcoEspacio } from "@/components/marco-espacio"
import { prisma } from "@/lib/prisma"

export default async function EspacioLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) notFound()
  return (
    <div className="space-y-3">
      <NombreMiga nombre={empresa.name} />
      <MarcoEspacio id={id} nombre={empresa.name} luvania={empresa.name.toLowerCase().includes("luvania")}>
        <Suspense fallback={<Esqueleto />}>{children}</Suspense>
      </MarcoEspacio>
    </div>
  )
}
