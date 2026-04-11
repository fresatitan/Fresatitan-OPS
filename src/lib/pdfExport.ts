import { jsPDF } from 'jspdf'
import type { UsoEquipo, Maquina, Incidencia } from '../types/database'
import { formatTime } from './utils'

// =============================================================================
// FRESATITAN OPS — Exportación PDF
// =============================================================================
// Dos formatos:
//   A) Tabla por máquina con todos los usos del rango (para imprimir / archivar)
//   B) Resumen ejecutivo con KPIs y top máquinas (una página, tipo dashboard)
// =============================================================================

export interface PdfExportData {
  maquinas: Maquina[]
  usos: UsoEquipo[]
  incidencias: Incidencia[]
  getName: (id: string | null) => string
  desde: string
  hasta: string
}

// -----------------------------------------------------------------------------
// FORMATO A — Tabla por máquina
// -----------------------------------------------------------------------------
export function exportPdfTablaPorMaquina({ maquinas, usos, incidencias, getName, desde, hasta }: PdfExportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 10
  const marginTop = 15

  let isFirstPage = true

  // Ordenamos máquinas por código
  const maquinasOrdenadas = [...maquinas].sort((a, b) => a.codigo.localeCompare(b.codigo))

  for (const maquina of maquinasOrdenadas) {
    const usosDeMaquina = usos
      .filter((u) => u.maquina_id === maquina.id)
      .sort((a, b) => (a.fecha + a.hora_preparacion).localeCompare(b.fecha + b.hora_preparacion))

    if (usosDeMaquina.length === 0) continue

    if (!isFirstPage) doc.addPage()
    isFirstPage = false

    // Cabecera FRESATITAN
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(208, 154, 64) // primary dorado
    doc.text('FRESATITAN OPS', marginX, marginTop)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Rango: ${desde}  →  ${hasta}`, pageWidth - marginX, marginTop, { align: 'right' })

    // Título de la máquina
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.text(`${maquina.codigo} · ${maquina.nombre}`, marginX, marginTop + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(
      `${maquina.tipo.toUpperCase()} · ${maquina.requiere_lanzamiento ? 'Con lanzamiento manual' : 'Sin lanzamiento'}` +
        (maquina.ubicacion ? ` · ${maquina.ubicacion}` : ''),
      marginX,
      marginTop + 13
    )

    // Tabla de usos
    const colX = maquina.requiere_lanzamiento
      ? [marginX, marginX + 22, marginX + 40, marginX + 65, marginX + 90, marginX + 110, marginX + 135, marginX + 155, marginX + 175, marginX + 205, marginX + 260]
      : [marginX, marginX + 22, marginX + 45, marginX + 75, marginX + 100, marginX + 130, marginX + 165, marginX + 220, marginX + 275]

    const colTitulos = maquina.requiere_lanzamiento
      ? ['Fecha', 'Hora prep.', 'Técnico prep.', 'Lanz. (hora)', 'Téc. lanz.', 'Hora acab.', 'Téc. acab.', 'Result.', 'Incidencias', 'Observaciones']
      : ['Fecha', 'Hora prep.', 'Técnico prep.', 'Hora acab.', 'Téc. acab.', 'Result.', 'Incidencias', 'Observaciones']

    let y = marginTop + 20

    // Cabecera tabla
    doc.setFillColor(240, 235, 225)
    doc.rect(marginX, y - 4, pageWidth - marginX * 2, 6, 'F')
    doc.setFontSize(7)
    doc.setTextColor(80)
    doc.setFont('helvetica', 'bold')
    colTitulos.forEach((t, i) => doc.text(t, colX[i], y))
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(40)

    for (const u of usosDeMaquina) {
      if (y > pageHeight - 15) {
        doc.addPage()
        y = marginTop
      }

      const usoIncidencias = incidencias.filter((i) => i.uso_id === u.id)
      const incTxt = usoIncidencias.map((i) => i.descripcion).join(' | ')
      const resColor: [number, number, number] =
        u.resultado === 'ok' ? [34, 197, 94] : u.resultado === 'ko' ? [239, 68, 68] : [245, 158, 11]

      const values = maquina.requiere_lanzamiento
        ? [
            u.fecha,
            formatTime(u.hora_preparacion),
            getName(u.tecnico_preparacion_id),
            '',
            getName(u.tecnico_lanzamiento_id),
            formatTime(u.hora_acabado),
            u.tecnico_acabado_id ? getName(u.tecnico_acabado_id) : '',
            u.resultado.toUpperCase(),
            truncate(incTxt, 40),
            truncate(u.observaciones ?? '', 30),
          ]
        : [
            u.fecha,
            formatTime(u.hora_preparacion),
            getName(u.tecnico_preparacion_id),
            formatTime(u.hora_acabado),
            u.tecnico_acabado_id ? getName(u.tecnico_acabado_id) : '',
            u.resultado.toUpperCase(),
            truncate(incTxt, 50),
            truncate(u.observaciones ?? '', 40),
          ]

      values.forEach((v, i) => {
        if (colTitulos[i] === 'Result.') {
          doc.setTextColor(...resColor)
          doc.setFont('helvetica', 'bold')
          doc.text(String(v), colX[i], y)
          doc.setTextColor(40)
          doc.setFont('helvetica', 'normal')
        } else {
          doc.text(String(v), colX[i], y)
        }
      })
      y += 5
    }

    // Footer con total
    y += 3
    doc.setFontSize(7)
    doc.setTextColor(120)
    doc.text(`Total usos: ${usosDeMaquina.length}`, marginX, y)

    // Pie de página
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `FRESATITAN OPS · Generado el ${new Date().toLocaleString('es-ES')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  if (isFirstPage) {
    // No hubo datos
    throw new Error('Sin datos en el rango seleccionado')
  }

  const filename = `FRESATITAN_informe_detallado_${desde}_${hasta}.pdf`
  doc.save(filename)
  return filename
}

// -----------------------------------------------------------------------------
// FORMATO B — Resumen ejecutivo (una página con KPIs)
// -----------------------------------------------------------------------------
export function exportPdfResumenEjecutivo({ maquinas, usos, incidencias, desde, hasta }: PdfExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cabecera
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(208, 154, 64)
  doc.text('FRESATITAN OPS', pageWidth / 2, 25, { align: 'center' })

  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text('Resumen ejecutivo de producción', pageWidth / 2, 32, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(130)
  doc.text(`Periodo: ${desde}  →  ${hasta}`, pageWidth / 2, 38, { align: 'center' })

  // Línea separadora
  doc.setDrawColor(208, 154, 64)
  doc.setLineWidth(0.5)
  doc.line(20, 42, pageWidth - 20, 42)

  // KPIs
  const total = usos.length
  const ok = usos.filter((u) => u.resultado === 'ok').length
  const ko = usos.filter((u) => u.resultado === 'ko').length
  const pendiente = usos.filter((u) => u.resultado === 'pendiente').length
  const tasaOk = total > 0 ? Math.round((ok / total) * 100) : 0

  const kpis: { label: string; value: string | number; color: [number, number, number] }[] = [
    { label: 'Total usos', value: total, color: [40, 40, 40] },
    { label: 'Correctos', value: ok, color: [34, 197, 94] },
    { label: 'Con KO', value: ko, color: [239, 68, 68] },
    { label: 'En curso', value: pendiente, color: [245, 158, 11] },
    { label: 'Tasa OK', value: `${tasaOk}%`, color: [208, 154, 64] },
    { label: 'Incidencias', value: incidencias.length, color: [239, 68, 68] },
  ]

  // Grid 3x2 de KPIs
  const startY = 55
  const cardW = 55
  const cardH = 28
  const gapX = 5
  const gapY = 5
  const startX = (pageWidth - (3 * cardW + 2 * gapX)) / 2

  kpis.forEach((kpi, idx) => {
    const row = Math.floor(idx / 3)
    const col = idx % 3
    const x = startX + col * (cardW + gapX)
    const y = startY + row * (cardH + gapY)

    // Fondo de la card
    doc.setFillColor(245, 245, 245)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD')

    // Valor grande
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...kpi.color)
    doc.text(String(kpi.value), x + cardW / 2, y + 14, { align: 'center' })

    // Label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(kpi.label.toUpperCase(), x + cardW / 2, y + 23, { align: 'center' })
  })

  // Top máquinas más usadas
  const usosByMaquina = new Map<string, number>()
  for (const u of usos) {
    usosByMaquina.set(u.maquina_id, (usosByMaquina.get(u.maquina_id) ?? 0) + 1)
  }
  const topMaquinas = Array.from(usosByMaquina.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      maquina: maquinas.find((m) => m.id === id),
      count,
    }))
    .filter((x) => x.maquina)

  const topStartY = startY + 2 * (cardH + gapY) + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Top 5 máquinas más usadas', 20, topStartY)

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(20, topStartY + 2, pageWidth - 20, topStartY + 2)

  let ty = topStartY + 9
  const maxCount = topMaquinas[0]?.count ?? 1

  for (const { maquina, count } of topMaquinas) {
    if (!maquina) continue
    // Código + nombre
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(208, 154, 64)
    doc.text(maquina.codigo, 22, ty)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    doc.text(maquina.nombre, 48, ty)

    // Barra
    const barMaxW = 90
    const barW = (count / maxCount) * barMaxW
    doc.setFillColor(208, 154, 64)
    doc.rect(pageWidth - 20 - barMaxW, ty - 3, barW, 4, 'F')
    doc.setFillColor(240, 235, 225)
    doc.rect(pageWidth - 20 - barMaxW + barW, ty - 3, barMaxW - barW, 4, 'F')

    // Count
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text(String(count), pageWidth - 18, ty, { align: 'right' })

    ty += 8
  }

  // Incidencias recientes
  const incidenciasStartY = ty + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Últimas incidencias reportadas', 20, incidenciasStartY)

  doc.setDrawColor(220, 220, 220)
  doc.line(20, incidenciasStartY + 2, pageWidth - 20, incidenciasStartY + 2)

  let iy = incidenciasStartY + 9
  const ultimasIncidencias = [...incidencias]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  if (ultimasIncidencias.length === 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150)
    doc.text('Sin incidencias en el periodo.', 22, iy)
  } else {
    for (const inc of ultimasIncidencias) {
      if (iy > 270) break
      const uso = usos.find((u) => u.id === inc.uso_id)
      const maquina = uso ? maquinas.find((m) => m.id === uso.maquina_id) : null
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(239, 68, 68)
      doc.text('⚠', 22, iy)
      doc.setTextColor(208, 154, 64)
      doc.text(maquina?.codigo ?? '—', 27, iy)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40)
      doc.text(truncate(inc.descripcion, 100), 48, iy)
      iy += 5
    }
  }

  // Pie de página
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text(
    `FRESATITAN OPS · Generado el ${new Date().toLocaleString('es-ES')}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  )

  const filename = `FRESATITAN_resumen_${desde}_${hasta}.pdf`
  doc.save(filename)
  return filename
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
