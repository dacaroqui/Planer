import { motivoArchivo } from "@/lib/archivos-permitidos"

export type PiezaArchivo = {
  id: string
  name: string
  size: number
  type: string
  error: string | null
}

export function piezaDeArchivo(archivo: { name: string; size: number; type?: string }, id = `${archivo.name}-${archivo.size}`) {
  return {
    id,
    name: archivo.name,
    size: archivo.size,
    type: archivo.type ?? "",
    error: motivoArchivo(archivo.name, archivo.size, archivo.type ?? ""),
  }
}

export function incorporarArchivos(actuales: PiezaArchivo[], nuevos: Array<{ name: string; size: number; type?: string }>) {
  const siguientes = [...actuales]
  for (const archivo of nuevos) {
    if (archivo.size < 0) continue
    const pieza = piezaDeArchivo(archivo, `${archivo.name}-${archivo.size}-${siguientes.length}`)
    if (siguientes.some((item) => item.name === pieza.name && item.size === pieza.size && item.type === pieza.type)) continue
    siguientes.push(pieza)
  }
  return siguientes.slice(0, 8)
}

export function quitarArchivo(actuales: PiezaArchivo[], id: string) {
  return actuales.filter((item) => item.id !== id)
}

export function puedeSeguirConArchivos(actuales: PiezaArchivo[]) {
  return actuales.every((item) => !item.error)
}
