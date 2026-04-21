import { useMemo } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import TrabajadorAvatar from '../components/ui/TrabajadorAvatar'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useAuthStore } from '../store/authStore'
import { useAlertasRealtime } from '../hooks/useAlertasRealtime'
import { SEVERIDADES } from '../constants/estados'
import { formatTime } from '../lib/utils'
import type { UsoEquipo, Incidencia, Maquina, MaquinaEstado, SeveridadAveria } from '../types/database'

/**
 * Página de Alertas — punto de control del admin.
 *
 * Secciones:
 *   1. Pendientes de revisar — avería recién reportada por un trabajador con
 *      severidad PROPUESTA pero no confirmada. Admin debe clasificar.
 *   2. Críticas confirmadas — avería clasificada como crítica: máquina bloqueada.
 *   3. Leves confirmadas — avería clasificada como leve: máquina operativa pero
 *      la alerta sigue abierta hasta que admin la marque como resuelta.
 *   4. Usos cerrados con incidencia (resultado=ko) — histórico.
 */
export default function Alertas() {
  useAlertasRealtime()
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)
  const incidencias = useWorkflowStore((s) => s.incidencias)
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)

  // Averías abiertas = filas del historial con estado='avería' y cerrada_en = null
  // Puede haber varias por máquina (edge case); nos quedamos con la más reciente
  const averiasAbiertas = useMemo(() => {
    const abiertas = estadosHistorial.filter(
      (e) => e.estado === 'avería' && !e.cerrada_en,
    )
    // Deduplicar por máquina conservando la más reciente
    const seenMaquinas = new Set<string>()
    const result: MaquinaEstado[] = []
    // estadosHistorial viene ya ordenado por timestamp desc
    for (const e of abiertas) {
      if (!seenMaquinas.has(e.maquina_id)) {
        seenMaquinas.add(e.maquina_id)
        result.push(e)
      }
    }
    return result
  }, [estadosHistorial])

  const pendientes = useMemo(
    () => averiasAbiertas.filter((e) => !e.severidad_confirmada_por_admin),
    [averiasAbiertas],
  )
  const criticasConfirmadas = useMemo(
    () => averiasAbiertas.filter((e) => e.severidad_confirmada_por_admin && e.severidad === 'critica'),
    [averiasAbiertas],
  )
  const levesConfirmadas = useMemo(
    () => averiasAbiertas.filter((e) => e.severidad_confirmada_por_admin && e.severidad === 'leve'),
    [averiasAbiertas],
  )

  const usosConProblemas = useMemo(
    () => usos
      .filter((u) => u.resultado === 'ko')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [usos],
  )

  const totalIncidencias = incidencias.length
  const total = averiasAbiertas.length + usosConProblemas.length

  const getMaquina = (id: string) => maquinas.find((m) => m.id === id) ?? null
  const getReporter = (usuarioId: string | null) =>
    usuarioId ? trabajadores.find((t) => t.id === usuarioId) ?? null : null

  return (
    <Layout>
      <TopBar
        title="Alertas"
        subtitle={
          total === 0
            ? 'Sin incidencias abiertas · todo en orden'
            : `${total} alerta${total === 1 ? '' : 's'} · ${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'} de revisar · ${totalIncidencias} incidencia${totalIncidencias === 1 ? '' : 's'} registradas`
        }
        actions={
          pendientes.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-averia px-2 py-1 rounded bg-averia-muted border border-averia/20">
              <span className="w-1.5 h-1.5 rounded-full bg-averia animate-pulse" />
              PENDIENTE DE REVISAR
            </span>
          )
        }
      />

      <main className="p-4 lg:p-6 space-y-6">
        {/* 1. Pendientes de revisar — prioritarias */}
        <section>
          <SectionHeader
            title="Pendientes de revisar"
            subtitle="Avisos recientes de trabajadores — decide la gravedad final"
            count={pendientes.length}
            critical
          />
          {pendientes.length === 0 ? (
            <EmptyState message="Ninguna alerta pendiente de revisión." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {pendientes.map((evento) => {
                const maquina = getMaquina(evento.maquina_id)
                if (!maquina) return null
                return (
                  <AveriaCard
                    key={evento.id}
                    variant="pendiente"
                    evento={evento}
                    maquina={maquina}
                    reportadoPor={getReporter(evento.usuario_id)}
                    getName={getName}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* 2. Críticas confirmadas */}
        <section>
          <SectionHeader
            title="Críticas confirmadas"
            subtitle="Máquina bloqueada hasta resolución"
            count={criticasConfirmadas.length}
            critical
          />
          {criticasConfirmadas.length === 0 ? (
            <EmptyState message="Sin averías críticas activas." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {criticasConfirmadas.map((evento) => {
                const maquina = getMaquina(evento.maquina_id)
                if (!maquina) return null
                return (
                  <AveriaCard
                    key={evento.id}
                    variant="critica"
                    evento={evento}
                    maquina={maquina}
                    reportadoPor={getReporter(evento.usuario_id)}
                    getName={getName}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* 3. Leves confirmadas */}
        <section>
          <SectionHeader
            title="Leves confirmadas"
            subtitle="Máquina operativa — alerta abierta a título informativo"
            count={levesConfirmadas.length}
          />
          {levesConfirmadas.length === 0 ? (
            <EmptyState message="Sin alertas leves abiertas." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {levesConfirmadas.map((evento) => {
                const maquina = getMaquina(evento.maquina_id)
                if (!maquina) return null
                return (
                  <AveriaCard
                    key={evento.id}
                    variant="leve"
                    evento={evento}
                    maquina={maquina}
                    reportadoPor={getReporter(evento.usuario_id)}
                    getName={getName}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* 4. Usos cerrados con problemas — histórico */}
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
                const maquina = getMaquina(uso.maquina_id)
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

function SectionHeader({
  title,
  subtitle,
  count,
  critical,
}: {
  title: string
  subtitle?: string
  count: number
  critical?: boolean
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
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
      {subtitle && (
        <p className="text-[11px] text-text-tertiary mt-1">{subtitle}</p>
      )}
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

type AveriaVariant = 'pendiente' | 'critica' | 'leve'

function AveriaCard({
  variant,
  evento,
  maquina,
  reportadoPor,
  getName,
}: {
  variant: AveriaVariant
  evento: MaquinaEstado
  maquina: Maquina
  reportadoPor: { id: string; nombre: string; apellidos: string } | null
  getName: (id: string | null) => string
}) {
  const updateEstadoMaquina = useWorkflowStore((s) => s.updateEstadoMaquina)
  const confirmarSeveridad = useWorkflowStore((s) => s.confirmarSeveridadAveria)
  const adminUser = useAuthStore((s) => s.user)

  const fechaReporte = new Date(evento.timestamp).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Paleta por variante
  const style = variant === 'pendiente'
    ? { border: 'border-averia/40', bg: 'bg-averia/5', accent: 'bg-averia', text: 'text-averia', animate: 'animate-averia' }
    : variant === 'critica'
    ? { border: 'border-averia/30', bg: 'bg-averia/5', accent: 'bg-averia', text: 'text-averia', animate: '' }
    : { border: 'border-parada/30', bg: 'bg-parada/5', accent: 'bg-parada', text: 'text-parada', animate: '' }

  const propuestaLabel = evento.severidad ? SEVERIDADES[evento.severidad].label : null

  const handleConfirmar = async (severidad: SeveridadAveria) => {
    await confirmarSeveridad(evento.id, severidad, adminUser?.id ?? null)
  }

  const handleResolver = async () => {
    if (confirm(`¿Marcar ${maquina.codigo} como operativa y cerrar la alerta?`)) {
      await updateEstadoMaquina(maquina.id, 'parada')
    }
  }

  return (
    <div className={`${style.bg} border-2 ${style.border} rounded-lg p-4 ${style.animate}`}>
      {/* Cabecera: código + badge de estado */}
      <div className="flex items-center justify-between mb-3">
        <span className={`font-mono text-xs ${style.text} font-bold`}>{maquina.codigo}</span>
        <VariantBadge variant={variant} severidad={evento.severidad} />
      </div>

      {/* Nombre de la máquina */}
      <h4 className="text-base font-bold text-text-primary mb-1">{maquina.nombre}</h4>
      {maquina.ubicacion && (
        <p className="text-xs text-text-tertiary mb-3">{maquina.ubicacion}</p>
      )}

      {/* Reportado por */}
      {reportadoPor && (
        <div className="flex items-center gap-2 bg-surface-3/50 border border-border-subtle rounded px-3 py-2 mb-3">
          <TrabajadorAvatar trabajador={reportadoPor} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Reportado por</div>
            <div className="text-sm font-semibold text-text-primary">{getName(reportadoPor.id)}</div>
          </div>
          <div className="text-[10px] font-mono text-text-tertiary text-right">
            {fechaReporte}
          </div>
        </div>
      )}

      {/* Motivo */}
      {evento.motivo && (
        <div className="mb-3">
          <div className={`text-[10px] ${style.text} uppercase tracking-wider mb-1`}>Motivo</div>
          <p className={`text-xs text-text-primary bg-averia-muted/20 border ${style.border} rounded px-3 py-2 leading-relaxed`}>
            ⚠ {evento.motivo}
          </p>
        </div>
      )}

      {/* Propuesta del trabajador (solo visible en pendientes) */}
      {variant === 'pendiente' && propuestaLabel && (
        <div className="mb-3 flex items-center gap-2 text-[11px] text-text-secondary">
          <span className="text-text-tertiary uppercase tracking-wider">Propuesta del trabajador:</span>
          <span className={`font-semibold ${evento.severidad === 'critica' ? 'text-averia' : 'text-parada'}`}>
            {propuestaLabel}
          </span>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-3 grid gap-2">
        {variant === 'pendiente' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleConfirmar('critica')}
              className="px-3 py-2.5 rounded text-xs font-semibold bg-averia/15 border border-averia/40 text-averia hover:bg-averia/25 transition-colors"
            >
              Confirmar crítica
            </button>
            <button
              onClick={() => handleConfirmar('leve')}
              className="px-3 py-2.5 rounded text-xs font-semibold bg-parada/15 border border-parada/40 text-parada hover:bg-parada/25 transition-colors"
            >
              Confirmar leve
            </button>
          </div>
        )}
        {variant === 'critica' && (
          <button
            onClick={() => handleConfirmar('leve')}
            className="px-3 py-2.5 rounded text-xs font-semibold bg-parada/15 border border-parada/40 text-parada hover:bg-parada/25 transition-colors"
          >
            Reclasificar como leve (desbloquea máquina)
          </button>
        )}
        {variant === 'leve' && (
          <button
            onClick={() => handleConfirmar('critica')}
            className="px-3 py-2.5 rounded text-xs font-semibold bg-averia/15 border border-averia/40 text-averia hover:bg-averia/25 transition-colors"
          >
            Escalar a crítica (bloquea máquina)
          </button>
        )}
        <button
          onClick={handleResolver}
          className="px-3 py-2 rounded text-xs font-medium bg-surface-3 border border-border-default text-text-secondary hover:bg-surface-4 hover:text-text-primary transition-colors"
        >
          Marcar como resuelta
        </button>
      </div>
    </div>
  )
}

function VariantBadge({ variant, severidad }: { variant: AveriaVariant; severidad: SeveridadAveria | null }) {
  if (variant === 'pendiente') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-averia bg-averia/15 px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-averia animate-pulse" />
        Pendiente
      </span>
    )
  }
  if (variant === 'critica') {
    return (
      <span className="text-[10px] font-mono uppercase tracking-widest text-averia bg-averia/15 px-2 py-0.5 rounded">
        🔴 Crítica
      </span>
    )
  }
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest text-parada bg-parada/15 px-2 py-0.5 rounded">
      🟡 Leve {severidad ? '' : ''}
    </span>
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
