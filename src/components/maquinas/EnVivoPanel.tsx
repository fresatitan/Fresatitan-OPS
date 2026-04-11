import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { useElapsedTime } from '../../hooks/useElapsedTime'
import { toIsoDateTime } from '../../lib/utils'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import type { Maquina, UsoEquipo } from '../../types/database'

/**
 * Panel "En vivo" del dashboard admin — la primera cosa que ve Roser al entrar.
 * Muestra cada máquina actualmente en uso con su técnico y un cronómetro grande.
 * Se actualiza en tiempo real vía Zustand (y por Supabase Realtime cuando se conecte).
 */
export default function EnVivoPanel() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)

  const enVivo = usos
    .filter((u) => u.resultado === 'pendiente')
    .map((u) => ({ uso: u, maquina: maquinas.find((m) => m.id === u.maquina_id)! }))
    .filter((x) => x.maquina)

  return (
    <section className="bg-surface-2 rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-4 py-3 bg-surface-3/50 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-activa opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-activa" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-primary">En vivo</h3>
          <span className="text-[10px] font-mono text-text-tertiary bg-surface-4 px-1.5 py-0.5 rounded">
            {enVivo.length}
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-tertiary">Actualizando en tiempo real</span>
      </div>

      {enVivo.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-text-tertiary">Ninguna máquina en uso ahora mismo.</p>
          <p className="text-[11px] text-text-tertiary mt-1">Cuando alguien empiece un trabajo aparecerá aquí.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {enVivo.map(({ uso, maquina }) => (
            <LiveRow key={uso.id} uso={uso} maquina={maquina} />
          ))}
        </div>
      )}
    </section>
  )
}

function LiveRow({ uso, maquina }: { uso: UsoEquipo; maquina: Maquina }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))

  const tecnicoPrep = trabajadores.find((t) => t.id === uso.tecnico_preparacion_id)
  const tecnicoLanz = uso.tecnico_lanzamiento_id
    ? trabajadores.find((t) => t.id === uso.tecnico_lanzamiento_id)
    : null

  return (
    <div className="px-4 py-3 flex items-center gap-4 hover:bg-surface-3/40 transition-colors">
      {/* Código + nombre */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-bold">{maquina.codigo}</span>
          <span className="text-[9px] font-mono text-text-tertiary bg-surface-4 px-1 rounded uppercase">
            {maquina.tipo}
          </span>
        </div>
        <div className="text-sm text-text-primary font-medium truncate mt-0.5">{maquina.nombre}</div>
      </div>

      {/* Técnicos */}
      <div className="flex items-center gap-2">
        {tecnicoPrep && (
          <div className="flex items-center gap-1.5" title={`Preparación: ${getName(tecnicoPrep.id)}`}>
            <TrabajadorAvatar trabajador={tecnicoPrep} size="sm" />
          </div>
        )}
        {tecnicoLanz && (
          <>
            <span className="text-text-tertiary text-[10px]">→</span>
            <div className="flex items-center gap-1.5" title={`Lanzamiento: ${getName(tecnicoLanz.id)}`}>
              <TrabajadorAvatar trabajador={tecnicoLanz} size="sm" />
            </div>
          </>
        )}
      </div>

      {/* Cronómetro */}
      <div className="text-right shrink-0 w-24">
        <div className="text-[9px] font-mono text-text-tertiary uppercase tracking-wider">Tiempo</div>
        <div className="text-lg font-mono font-bold text-activa tabular-nums leading-tight">{elapsed}</div>
      </div>

      {/* Pulse */}
      <div className="shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-activa opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-activa" />
        </span>
      </div>
    </div>
  )
}
