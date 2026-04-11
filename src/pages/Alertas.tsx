import { useMemo } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import TrabajadorAvatar from '../components/ui/TrabajadorAvatar'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useAlertasRealtime } from '../hooks/useAlertasRealtime'
import { formatTime } from '../lib/utils'
import type { UsoEquipo, Incidencia, Maquina, MaquinaEstado } from '../types/database'

/**
 * Página de Alertas — agrupa todos los problemas reportados por los técnicos
 * desde el panel de planta, para que el admin los revise y tome acción.
 *
 * Tipos de alertas que muestra:
 *   1. Usos cerrados con resultado = 'ko' (con sus incidencias)
 *   2. Máquinas actualmente en estado 'avería' (estado_actual)
 */
export default function Alertas() {
  useAlertasRealtime()
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)
  const incidencias = useWorkflowStore((s) => s.incidencias)
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)

  const maquinasAveria = useMemo(
    () => maquinas.filter((m) => m.estado_actual === 'avería' && m.activa),
    [maquinas]
  )

  const usosConProblemas = useMemo(
    () => usos
      .filter((u) => u.resultado === 'ko')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [usos]
  )

  const totalIncidencias = incidencias.length
  const total = maquinasAveria.length + usosConProblemas.length

  return (
    <Layout>
      <TopBar
        title="Alertas"
        subtitle={total === 0 ? 'Sin incidencias abiertas · todo en orden' : `${total} alerta${total === 1 ? '' : 's'} · ${totalIncidencias} incidencia${totalIncidencias === 1 ? '' : 's'} registradas`}
        actions={
          total > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-averia px-2 py-1 rounded bg-averia-muted border border-averia/20">
              <span className="w-1.5 h-1.5 rounded-full bg-averia animate-pulse" />
              REQUIERE ATENCIÓN
            </span>
          )
        }
      />

      <main className="p-4 lg:p-6 space-y-6">
        {/* Máquinas en avería — crítico */}
        <section>
          <SectionHeader
            title="Máquinas en avería"
            count={maquinasAveria.length}
            critical
          />
          {maquinasAveria.length === 0 ? (
            <EmptyState message="Ninguna máquina reporta avería. 🎉" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {maquinasAveria.map((m) => {
                const ultimoEvento = estadosHistorial.find(
                  (e) => e.maquina_id === m.id && e.estado === 'avería'
                )
                const reportadoPor = ultimoEvento?.usuario_id
                  ? trabajadores.find((t) => t.id === ultimoEvento.usuario_id) ?? null
                  : null
                return (
                  <MaquinaAveriaCard
                    key={m.id}
                    maquina={m}
                    ultimoEvento={ultimoEvento ?? null}
                    reportadoPor={reportadoPor}
                    getName={getName}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* Usos cerrados con problemas */}
        <section>
          <SectionHeader
            title="Usos cerrados con incidencia"
            count={usosConProblemas.length}
          />
          {usosConProblemas.length === 0 ? (
            <EmptyState message="Todos los usos cerraron correctamente." />
          ) : (
            <div className="space-y-3">
              {usosConProblemas.map((uso) => {
                const maquina = maquinas.find((m) => m.id === uso.maquina_id)
                const usoIncidencias = incidencias.filter((i) => i.uso_id === uso.id)
                if (!maquina) return null
                return (
                  <UsoProblemaCard
                    key={uso.id}
                    uso={uso}
                    maquina={maquina}
                    incidencias={usoIncidencias}
                    getName={getName}
                  />
                )
              })}
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

function SectionHeader({ title, count, critical }: { title: string; count: number; critical?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className={`text-xs font-semibold uppercase tracking-widest ${critical ? 'text-averia' : 'text-text-tertiary'}`}>
        {title}
      </h3>
      {count > 0 && (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${critical ? 'bg-averia-muted text-averia' : 'bg-surface-4 text-text-tertiary'}`}>
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-surface-2 rounded-lg border border-border-subtle p-6 text-center">
      <p className="text-sm text-text-tertiary">{message}</p>
    </div>
  )
}

function MaquinaAveriaCard({
  maquina,
  ultimoEvento,
  reportadoPor,
  getName,
}: {
  maquina: Maquina
  ultimoEvento: MaquinaEstado | null
  reportadoPor: { id: string; nombre: string; apellidos: string } | null
  getName: (id: string | null) => string
}) {
  const updateEstadoMaquina = useWorkflowStore((s) => s.updateEstadoMaquina)

  const fechaReporte = ultimoEvento
    ? new Date(ultimoEvento.timestamp).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="bg-averia/5 border-2 border-averia/30 rounded-lg p-4 animate-averia">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-averia font-bold">{maquina.codigo}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-averia bg-averia/15 px-2 py-0.5 rounded">
          AVERÍA
        </span>
      </div>

      {/* Nombre */}
      <h4 className="text-base font-bold text-text-primary mb-1">{maquina.nombre}</h4>
      {maquina.ubicacion && (
        <p className="text-xs text-text-tertiary mb-3">{maquina.ubicacion}</p>
      )}

      {/* Reportado por (si tenemos el evento en historial) */}
      {reportadoPor && (
        <div className="flex items-center gap-2 bg-surface-3/50 border border-border-subtle rounded px-3 py-2 mb-3">
          <TrabajadorAvatar trabajador={reportadoPor} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Reportado por</div>
            <div className="text-sm font-semibold text-text-primary">{getName(reportadoPor.id)}</div>
          </div>
          {fechaReporte && (
            <div className="text-[10px] font-mono text-text-tertiary text-right">
              {fechaReporte}
            </div>
          )}
        </div>
      )}

      {/* Motivo */}
      {ultimoEvento?.motivo && (
        <div className="mb-3">
          <div className="text-[10px] text-averia uppercase tracking-wider mb-1">Motivo reportado</div>
          <p className="text-xs text-text-primary bg-averia-muted/20 border border-averia/20 rounded px-3 py-2 leading-relaxed">
            ⚠ {ultimoEvento.motivo}
          </p>
        </div>
      )}

      {/* Acción */}
      <button
        onClick={() => {
          if (confirm(`¿Marcar ${maquina.codigo} como operativa? Esto la pondrá de nuevo como "disponible".`)) {
            updateEstadoMaquina(maquina.id, 'parada')
          }
        }}
        className="w-full mt-2 px-3 py-2 rounded text-xs font-medium bg-surface-3 border border-border-default text-text-secondary hover:bg-surface-4 hover:text-text-primary transition-colors"
      >
        Marcar como resuelta
      </button>
    </div>
  )
}

function UsoProblemaCard({
  uso,
  maquina,
  incidencias,
  getName,
}: {
  uso: UsoEquipo
  maquina: Maquina
  incidencias: Incidencia[]
  getName: (id: string | null) => string
}) {
  return (
    <div className="bg-surface-2 border border-averia/20 rounded-lg overflow-hidden">
      <div className="h-0.5 bg-averia" />
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-averia-muted text-averia">
            KO
          </span>
          <span className="font-mono text-xs text-primary font-bold">{maquina.codigo}</span>
          <span className="text-[11px] text-text-secondary">{maquina.nombre}</span>
        </div>
        <span className="text-[10px] font-mono text-text-tertiary">{uso.fecha}</span>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-text-tertiary block mb-0.5">Preparación</span>
            <span className="text-text-primary">{formatTime(uso.hora_preparacion)} · {getName(uso.tecnico_preparacion_id)}</span>
          </div>
          {uso.hora_acabado && (
            <div>
              <span className="text-text-tertiary block mb-0.5">Cierre</span>
              <span className="text-text-primary">{formatTime(uso.hora_acabado)} · {getName(uso.tecnico_acabado_id)}</span>
            </div>
          )}
        </div>

        {incidencias.length > 0 && (
          <div className="pt-2">
            <span className="text-[10px] text-averia uppercase tracking-wider block mb-1.5">
              Incidencias reportadas ({incidencias.length})
            </span>
            <ul className="space-y-1">
              {incidencias.map((i) => (
                <li
                  key={i.id}
                  className="text-[11px] text-text-secondary bg-averia-muted/20 border border-averia/15 rounded px-2.5 py-1.5 flex items-start gap-2"
                >
                  <span className="text-averia mt-0.5">⚠</span>
                  <span className="flex-1">{i.descripcion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uso.observaciones && (
          <div className="pt-1">
            <span className="text-[10px] text-text-tertiary block mb-1">Observaciones</span>
            <p className="text-[11px] text-text-secondary bg-surface-3 rounded px-2.5 py-1.5">{uso.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  )
}
