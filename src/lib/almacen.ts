import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { uploadDir } from "@/lib/files"

export type DriverAlmacen = "local" | "vercel-blob" | "netlify-blobs"

export type Almacen = {
  guardar(clave: string, bytes: Buffer, tipo: string): Promise<void>
  leer(clave: string): Promise<Buffer | null>
  borrar(clave: string): Promise<void>
}

export type ClienteVercel = {
  put: (
    pathname: string,
    body: Buffer,
    options: { access: "private"; contentType: string; addRandomSuffix: false },
  ) => Promise<{ url?: string; downloadUrl?: string; pathname?: string }>
  get: (
    pathname: string,
    options: { access: "private"; useCache: false },
  ) => Promise<{ stream: ReadableStream<Uint8Array> | null } | null>
  del: (pathname: string) => Promise<void>
}

export type TiendaNetlify = {
  set: (key: string, data: Buffer) => Promise<unknown>
  get: (key: string, options: { type: "arrayBuffer" }) => Promise<ArrayBuffer | null>
  delete?: (key: string) => Promise<unknown>
}

const PREFIJO = "adjuntos"

export function driverAlmacen(env: Record<string, string | undefined> = process.env): DriverAlmacen {
  const valor = (env.STORAGE_DRIVER || "local").trim()
  if (valor === "" || valor === "local") return "local"
  if (valor === "vercel-blob" || valor === "netlify-blobs") return valor
  throw new Error("STORAGE_DRIVER debe ser local, vercel-blob o netlify-blobs.")
}

export function almacenLocal(directorio: string): Almacen {
  return {
    async guardar(clave, bytes) {
      await mkdir(directorio, { recursive: true })
      await writeFile(path.join(directorio, clave), bytes)
    },
    async leer(clave) {
      try {
        return await readFile(path.join(directorio, clave))
      } catch {
        return null
      }
    },
    async borrar(clave) {
      try {
        await unlink(path.join(directorio, clave))
      } catch {
        // Ya no está en disco. Borrar otra vez no falla.
      }
    },
  }
}

export function almacenVercel(cliente: ClienteVercel): Almacen {
  return {
    async guardar(clave, bytes, tipo) {
      const resultado = await cliente.put(`${PREFIJO}/${clave}`, bytes, {
        access: "private",
        contentType: tipo || "application/octet-stream",
        addRandomSuffix: false,
      })
      if (resultado.url || resultado.downloadUrl) {
        // El SDK puede devolver una URL. No se guarda ni se entrega al cliente.
      }
    },
    async leer(clave) {
      const resultado = await cliente.get(`${PREFIJO}/${clave}`, { access: "private", useCache: false })
      if (!resultado?.stream) return null
      return Buffer.from(await new Response(resultado.stream).arrayBuffer())
    },
    async borrar(clave) {
      await cliente.del(`${PREFIJO}/${clave}`)
    },
  }
}

export function almacenNetlify(tienda: TiendaNetlify): Almacen {
  return {
    async guardar(clave, bytes) {
      await tienda.set(clave, bytes)
    },
    async leer(clave) {
      try {
        const data = await tienda.get(clave, { type: "arrayBuffer" })
        if (!data) return null
        return Buffer.from(data)
      } catch {
        return null
      }
    },
    async borrar(clave) {
      await tienda.delete?.(clave)
    },
  }
}

async function clienteVercelReal(): Promise<ClienteVercel> {
  const { del, get, put } = await import("@vercel/blob")
  return {
    put: (pathname, body, options) => put(pathname, body, options),
    del: (pathname) => del(pathname).then(() => undefined),
    get: async (pathname, options) => {
      const resultado = await get(pathname, options)
      if (!resultado || resultado.statusCode !== 200 || !resultado.stream) return null
      return { stream: resultado.stream }
    },
  }
}

async function tiendaNetlifyReal(): Promise<TiendaNetlify> {
  const { getStore } = await import("@netlify/blobs")
  const tienda = getStore("adjuntos")
  return {
    set: (key, data) => tienda.set(key, Uint8Array.from(data).buffer),
    get: (key, options) => tienda.get(key, options),
    delete: (key) => tienda.delete(key),
  }
}

export async function crearAlmacen(
  env: Record<string, string | undefined> = process.env,
  deps?: { vercel?: ClienteVercel; netlify?: TiendaNetlify; directorio?: string },
): Promise<Almacen> {
  const driver = driverAlmacen(env)
  if (driver === "vercel-blob") return almacenVercel(deps?.vercel ?? await clienteVercelReal())
  if (driver === "netlify-blobs") return almacenNetlify(deps?.netlify ?? await tiendaNetlifyReal())
  return almacenLocal(deps?.directorio ?? uploadDir())
}

let activo: Promise<Almacen> | null = null

export function reiniciarAlmacen() {
  activo = null
}

export function obtenerAlmacen() {
  activo ??= crearAlmacen()
  return activo
}
