import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { almacenLocal, almacenNetlify, almacenVercel, driverAlmacen, type ClienteVercel, type TiendaNetlify } from "@/lib/almacen"

describe("drivers de almacenamiento", () => {
  it("elige local si no hay driver y rechaza un valor desconocido", () => {
    expect(driverAlmacen({})).toBe("local")
    expect(driverAlmacen({ STORAGE_DRIVER: "vercel-blob" })).toBe("vercel-blob")
    expect(driverAlmacen({ STORAGE_DRIVER: "netlify-blobs" })).toBe("netlify-blobs")
    expect(() => driverAlmacen({ STORAGE_DRIVER: "s3" })).toThrow(/local, vercel-blob o netlify-blobs/)
  })

  it("guarda y lee en disco con el driver local", async () => {
    const directorio = await mkdtemp(path.join(os.tmpdir(), "mesa-adjuntos-"))
    try {
      const almacen = almacenLocal(directorio)
      await almacen.guardar("nota.txt", Buffer.from("hola"), "text/plain")
      expect((await almacen.leer("nota.txt"))?.toString()).toBe("hola")
      expect(await almacen.leer("no-existe.txt")).toBeNull()
    } finally {
      await rm(directorio, { recursive: true, force: true })
    }
  })

  it("sube a Vercel Blob en privado y no devuelve la URL pública", async () => {
    const objetos = new Map<string, Buffer>()
    const cliente: ClienteVercel = {
      async put(pathname, body, options) {
        expect(options.access).toBe("private")
        expect(options.addRandomSuffix).toBe(false)
        objetos.set(pathname, body)
        return { url: "https://store.public.blob.vercel-storage.com/adjuntos/nota.txt", downloadUrl: "https://store.public.blob.vercel-storage.com/adjuntos/nota.txt?download=1", pathname }
      },
      async get(pathname, options) {
        expect(options.access).toBe("private")
        const body = objetos.get(pathname)
        if (!body) return null
        return { stream: new Response(new Uint8Array(body)).body }
      },
    }
    const almacen = almacenVercel(cliente)
    const guardado = await almacen.guardar("nota.txt", Buffer.from("privado"), "text/plain")
    expect(guardado).toBeUndefined()
    const leido = await almacen.leer("nota.txt")
    expect(leido?.toString()).toBe("privado")
    expect(leido?.toString()).not.toContain("blob.vercel-storage.com")
    expect(await almacen.leer("otro.txt")).toBeNull()
  })

  it("usa el almacén privado de Netlify y no publica una URL", async () => {
    const objetos = new Map<string, Buffer>()
    const tienda: TiendaNetlify = {
      async set(key, data) {
        objetos.set(key, data)
        return { modified: true }
      },
      async get(key) {
        const data = objetos.get(key)
        if (!data) return null
        return Uint8Array.from(data).buffer
      },
    }
    const almacen = almacenNetlify(tienda)
    await almacen.guardar("nota.txt", Buffer.from("netlify"), "text/plain")
    const leido = await almacen.leer("nota.txt")
    expect(leido?.toString()).toBe("netlify")
    expect(JSON.stringify(leido)).not.toContain("http")
    expect(await almacen.leer("falta.txt")).toBeNull()
  })

  it("la descarga no menciona una URL pública del blob", async () => {
    const fuente = await readFile(new URL("../app/api/adjuntos/[id]/route.ts", import.meta.url), "utf8")
    expect(fuente).not.toContain("blob.vercel-storage.com")
    expect(fuente).not.toContain("downloadUrl")
    expect(fuente).toContain("obtenerAlmacen")
  })
})
