import { useMemo, useState } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import HistorialAveriasModal from '../components/maquinas/HistorialAveriasModal'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { exportHistorialAveriasPdf } from '../lib/pdfExport'
import { TIPOS_MAQUINA_PLURAL } from '../constants/estados'
import type { Maquina, MaquinaEstado, TipoMaquina } from '../types/database'
import toast from 'react-hot-toast'

/**
 * Auditoría — vista global de averías por máquina (compliance sanitaria).
 *
 * Pensada para la persona responsable (admin) y para las inspecciones:
 *   · Un resumen numérico global de averías abiertas/críticas/pendientes.
 *   · Grid de todas las máquinas activas con sus KPIs de averías.
 *   · Acceso rápido al historial completo de cada máquina (modal con timeline).
 *   · Botón de exportación PDF por máquina (el documento "oficial" para la
 *     inspección sanitaria).
 */
export default function Auditoria() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const getAveriasByMaquina = useWorkflowStore((s) => s.getAveriasByMaquina)
  const getDocumentosByAveria = useWorkflowStore((s) => s.getDocumentosByAveria)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const [historialFor, setHistorialFor] = useState<Maquina | null>(null)
  const [filtroFamilia, setFiltroFamilia] = useState<TipoMaquina | 'todas'>('todas')
  const [exportando, setExportando] = useState<string | null>(null)

  // Solo máquinas operativas (las retiradas no tienen sentido para auditoría)
  const maquinasOperativas = useMemo(
    () => maquinas.filter((m) => m.activa),
    [maquinas],
  )

  const maquinasFiltradas = useMemo(
    () =>
      filtroFamilia === 'todas'
        ? maquinasOperativas
        : maquinasOperativas.filter((m) => m.tipo === filtroFamilia),
    [maquinasOperativas, filtroFamilia],
  )

  // KPIs globales
  const globalStats = useMemo(() => {
    let totalAverias = 0
    let abiertas = 0
    let pendientesRevisar = 0
    let criticas = 0
    let leves = 0
    for (const m of maquinasOperativas) {
      const averias = getAveriasByMaquina(m.id)
      totalAverias += averias.length
      for (const a of averias) {
        if (!a.cerrada_en) {
          abiertas++
          if (!a.severidad_confirmada_por_admin) pendientesRevisar++
          if (a.severidad === 'critica') criticas++
          if (a.severidad === 'leve') leves++
        }
      }
    }
    return { totalAverias, abiertas, pendientesRevisar, criticas, leves }
  }, [maquinasOperativas, getAveriasByMaquina])

  const handleExport = async (maquina: Maquina) => {
    setExportando(maquina.id)
    try {
      const averias = getAveriasByMaquina(maquina.id)
      const docsByAveria: Record<string, ReturnType<typeof getDocumentosByAveria>> = {}
      for (const a of averias) {
        docsByAveria[a.id] = getDocumentosByAveria(a.id)
      }
      await exportHistorialAveriasPdf({
        maquina,
        averias,
        docsByAveria,
        getName,
      })
      toast.success(`Historial de ${maquina.codigo} exportado`)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo exportar')
    } finally {
      setExportando(null)
    }
  }

  return (
    <Layout>
      <TopBar
        title="Auditoría"
        subtitle="Historial de averías y documentación para trazabilidad sanitaria"
        actions={
          globalStats.pendientesRevisar > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-averia px-2 py-1 rounded bg-averia-muted border border-averia/20">
              <span className="w-1.5 h-1.5 rounded-full bg-averia animate-pulse" />
              {globalStats.pendientesRevisar} PENDIENTE{globalStats.pendientesRevisar === 1 ? '' : 'S'}
            </span>
          )
        }
      />

      <main className="p-4 lg:p-6 space-y-5">
        {/* KPIs globales */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatBlock
            label="Averías (total)"
            value={globalStats.totalAverias}
            hint="históricas"
          />
          <StatBlock
            label="Abiertas"
            value={globalStats.abiertas}
            tone={globalStats.abiertas > 0 ? 'averia' : undefined}
          />
          <StatBlock
            label="Pendientes"
            value={globalStats.pendientesRevisar}
            hint="sin revisar"
            tone={globalStats.pendientesRevisar > 0 ? 'averia' : undefined}
          />
          <StatBlock
            label="Críticas"
            value={globalStats.criticas}
            tone="averia"
          />
          <StatBlock
            label="Leves"
            value={globalStats.leves}
            tone="parada"
          />
        </section>

        {/* Filtro por familia */}
        <section>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider mr-1">Familia:</span>
            <FamiliaPill label="Todas" active={filtroFamilia === 'todas'} onClick={() => setFiltroFamilia('todas')} count={maquinasOperativas.length} />
            {(['fresadora', 'sinterizadora', 'impresora_3d'] as TipoMaquina[]).map((t) => {
              const count = maquinasOperativas.filter((m) => m.tipo === t).length
              if (count === 0) return null
              return (
                <FamiliaPill
                  key={t}
                  label={TIPOS_MAQUINA_PLURAL[t]}
                  active={filtroFamilia === t}
                  onClick={() => setFiltroFamilia(t)}
                  count={count}
                />
              )
            })}
          </div>
        </section>

        {/* Grid de máquinas */}
        <section>
          {maquinasFiltradas.length === 0 ? (
            <div className="bg-surface-2 border border-border-subtle rounded-lg p-8 text-center">
              <p className="text-sm text-text-tertiary">No hay máquinas con este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {maquinasFiltradas.map((m) => (
                <MaquinaAuditoriaCard
                  key={m.id}
                  maquina={m}
                  averias={getAveriasByMaquina(m.id)}
                  onHistorial={() => setHistorialFor(m)}
                  onExport={() => handleExport(m)}
                  exportando={exportando === m.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Nota legal / informativa */}
        <section className="bg-surface-2 border border-border-subtle rounded-lg p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            📑 Trazabilidad sanitaria
          </h4>
          <p className="text-[11px] text-text-tertiary leading-relaxed">
            Esta sección agrega todo el registro de averías y sus resoluciones por máquina,
            incluyendo los partes del técnico y fotos adjuntos. Exporta el PDF de cada máquina
            para tener el documento oficial que presentar ante una inspección. Los documentos
            están guardados de forma segura; los enlaces de descarga caducan a la hora.
          </p>
        </section>
      </main>

      {/* Modal de historial */}
      {historialFor && (
        <HistorialAveriasModal
          open={!!historialFor}
          onClose={() => setHistorialFor(null)}
          maquina={historialFor}
        />
      )}
    </Layout>
  )
}

// =============================================================================
// Sub-componentes
// =============================================================================

function StatBlock({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: number
  hint?: string
  tone?: 'averia' | 'parada'
}) {
  const colorClass = tone === 'averia' ? 'text-averia' : tone === 'parada' ? 'text-parada' : 'text-text-primary'
  const borderClass = tone === 'averia' ? 'border-averia/20' : tone === 'parada' ? 'border-parada/20' : 'border-border-subtle'
  return (
    <div className={`bg-surface-2 border ${borderClass} rounded-lg px-3 py-2.5`}>
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-mono font-bold tabular-nums mt-0.5 ${colorClass}`}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-text-tertiary mt-0.5">{hint}</div>
      )}
    </div>
  )
}

function FamiliaPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors
        ${active
          ? 'bg-primary-muted border-primary/30 text-primary'
          : 'bg-surface-3 border-border-subtle text-text-secondary hover:text-text-primary'
        }
      `}
    >
      {label} <span className="opacity-60 ml-0.5">· {count}</span>
    </button>
  )
}

function MaquinaAuditoriaCard({
  maquina,
  averias,
  onHistorial,
  onExport,
  exportando,
}: {
  maquina: Maquina
  averias: MaquinaEstado[]
  onHistorial: () => void
  onExport: () => void
  exportando: boolean
}) {
  const total = averias.length
  const abiertas = averias.filter((a) => !a.cerrada_en).length
  const pendientes = averias.filter((a) => !a.cerrada_en && !a.severidad_confirmada_por_admin).length
  const ultimaAveria = averias[0]   // el store las trae desc por timestamp
  const ultimaFecha = ultimaAveria
    ? new Date(ultimaAveria.timestamp).toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: '2-digit',
      })
    : null

  return (
    <div className={`
      bg-surface-2 border rounded-lg overflow-hidden transition-all
      ${abiertas > 0 ? 'border-averia/30' : 'border-border-subtle hover:border-border-default'}
    `}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-primary font-bold shrink-0">{maquina.codigo}</span>
            <span className="text-sm text-text-primary font-medium truncate">{maquina.nombre}</span>
          </div>
          {abiertas > 0 ? (
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-averia bg-averia/15 px-2 py-0.5 rounded">
              {abiertas} ABIERTA{abiertas === 1 ? '' : 'S'}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-activa bg-activa/10 px-2 py-0.5 rounded">
              SIN INCIDENCIAS
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 border-b border-border-subtle">
        <MiniStat label="Total" value={total} />
        <MiniStat label="Pendientes" value={pendientes} tone={pendientes > 0 ? 'averia' : undefined} />
        <MiniStat label="Última" value={ultimaFecha ?? '—'} textual />
      </div>

      {/* Acciones */}
      <div className="px-4 py-3 flex gap-2">
        <button
          onClick={onHistorial}
          className="flex-1 px-3 py-2 rounded text-xs font-semibold bg-primary text-text-inverse hover:bg-primary-light transition-colors flex items-center justify-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6.5" />
            <polyline points="8,4 8,8 10.5,9.5" />
          </svg>
          Ver historial
        </button>
        <button
          onClick={onExport}
          disabled={exportando || total === 0}
          title={total === 0 ? 'No hay averías que exportar' : 'Exportar historial PDF'}
          className="
            shrink-0 px-3 py-2 rounded text-xs font-semibold
            bg-surface-3 border border-border-subtle text-text-secondary
            hover:bg-surface-4 hover:text-primary hover:border-primary/40
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center gap-1.5
          "
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2h6l3 3v9H4z" />
            <line x1="6" y1="7" x2="11" y2="7" />
            <line x1="6" y1="10" x2="11" y2="10" />
            <line x1="6" y1="13" x2="9" y2="13" />
          </svg>
          {exportando ? '…' : 'PDF'}
        </button>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
  textual,
}: {
  label: string
  value: number | string
  tone?: 'averia'
  textual?: boolean
}) {
  const colorClass = tone === 'averia' ? 'text-averia' : 'text-text-primary'
  return (
    <div className="px-3 py-2 border-r border-border-subtle last:border-r-0 text-center">
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className={`${textual ? 'text-xs font-mono' : 'text-lg font-mono font-bold tabular-nums'} mt-0.5 ${colorClass}`}>
        {value}
      </div>
    </div>
  )
}
