import { jsPDF } from 'jspdf'
import type {
  UsoEquipo,
  Maquina,
  Incidencia,
  Mantenimiento,
  TipoMaquina,
  MaquinaEstado,
  AveriaDocumento,
  SeveridadAveria,
} from '../types/database'
import { formatTime } from './utils'

const TIPO_LABEL_UPPER: Record<TipoMaquina, string> = {
  fresadora: 'FRESADORA',
  sinterizadora: 'SINTERIZADORA',
  impresora_3d: 'IMPRESORA 3D',
}

const TIPO_LABEL: Record<TipoMaquina, string> = {
  fresadora: 'Fresadora',
  sinterizadora: 'Sinterizadora',
  impresora_3d: 'Impresora 3D',
}

// =============================================================================
// FRESATITAN OPS — Exportación PDF
// =============================================================================
// Dos formatos:
//   A) Tabla por máquina con todos los usos del rango (para imprimir / archivar)
//   B) Resumen ejecutivo con KPIs y top máquinas (una página, tipo dashboard)
//
// Both formats adapt columns based on machine type:
//   - Sinterizadoras (requiere_preparacion=true): include preparation columns
//   - Fresadoras (requiere_preparacion=false): omit preparation columns
// =============================================================================

export interface PdfExportData {
  maquinas: Maquina[]
  usos: UsoEquipo[]
  incidencias: Incidencia[]
  mantenimientos: Mantenimiento[]
  getName: (id: string | null) => string
  desde: string
  hasta: string
  /** When a specific machine is selected; null for "todas" */
  selectedMaquina: Maquina | null
}

// -----------------------------------------------------------------------------
// FORMATO A — Tabla por máquina
// -----------------------------------------------------------------------------
export function exportPdfTablaPorMaquina({ maquinas, usos, incidencias, mantenimientos, getName, desde, hasta, selectedMaquina }: PdfExportData) {
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
    const tipoLabel = TIPO_LABEL_UPPER[maquina.tipo]
    const prepLabel = maquina.requiere_preparacion ? 'Con preparación' : 'Sin preparación'
    const lanzLabel = maquina.requiere_lanzamiento ? ' · Con lanzamiento' : ''
    doc.text(
      `${tipoLabel} · ${prepLabel}${lanzLabel}` +
        (maquina.ubicacion ? ` · ${maquina.ubicacion}` : ''),
      marginX,
      marginTop + 13
    )

    // Build columns depending on machine capabilities
    const colTitulos: string[] = ['Fecha']
    if (maquina.requiere_preparacion) {
      colTitulos.push('Hora prep.', 'Técnico prep.')
    }
    if (maquina.requiere_lanzamiento) {
      colTitulos.push('Lanz. (hora)', 'Téc. lanz.')
    }
    colTitulos.push('Hora acab.', 'Téc. acab.', 'Result.', 'Incidencias', 'Observaciones')

    // Calculate column positions dynamically
    const colX = buildColumnPositions(marginX, pageWidth - marginX * 2, colTitulos.length)

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

      const values: string[] = [u.fecha]
      if (maquina.requiere_preparacion) {
        values.push(formatTime(u.hora_preparacion))
        values.push(getName(u.tecnico_preparacion_id))
      }
      if (maquina.requiere_lanzamiento) {
        values.push('') // placeholder for lanz. hora (not stored separately)
        values.push(getName(u.tecnico_lanzamiento_id))
      }
      values.push(formatTime(u.hora_acabado))
      values.push(u.tecnico_acabado_id ? getName(u.tecnico_acabado_id) : '')
      values.push(u.resultado.toUpperCase())
      values.push(truncate(incTxt, 40))
      values.push(truncate(u.observaciones ?? '', 30))

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

    // Summary section per machine
    y += 3
    const okCount = usosDeMaquina.filter((u) => u.resultado === 'ok').length
    const koCount = usosDeMaquina.filter((u) => u.resultado === 'ko').length
    const mantCount = mantenimientos.filter((m) => m.maquina_id === maquina.id).length
    const tasaOk = usosDeMaquina.length > 0 ? Math.round((okCount / usosDeMaquina.length) * 100) : 0

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text(
      `Total usos: ${usosDeMaquina.length}  |  OK: ${okCount}  |  KO: ${koCount}  |  Tasa OK: ${tasaOk}%  |  Mantenimientos: ${mantCount}`,
      marginX,
      y
    )

    // Pie de página
    doc.setFont('helvetica', 'normal')
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

  const filename = selectedMaquina
    ? `${selectedMaquina.codigo}_detallado_${desde}_${hasta}.pdf`
    : `FRESATITAN_informe_detallado_${desde}_${hasta}.pdf`
  doc.save(filename)
  return filename
}

// -----------------------------------------------------------------------------
// FORMATO B — Resumen ejecutivo (una página con KPIs)
// -----------------------------------------------------------------------------
export function exportPdfResumenEjecutivo({ maquinas, usos, incidencias, mantenimientos, desde, hasta, selectedMaquina }: PdfExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Cabecera
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(208, 154, 64)
  doc.text('FRESATITAN OPS', pageWidth / 2, 25, { align: 'center' })

  doc.setFontSize(11)
  doc.setTextColor(100)
  const subtitle = selectedMaquina
    ? `Resumen · ${selectedMaquina.codigo} · ${selectedMaquina.nombre}`
    : 'Resumen ejecutivo de producción'
  doc.text(subtitle, pageWidth / 2, 32, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(130)
  doc.text(`Periodo: ${desde}  →  ${hasta}`, pageWidth / 2, 38, { align: 'center' })

  // Machine type indicator when per-machine
  if (selectedMaquina) {
    doc.setFontSize(8)
    doc.setTextColor(150)
    const tipoLabel = TIPO_LABEL[selectedMaquina.tipo]
    const prepLabel = selectedMaquina.requiere_preparacion ? ' · Con preparación' : ' · Sin preparación'
    doc.text(`${tipoLabel}${prepLabel}`, pageWidth / 2, 43, { align: 'center' })
  }

  // Línea separadora
  doc.setDrawColor(208, 154, 64)
  doc.setLineWidth(0.5)
  const lineY = selectedMaquina ? 47 : 42
  doc.line(20, lineY, pageWidth - 20, lineY)

  // KPIs
  const total = usos.length
  const ok = usos.filter((u) => u.resultado === 'ok').length
  const ko = usos.filter((u) => u.resultado === 'ko').length
  const pendiente = usos.filter((u) => u.resultado === 'pendiente').length
  const tasaOk = total > 0 ? Math.round((ok / total) * 100) : 0
  const totalMant = mantenimientos.length

  const kpis: { label: string; value: string | number; color: [number, number, number] }[] = [
    { label: 'Total usos', value: total, color: [40, 40, 40] },
    { label: 'Correctos', value: ok, color: [34, 197, 94] },
    { label: 'Con KO', value: ko, color: [239, 68, 68] },
    { label: 'En curso', value: pendiente, color: [245, 158, 11] },
    { label: 'Tasa OK', value: `${tasaOk}%`, color: [208, 154, 64] },
    { label: 'Incidencias', value: incidencias.length, color: [239, 68, 68] },
  ]

  // When per-machine, add maintenance KPI
  if (selectedMaquina) {
    kpis.push({ label: 'Mantenimientos', value: totalMant, color: [59, 130, 246] })
  }

  // Grid of KPIs
  const startY = lineY + 13
  const cardW = 55
  const cardH = 28
  const gapX = 5
  const gapY = 5
  const cols = selectedMaquina ? 4 : 3
  const startX = (pageWidth - (cols * cardW + (cols - 1) * gapX)) / 2

  kpis.forEach((kpi, idx) => {
    const row = Math.floor(idx / cols)
    const col = idx % cols
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

  const kpiRows = Math.ceil(kpis.length / cols)

  // Top máquinas más usadas (only in "todas" mode)
  let nextSectionY = startY + kpiRows * (cardH + gapY) + 10

  if (!selectedMaquina) {
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

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Top 5 máquinas más usadas', 20, nextSectionY)

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(20, nextSectionY + 2, pageWidth - 20, nextSectionY + 2)

    let ty = nextSectionY + 9
    const maxCount = topMaquinas[0]?.count ?? 1

    for (const { maquina, count } of topMaquinas) {
      if (!maquina) continue
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

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40)
      doc.text(String(count), pageWidth - 18, ty, { align: 'right' })

      ty += 8
    }

    nextSectionY = ty + 10
  }

  // Maintenance summary (always shown for per-machine, optional for "todas")
  if (mantenimientos.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text(selectedMaquina ? 'Mantenimientos registrados' : 'Últimos mantenimientos', 20, nextSectionY)

    doc.setDrawColor(220, 220, 220)
    doc.line(20, nextSectionY + 2, pageWidth - 20, nextSectionY + 2)

    let my = nextSectionY + 9
    const recentMant = [...mantenimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 6)

    for (const m of recentMant) {
      if (my > 265) break
      const maq = maquinas.find((mm) => mm.id === m.maquina_id)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(59, 130, 246) // blue
      doc.text(m.fecha, 22, my)
      doc.setTextColor(208, 154, 64)
      doc.text(maq?.codigo ?? '—', 48, my)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40)
      doc.text(`${m.tipo} · ${truncate(m.accion_realizada, 70)}`, 70, my)
      my += 5
    }

    nextSectionY = my + 5
  }

  // Incidencias recientes
  if (nextSectionY < 250) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Últimas incidencias reportadas', 20, nextSectionY)

    doc.setDrawColor(220, 220, 220)
    doc.line(20, nextSectionY + 2, pageWidth - 20, nextSectionY + 2)

    let iy = nextSectionY + 9
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
        doc.text('!', 22, iy)
        doc.setTextColor(208, 154, 64)
        doc.text(maquina?.codigo ?? '—', 27, iy)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(40)
        doc.text(truncate(inc.descripcion, 100), 48, iy)
        iy += 5
      }
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

  const filename = selectedMaquina
    ? `${selectedMaquina.codigo}_resumen_${desde}_${hasta}.pdf`
    : `FRESATITAN_resumen_${desde}_${hasta}.pdf`
  doc.save(filename)
  return filename
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max - 1) + '...' : str
}

/**
 * Distribute column positions evenly across the available width.
 */
function buildColumnPositions(startX: number, totalWidth: number, numCols: number): number[] {
  const positions: number[] = []
  const colWidth = totalWidth / numCols
  for (let i = 0; i < numCols; i++) {
    positions.push(startX + i * colWidth)
  }
  return positions
}

// =============================================================================
// FORMATO C — Historial completo de averías por máquina (compliance sanitaria)
// =============================================================================
// Documento destinado a ser presentado en inspecciones. Recoge por cada avería:
// fecha, severidad, motivo, medidas correctoras, técnico que intervino y lista
// de documentos adjuntos (nombre — el PDF no incorpora los archivos en sí, pero
// sí los nombres y fechas para trazabilidad).
// =============================================================================

export interface HistorialExportData {
  maquina: Maquina
  averias: MaquinaEstado[]                            // desc por timestamp
  docsByAveria: Record<string, AveriaDocumento[]>     // maquina_estado_id → docs
  getName: (id: string | null) => string
}

const SEV_PDF_LABEL: Record<SeveridadAveria, string> = {
  critica: 'CRÍTICA',
  leve: 'LEVE',
}

export function exportHistorialAveriasPdf({
  maquina,
  averias,
  docsByAveria,
  getName,
}: HistorialExportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 15
  let y = 20

  // Cabecera
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(33)
  doc.text('Historial de averías', marginX, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth - marginX, y, { align: 'right' })

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(`${maquina.codigo} · ${maquina.nombre}`, marginX, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  const tipoLabel = TIPO_LABEL_UPPER[maquina.tipo]
  const parts = [tipoLabel]
  if (maquina.numero_serie) parts.push(`S/N ${maquina.numero_serie}`)
  if (maquina.ubicacion) parts.push(maquina.ubicacion)
  doc.text(parts.join(' · '), marginX, y)

  // Línea dorada separadora
  y += 4
  doc.setDrawColor(208, 154, 64)
  doc.setLineWidth(0.4)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 6

  // Resumen numérico
  const totalDocs = Object.values(docsByAveria).reduce((acc, arr) => acc + arr.length, 0)
  const abiertas = averias.filter((a) => !a.cerrada_en).length
  const criticas = averias.filter((a) => a.severidad === 'critica').length
  const leves = averias.filter((a) => a.severidad === 'leve').length

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60)
  const resumen = `${averias.length} avería${averias.length === 1 ? '' : 's'} · ${abiertas} abierta${abiertas === 1 ? '' : 's'} · ${criticas} crítica${criticas === 1 ? '' : 's'} · ${leves} leve${leves === 1 ? '' : 's'} · ${totalDocs} documento${totalDocs === 1 ? '' : 's'} adjunto${totalDocs === 1 ? '' : 's'}`
  doc.text(resumen, marginX, y)
  y += 8

  if (averias.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(130)
    doc.text('Esta máquina no tiene averías registradas.', marginX, y)
    const filename = `${maquina.codigo}_historial_averias.pdf`
    doc.save(filename)
    return filename
  }

  // Por cada avería, bloque resumen
  for (const a of averias) {
    // Verifica si queda sitio; si no, nueva página
    if (y > pageHeight - 50) {
      doc.addPage()
      y = 20
    }

    const docs = docsByAveria[a.id] ?? []
    const abierta = !a.cerrada_en
    const sevLabel = a.severidad ? SEV_PDF_LABEL[a.severidad] : 'SIN CLASIFICAR'

    // Bloque con fondo tenue
    const blockStartY = y
    doc.setFillColor(245, 245, 245)
    doc.rect(marginX - 2, y - 4, pageWidth - 2 * (marginX - 2), 6, 'F')

    // Header de la avería
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(33)
    const fechaReporte = new Date(a.timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    doc.text(`${fechaReporte} · ${sevLabel} · ${abierta ? 'ABIERTA' : 'CERRADA'}`, marginX, y)

    y += 6

    // Reportada por
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80)
    doc.text(`Reportada por: ${getName(a.usuario_id)}`, marginX, y)
    y += 5

    // Motivo
    if (a.motivo) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(180, 50, 50)
      doc.text('MOTIVO', marginX, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(40)
      const motivoLines = doc.splitTextToSize(a.motivo, pageWidth - 2 * marginX)
      doc.text(motivoLines, marginX, y)
      y += motivoLines.length * 4 + 2
    }

    // Resolución
    if (a.resolucion_descripcion) {
      if (y > pageHeight - 35) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(50, 140, 50)
      doc.text('MEDIDAS CORRECTORAS APLICADAS', marginX, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(40)
      const resLines = doc.splitTextToSize(a.resolucion_descripcion, pageWidth - 2 * marginX)
      doc.text(resLines, marginX, y)
      y += resLines.length * 4 + 2

      // Técnico + fecha intervención
      const extras: string[] = []
      if (a.tecnico_intervencion) extras.push(`Técnico: ${a.tecnico_intervencion}`)
      if (a.fecha_intervencion) extras.push(`Intervención: ${a.fecha_intervencion}`)
      if (a.cerrada_por) extras.push(`Cerrada por: ${getName(a.cerrada_por)}`)
      if (a.cerrada_en) {
        extras.push(`Fecha cierre: ${new Date(a.cerrada_en).toLocaleDateString('es-ES')}`)
      }
      if (extras.length > 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(110)
        doc.text(extras.join(' · '), marginX, y)
        y += 4
      }
    } else if (abierta) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(170, 100, 0)
      doc.text('Sin resolver — pendiente de actuación.', marginX, y)
      y += 4
    }

    // Lista de documentos adjuntos (nombres)
    if (docs.length > 0) {
      if (y > pageHeight - 20) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text(`DOCUMENTOS ADJUNTOS (${docs.length})`, marginX, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(80)
      for (const d of docs) {
        if (y > pageHeight - 12) { doc.addPage(); y = 20 }
        const subidaDate = new Date(d.subido_en)
        const fechaSubida = subidaDate.toLocaleDateString('es-ES')
        const horaSubida = subidaDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        doc.text(`• ${d.nombre_original}  (subido ${fechaSubida} · ${horaSubida})`, marginX + 3, y)
        y += 4
      }
    }

    // Separador entre averías
    y += 3
    doc.setDrawColor(220)
    doc.setLineWidth(0.2)
    doc.line(marginX, y, pageWidth - marginX, y)
    y += 5

    void blockStartY
  }

  // Footer en cada página
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140)
    doc.text(
      `Documento generado por FRESATITAN OPS — Pág. ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  const filename = `${maquina.codigo}_historial_averias_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return filename
}
