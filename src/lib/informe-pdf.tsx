import React from "react"
import path from "node:path"
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"

Font.register({
  family: "Poppins",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/fonts/Poppins-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "src/lib/fonts/Poppins-SemiBold.ttf"), fontWeight: 600 },
  ],
})

const estilos = StyleSheet.create({
  pagina: { fontFamily: "Poppins", fontSize: 10, color: "#15122A", padding: 36, paddingBottom: 48 },
  marca: { color: "#1658B0", fontSize: 12, fontWeight: 600 },
  h1: { fontSize: 22, fontWeight: 600, marginTop: 8 },
  h2: { fontSize: 14, fontWeight: 600, marginTop: 14, marginBottom: 6, color: "#222B7C" },
  muted: { color: "#3d4a63" },
  fila: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barra: { height: 6, backgroundColor: "#E7F0FB", borderRadius: 3, marginVertical: 3 },
  relleno: { height: 6, backgroundColor: "#1658B0", borderRadius: 3 },
  tarjeta: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 6, padding: 8, marginBottom: 8 },
  pie: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#98A2B3", flexDirection: "row", justifyContent: "space-between" },
})

export type InformePdf = {
  semana: string
  desde: string
  hasta: string
  cumplimiento: number
  aTiempo: number
  enRiesgo: number
  vencidos: number
  proyectos: {
    nombre: string
    area: string
    porcentaje: number
    estado: string
    horasEstimadas: number
    horasReales: number
    entregables: { nombre: string; porcentaje: number; estado: string; fecha: string }[]
    hechasSemana: string[]
    planeadas: string[]
    vencidas: string[]
  }[]
  kpis: { nombre: string; ambito: string; medida: string; estado: string }[]
}

export function DocumentoInforme({ datos }: { datos: InformePdf }) {
  return (
    <Document title={`Informe ${datos.semana}`} author="Planer CIFES">
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.marca}>CIFES · Luvania</Text>
        <Text style={estilos.h1}>Informe semanal de cumplimiento</Text>
        <Text style={estilos.muted}>{datos.semana} · {datos.desde} a {datos.hasta}</Text>
        <Text style={estilos.h2}>Resumen</Text>
        <View style={estilos.tarjeta}>
          <Text>Cumplimiento general {datos.cumplimiento}%</Text>
          <View style={estilos.barra}><View style={[estilos.relleno, { width: `${datos.cumplimiento}%` }]} /></View>
          <Text style={estilos.muted}>{datos.aTiempo} a tiempo · {datos.enRiesgo} en riesgo · {datos.vencidos} vencidos</Text>
        </View>
        <Text style={estilos.pie} render={({ pageNumber, totalPages }) => `Planer · ${pageNumber} / ${totalPages}`} fixed />
      </Page>
      {datos.proyectos.map((proyecto) => (
        <Page key={proyecto.nombre} size="A4" style={estilos.pagina}>
          <Text style={estilos.marca}>CIFES · Luvania</Text>
          <Text style={estilos.h2}>{proyecto.nombre}</Text>
          <Text style={estilos.muted}>{proyecto.area} · {proyecto.estado}</Text>
          <Text>Avance {proyecto.porcentaje}%</Text>
          <View style={estilos.barra}><View style={[estilos.relleno, { width: `${Math.min(100, proyecto.porcentaje)}%` }]} /></View>
          <Text>Horas estimadas {proyecto.horasEstimadas} · registradas {proyecto.horasReales}</Text>
          <Text style={estilos.h2}>Entregables</Text>
          {proyecto.entregables.length === 0 ? <Text style={estilos.muted}>Sin entregables en este corte.</Text> : proyecto.entregables.map((item) => (
            <View key={item.nombre} style={estilos.fila}>
              <Text>{item.nombre} · {item.fecha || "sin fecha"} · {item.estado}</Text>
              <Text>{item.porcentaje}%</Text>
            </View>
          ))}
          <Text style={estilos.h2}>Esta semana</Text>
          <Text>Hechas: {proyecto.hechasSemana.join(", ") || "ninguna"}</Text>
          <Text>Planeadas: {proyecto.planeadas.join(", ") || "ninguna"}</Text>
          <Text>Vencidas: {proyecto.vencidas.join(", ") || "ninguna"}</Text>
          <Text style={estilos.pie} render={({ pageNumber, totalPages }) => `Planer · ${pageNumber} / ${totalPages}`} fixed />
        </Page>
      ))}
      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.marca}>CIFES · Luvania</Text>
        <Text style={estilos.h2}>KPIs</Text>
        {datos.kpis.length === 0 ? <Text style={estilos.muted}>Sin KPIs en este corte.</Text> : datos.kpis.map((kpi) => (
          <Text key={`${kpi.ambito}-${kpi.nombre}`}>{kpi.ambito} · {kpi.nombre}: {kpi.medida} · {kpi.estado}</Text>
        ))}
        <Text style={estilos.pie} render={({ pageNumber, totalPages }) => `Planer · ${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}

export function pdfInforme(datos: InformePdf) {
  return renderToBuffer(<DocumentoInforme datos={datos} />)
}
