import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { formatTime, preparacionPreviaDe } from '../lib/utils'
import { TIPOS_PROCESO } from '../constants/estados'
import { exportPdfTablaPorMaquina, exportPdfResumenEjecutivo } from '../lib/pdfExport'
import type { UsoEquipo, Maquina, Preparacion } from '../types/database'
import toast from 'react-hot-toast'

/**
 * Página de Informes — exportación a Excel y PDF por máquina.
 *
 * Formato original del cliente (una hoja por máquina):
 *   Data | Hora preparació | Tècnic preparació | [Punxat (Tècnic)] | Hora acabat | Tècnic acabat | Resultat | ... (repetido hasta 3-5 veces) | TOTAL US
 *
 * Las máquinas con `requiere_lanzamiento=true` llevan la columna "Punxat (Tècnic)".
 * Las sinterizadoras (`requiere_preparacion=true`) llevan columnas de preparación.
 * Las fresadoras (`requiere_preparacion=false`) omiten columnas de preparación.
 * Las filas se agrupan por fecha y por máquina.
 */
export default function Informes() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)
  const incidencias = useWorkflowStore((s) => s.incidencias)
  const mantenimientos = useWorkflowStore((s) => s.mantenimientos)
  const preparaciones = useWorkflowStore((s) => s.preparaciones)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const [filterMaquina, setFilterMaquina] = useState<string>('todas')
  const [desde, setDesde] = useState<string>(() => {
    const d = new Date()
    d.setDate(1) // inicio del mes
    return d.toISOString().slice(0, 10)
  })
  const [hasta, setHasta] = useState<string>(() => new Date().toISOString().slice(0, 10))

  const maquinasOrdenadas = useMemo(
    () => [...maquinas].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [maquinas]
  )

  // Group machines by type for the selector
  const fresadoras = useMemo(
    () => maquinasOrdenadas.filter((m) => m.tipo === 'fresadora'),
    [maquinasOrdenadas]
  )
  const sinterizadoras = useMemo(
    () => maquinasOrdenadas.filter((m) => m.tipo === 'sinterizadora'),
    [maquinasOrdenadas]
  )
  const impresoras3d = useMemo(
    () => maquinasOrdenadas.filter((m) => m.tipo === 'impresora_3d'),
    [maquinasOrdenadas]
  )

  // Selected machine object (null when "todas")
  const selectedMaquina = useMemo(
    () => (filterMaquina !== 'todas' ? maquinas.find((m) => m.id === filterMaquina) ?? null : null),
    [maquinas, filterMaquina]
  )

  // Usos filtrados por rango de fechas y máquina
  const usosFiltrados = useMemo(() => {
    return usos.filter((u) => {
      if (u.fecha < desde || u.fecha > hasta) return false
      if (filterMaquina !== 'todas' && u.maquina_id !== filterMaquina) return false
      return true
    })
  }, [usos, desde, hasta, filterMaquina])

  // Mantenimientos filtrados por rango y máquina
  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((m) => {
      if (m.fecha < desde || m.fecha > hasta) return false
      if (filterMaquina !== 'todas' && m.maquina_id !== filterMaquina) return false
      return true
    })
  }, [mantenimientos, desde, hasta, filterMaquina])

  // KPIs del rango
  const stats = useMemo(() => {
    const total = usosFiltrados.length
    const ok = usosFiltrados.filter((u) => u.resultado === 'ok').length
    const ko = usosFiltrados.filter((u) => u.resultado === 'ko').length
    const pendiente = usosFiltrados.filter((u) => u.resultado === 'pendiente').length
    const inc = incidencias.filter((i) => usosFiltrados.some((u) => u.id === i.uso_id)).length
    const mant = mantenimientosFiltrados.length
    return { total, ok, ko, pendiente, inc, mant }
  }, [usosFiltrados, incidencias, mantenimientosFiltrados])

  // Determine whether to show preparation columns in the preview table.
  // When a specific machine is selected, use its requiere_preparacion flag.
  // When "todas" is selected, show prep columns (some machines may have them).
  const showPrepColumns = filterMaquina === 'todas' || (selectedMaquina?.requiere_preparacion ?? false)

  // Same logic for lanzamiento columns
  const showLanzColumns = filterMaquina === 'todas' || (selectedMaquina?.requiere_lanzamiento ?? false)

  // -----------------------------------------------------------------------------
  // Exportación Excel — formato FRESATITAN (compatible con los CSV originales)
  // -----------------------------------------------------------------------------
  const exportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      const maquinasExport = filterMaquina === 'todas'
        ? maquinasOrdenadas
        : maquinasOrdenadas.filter((m) => m.id === filterMaquina)

      for (const maquina of maquinasExport) {
        const usosDeMaquina = usosFiltrados
          .filter((u) => u.maquina_id === maquina.id)
          .sort((a, b) => (a.fecha + a.hora_preparacion).localeCompare(b.fecha + b.hora_preparacion))

        if (usosDeMaquina.length === 0) continue

        // Agrupar por fecha
        const porFecha = new Map<string, UsoEquipo[]>()
        for (const u of usosDeMaquina) {
          if (!porFecha.has(u.fecha)) porFecha.set(u.fecha, [])
          porFecha.get(u.fecha)!.push(u)
        }

        // Máximo de usos en un mismo día
        const maxUsos = Math.max(...Array.from(porFecha.values()).map((a) => a.length))

        // Build columns depending on machine capabilities
        const columnasPorUso: string[] = []
        if (maquina.requiere_preparacion) {
          columnasPorUso.push('Preparado por', 'Preparado el')
        }
        columnasPorUso.push('Proceso')
        columnasPorUso.push('Hora inicio', 'Técnico proceso')
        if (maquina.requiere_lanzamiento) {
          columnasPorUso.push('Técnico lanz.')
        }
        columnasPorUso.push('Hora fin', 'Técnico cierre', 'Resultado')

        const header: string[] = ['Data']
        for (let i = 0; i < maxUsos; i++) header.push(...columnasPorUso)
        header.push('Incidencias', 'Total usos', 'Observaciones')

        const rows: (string | number)[][] = [header]

        // Título de la máquina en la primera fila (merged conceptualmente)
        const tituloFila: string[] = [
          `FRESATITAN · EQUIP: ${maquina.codigo} · ${maquina.nombre}${maquina.numero_serie ? ' · ' + maquina.numero_serie : ''}`,
        ]
        rows.unshift(tituloFila)
        rows.unshift([]) // fila en blanco

        for (const [fecha, usosDelDia] of porFecha) {
          const row: (string | number)[] = [fecha]
          for (let i = 0; i < maxUsos; i++) {
            const u = usosDelDia[i]
            if (!u) {
              for (let c = 0; c < columnasPorUso.length; c++) row.push('')
              continue
            }
            if (maquina.requiere_preparacion) {
              const prepPrev = preparacionPreviaDe(u, preparaciones)
              row.push(prepPrev ? getName(prepPrev.trabajador_id) : '')
              row.push(prepPrev ? `${prepPrev.fecha} ${prepPrev.hora.slice(0, 5)}` : '')
            }
            row.push(u.tipo_proceso ? TIPOS_PROCESO[u.tipo_proceso].label : '')
            row.push(formatTime(u.hora_preparacion))
            row.push(getName(u.tecnico_preparacion_id))
            if (maquina.requiere_lanzamiento) {
              row.push(getName(u.tecnico_lanzamiento_id))
            }
            row.push(u.hora_acabado ? formatTime(u.hora_acabado) : '')
            row.push(u.tecnico_acabado_id ? getName(u.tecnico_acabado_id) : '')
            row.push(u.resultado === 'pendiente' ? '' : u.resultado.toUpperCase())
          }
          const incidenciasDelDia = usosDelDia.flatMap((u) =>
            incidencias.filter((i) => i.uso_id === u.id).map((i) => i.descripcion)
          )
          row.push(incidenciasDelDia.join(' | '))
          row.push(usosDelDia.length)
          row.push(usosDelDia.map((u) => u.observaciones).filter(Boolean).join(' | '))
          rows.push(row)
        }

        // Totales
        rows.push([])
        rows.push([
          'TOTAL',
          ...Array(maxUsos * columnasPorUso.length).fill(''),
          incidencias.filter((i) => usosDeMaquina.some((u) => u.id === i.uso_id)).length,
          usosDeMaquina.length,
          '',
        ])

        const ws = XLSX.utils.aoa_to_sheet(rows)
        ws['!cols'] = header.map(() => ({ wch: 15 }))
        XLSX.utils.book_append_sheet(wb, ws, maquina.codigo)
      }

      // Add Mantenimientos sheet when exporting per-machine or when there are records
      const mantExport = filterMaquina === 'todas'
        ? mantenimientosFiltrados
        : mantenimientosFiltrados.filter((m) => m.maquina_id === filterMaquina)

      if (mantExport.length > 0) {
        const mantHeader = ['Fecha', 'Máquina', 'Tipo', 'Acción realizada', 'Responsable', 'Verificador', 'Validado', 'Observaciones']
        const mantRows: (string | number)[][] = [mantHeader]
        for (const m of mantExport) {
          const maq = maquinasOrdenadas.find((mm) => mm.id === m.maquina_id)
          mantRows.push([
            m.fecha,
            maq ? `${maq.codigo} · ${maq.nombre}` : '—',
            m.tipo,
            m.accion_realizada,
            getName(m.persona_encargada_id),
            getName(m.persona_verificadora_id),
            m.validado ? 'Si' : 'No',
            m.observaciones ?? '',
          ])
        }
        const wsMant = XLSX.utils.aoa_to_sheet(mantRows)
        wsMant['!cols'] = mantHeader.map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, wsMant, 'Mantenimientos')
      }

      if (wb.SheetNames.length === 0) {
        toast.error('No hay datos en el rango seleccionado')
        return
      }

      // Filename includes machine code when exporting a single machine
      const filename = selectedMaquina
        ? `${selectedMaquina.codigo}_informe_${desde}_${hasta}.xlsx`
        : `FRESATITAN_usos_${desde}_${hasta}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`Descargado ${filename}`)
    } catch (err) {
      console.error('[exportarExcel] error:', err)
      toast.error('Error generando el Excel')
    }
  }

  // -----------------------------------------------------------------------------
  // Exportación PDF — formato A (tabla por máquina) y B (resumen ejecutivo)
  // -----------------------------------------------------------------------------
  const exportarPdfDetallado = () => {
    try {
      const maquinasExport = filterMaquina === 'todas'
        ? maquinasOrdenadas
        : maquinasOrdenadas.filter((m) => m.id === filterMaquina)
      const filename = exportPdfTablaPorMaquina({
        maquinas: maquinasExport,
        usos: usosFiltrados,
        incidencias,
        mantenimientos: mantenimientosFiltrados,
        preparaciones,
        getName,
        desde,
        hasta,
        selectedMaquina,
      })
      toast.success(`Descargado ${filename}`)
    } catch (err) {
      console.error('[exportarPdfDetallado] error:', err)
      toast.error(err instanceof Error ? err.message : 'Error generando el PDF')
    }
  }

  const exportarPdfResumen = () => {
    try {
      if (stats.total === 0) {
        toast.error('No hay datos en el rango seleccionado')
        return
      }
      const filename = exportPdfResumenEjecutivo({
        maquinas: maquinasOrdenadas,
        usos: usosFiltrados,
        incidencias,
        mantenimientos: mantenimientosFiltrados,
        getName,
        desde,
        hasta,
        selectedMaquina,
      })
      toast.success(`Descargado ${filename}`)
    } catch (err) {
      console.error('[exportarPdfResumen] error:', err)
      toast.error('Error generando el PDF')
    }
  }

  return (
    <Layout>
      <TopBar
        title="Informes"
        subtitle={selectedMaquina
          ? `Informe de ${selectedMaquina.codigo} · ${selectedMaquina.nombre}`
          : 'Exportación a Excel y PDF por máquina'}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              disabled={stats.total === 0 && stats.mant === 0}
              title="Formato Excel compatible con el histórico del cliente"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-primary text-text-inverse hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ExportIcon />
              Excel
            </button>
            <button
              onClick={exportarPdfDetallado}
              disabled={stats.total === 0}
              title="PDF detallado con tabla de usos por máquina"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-surface-3 border border-border-default text-text-primary hover:bg-surface-4 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ExportIcon />
              PDF detallado
            </button>
            <button
              onClick={exportarPdfResumen}
              disabled={stats.total === 0}
              title="PDF resumen ejecutivo en una página"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-surface-3 border border-border-default text-text-primary hover:bg-surface-4 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ExportIcon />
              PDF resumen
            </button>
          </div>
        }
      />

      <main className="p-4 lg:p-6 space-y-6">
        {/* Filtros */}
        <section className="bg-surface-2 border border-border-subtle rounded-lg p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary mb-3">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                max={hasta}
                className="input-field font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                min={desde}
                className="input-field font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Máquina</label>
              <select
                value={filterMaquina}
                onChange={(e) => setFilterMaquina(e.target.value)}
                className="input-field text-sm"
              >
                <option value="todas">Todas las máquinas ({maquinasOrdenadas.length})</option>
                {fresadoras.length > 0 && (
                  <optgroup label="Fresadoras">
                    {fresadoras.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} · {m.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sinterizadoras.length > 0 && (
                  <optgroup label="Sinterizadoras">
                    {sinterizadoras.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} · {m.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
                {impresoras3d.length > 0 && (
                  <optgroup label="Impresoras 3D">
                    {impresoras3d.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} · {m.nombre}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        </section>

        {/* KPIs del rango */}
        <section className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <StatBlock label="Total usos" value={stats.total} />
          <StatBlock label="Correctos" value={stats.ok} className="text-activa" />
          <StatBlock label="Con KO" value={stats.ko} className="text-averia" />
          <StatBlock label="En curso" value={stats.pendiente} className="text-parada" />
          <StatBlock label="Incidencias" value={stats.inc} className="text-averia" />
          <StatBlock label="Mantenimientos" value={stats.mant} className="text-mantenimiento" />
        </section>

        {/* Tabla preview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              Vista previa · {stats.total} registros
            </h3>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {usosFiltrados.length === 0 ? (
            <div className="bg-surface-2 rounded-lg border border-border-subtle p-8 text-center">
              <p className="text-sm text-text-tertiary">Sin datos en el rango seleccionado.</p>
              <p className="text-[11px] text-text-tertiary mt-1">Ajusta las fechas o elige otra máquina.</p>
            </div>
          ) : (
            <div className="bg-surface-2 rounded-lg border border-border-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-surface-3/50 border-b border-border-subtle text-[10px] uppercase tracking-wider text-text-tertiary">
                      <th className="px-3 py-2 text-left">Máquina</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      {showPrepColumns && <th className="px-3 py-2 text-left">Preparado</th>}
                      <th className="px-3 py-2 text-left">Proceso</th>
                      <th className="px-3 py-2 text-left">Hora inicio</th>
                      <th className="px-3 py-2 text-left">Técnico proceso</th>
                      {showLanzColumns && <th className="px-3 py-2 text-left">Téc. lanz.</th>}
                      <th className="px-3 py-2 text-left">Hora fin</th>
                      <th className="px-3 py-2 text-left">Técnico cierre</th>
                      <th className="px-3 py-2 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usosFiltrados
                      .sort((a, b) => (b.fecha + b.hora_preparacion).localeCompare(a.fecha + a.hora_preparacion))
                      .slice(0, 50)
                      .map((u) => {
                        const m = maquinasOrdenadas.find((mm) => mm.id === u.maquina_id)
                        return (
                          <UsoRow
                            key={u.id}
                            uso={u}
                            maquina={m}
                            preparaciones={preparaciones}
                            getName={getName}
                            showPrepColumns={showPrepColumns}
                            showLanzColumns={showLanzColumns}
                          />
                        )
                      })}
                  </tbody>
                </table>
              </div>
              {usosFiltrados.length > 50 && (
                <div className="px-3 py-2 border-t border-border-subtle bg-surface-3/30 text-[10px] text-text-tertiary text-center">
                  Mostrando 50 de {usosFiltrados.length} · descarga el Excel para ver todos
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </Layout>
  )
}

// =============================================================================
// Sub-componentes
// =============================================================================

function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 10v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3" />
      <polyline points="5,7 8,10 11,7" />
      <line x1="8" y1="10" x2="8" y2="2" />
    </svg>
  )
}

function StatBlock({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-surface-2 border border-border-subtle rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-text-tertiary">{label}</div>
      <div className={`text-metric text-2xl mt-1 ${className ?? 'text-text-primary'}`}>{value}</div>
    </div>
  )
}

function UsoRow({
  uso,
  maquina,
  preparaciones,
  getName,
  showPrepColumns,
  showLanzColumns,
}: {
  uso: UsoEquipo
  maquina: Maquina | undefined
  preparaciones: Preparacion[]
  getName: (id: string | null) => string
  showPrepColumns: boolean
  showLanzColumns: boolean
}) {
  const prepPrevia = preparacionPreviaDe(uso, preparaciones)
  const procesoMeta = uso.tipo_proceso ? TIPOS_PROCESO[uso.tipo_proceso] : null

  return (
    <tr className="border-b border-border-subtle last:border-b-0 hover:bg-surface-3/40 transition-colors">
      <td className="px-3 py-2 font-mono text-[10px] text-primary">{maquina?.codigo ?? '—'}</td>
      <td className="px-3 py-2 font-mono text-text-secondary">{uso.fecha}</td>
      {showPrepColumns && (
        <td className="px-3 py-2 text-text-primary">
          {prepPrevia
            ? <>
                <div>{getName(prepPrevia.trabajador_id)}</div>
                <div className="text-[9px] font-mono text-text-tertiary">{prepPrevia.fecha} · {prepPrevia.hora.slice(0, 5)}</div>
              </>
            : <span className="text-text-tertiary">—</span>}
        </td>
      )}
      <td className="px-3 py-2 text-text-secondary">
        {procesoMeta ? <>{procesoMeta.icon} {procesoMeta.label}</> : <span className="text-text-tertiary">—</span>}
      </td>
      <td className="px-3 py-2 font-mono text-text-secondary">{formatTime(uso.hora_preparacion)}</td>
      <td className="px-3 py-2 text-text-primary">{getName(uso.tecnico_preparacion_id)}</td>
      {showLanzColumns && (
        <td className="px-3 py-2 text-text-tertiary">
          {maquina?.requiere_lanzamiento ? getName(uso.tecnico_lanzamiento_id) : '—'}
        </td>
      )}
      <td className="px-3 py-2 font-mono text-text-secondary">{formatTime(uso.hora_acabado)}</td>
      <td className="px-3 py-2 text-text-primary">{uso.tecnico_acabado_id ? getName(uso.tecnico_acabado_id) : '—'}</td>
      <td className="px-3 py-2 text-center">
        {uso.resultado === 'ok' && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-activa-muted text-activa">OK</span>
        )}
        {uso.resultado === 'ko' && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-averia-muted text-averia">KO</span>
        )}
        {uso.resultado === 'pendiente' && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-parada-muted text-parada">EN CURSO</span>
        )}
      </td>
    </tr>
  )
}
