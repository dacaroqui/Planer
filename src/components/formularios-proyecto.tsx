"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { guardarEmpresaAction, guardarProyectoAction } from "@/server/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FormularioEmpresa() {
  const router = useRouter()
  const [exigir, setExigir] = useState(false)
  const [pending, start] = useTransition()
  return (
    <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("exigir", exigir ? "1" : "0")
      start(async () => {
        const result = await guardarEmpresaAction(data)
        if (!result.ok) toast.error(result.error)
        else { toast.success(result.message || "Empresa guardada."); event.currentTarget.reset(); router.refresh() }
      })
    }}>
      <Input name="name" placeholder="Nueva empresa" required minLength={2} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={exigir} onCheckedChange={(value) => setExigir(value === true)} />
        Exigir proyecto al clasificar
      </label>
      <Button type="submit" size="sm" disabled={pending}>Crear empresa</Button>
    </form>
  )
}

export function FormularioProyecto({ empresas, lideres, objetivos = [], fases = [] }: { empresas: { id: string; name: string }[]; lideres: { id: string; name: string }[]; objetivos?: { id: string; titulo: string }[]; fases?: string[] }) {
  const router = useRouter()
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "")
  const [leaderId, setLeaderId] = useState(lideres[0]?.id ?? "")
  const [status, setStatus] = useState("PLANIFICADO")
  const [pending, start] = useTransition()
  return (
    <form className="grid gap-2 md:grid-cols-2" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      data.set("empresaId", empresaId)
      data.set("leaderId", leaderId)
      data.set("status", status)
      start(async () => {
        const result = await guardarProyectoAction(data)
        if (!result.ok) toast.error(result.error)
        else { toast.success("Proyecto creado."); event.currentTarget.reset(); router.refresh() }
      })
    }}>
      <Select value={empresaId} onValueChange={setEmpresaId}>
        <SelectTrigger className="w-full" aria-label="Empresa"><SelectValue placeholder="Empresa" /></SelectTrigger>
        <SelectContent>{empresas.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input name="name" placeholder="Nombre del proyecto" required minLength={3} />
      <Input name="description" placeholder="Descripción" />
      <Select value={leaderId} onValueChange={setLeaderId}>
        <SelectTrigger className="w-full" aria-label="Responsable"><SelectValue placeholder="Responsable" /></SelectTrigger>
        <SelectContent>{lideres.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input name="startsAt" type="date" lang="es-CO" required aria-label="Fecha de inicio" />
      <Input name="targetAt" type="date" lang="es-CO" required aria-label="Fecha objetivo" />
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full" aria-label="Estado"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="PLANIFICADO">Planificado</SelectItem>
          <SelectItem value="EN_CURSO">En curso</SelectItem>
          <SelectItem value="EN_PAUSA">En pausa</SelectItem>
          <SelectItem value="CERRADO">Cerrado</SelectItem>
        </SelectContent>
      </Select>
      <Input name="medio" placeholder="Medio o canal" aria-label="Medio o canal" />
      <select name="fase" aria-label="Fase" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
        <option value="">Fase</option>
        {fases.map((fase) => <option key={fase} value={fase}>{fase}</option>)}
      </select>
      <Input name="costo" inputMode="decimal" placeholder="Costo" aria-label="Costo" />
      <select name="objetivoId" aria-label="Objetivo" className="h-10 rounded-lg border border-[#E4E7EC] bg-white px-3 text-sm">
        <option value="">Sin objetivo</option>
        {objetivos.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
      </select>
      <Button type="submit" disabled={pending}>Crear proyecto</Button>
    </form>
  )
}
