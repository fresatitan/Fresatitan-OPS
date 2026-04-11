import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { formatTime } from '../../lib/utils'
import type { UsoEquipo, Mantenimiento, Maquina } from '../../types/database'

interface UsoCardProps {
  type: 'uso'
  data: UsoEquipo
  maquina: Maquina
}

interface MantenimientoCardProps {
  type: 'mantenimiento'
  data: Mantenimiento
  maquina: Maquina
}

type Props = UsoCardProps | MantenimientoCardProps

export default function CompletedWorkCard(props: Props) {
  if (props.type === 'uso') return <UsoCard data={props.data} maquina={props.maquina} />
  return <MantenimientoCard data={props.data} maquina={props.maquina} />
}

function UsoCard({ data, maquina }: { data: UsoEquipo; maquina: Maquina }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const incidencias = useWorkflowStore((s) => s.incidencias).filter((i) => i.uso_id === data.id)
  const isActive = data.resultado === 'pendiente'

  const resultadoBg =
    data.resultado === 'ok' ? 'bg-activa-muted text-activa' :
    data.resultado === 'ko' ? 'bg-averia-muted text-averia' :
    'bg-parada-muted text-parada'

  return (
    <div className={`
      bg-surface-2 rounded-lg border overflow-hidden animate-slide-in
      ${isActive ? 'border-activa/20' : 'border-border-subtle'}
    `}>
      <div className={`h-0.5 ${isActive ? 'bg-activa' : 'bg-primary'}`} />

      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider
              ${resultadoBg}
            `}>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-activa animate-pulse" />}
              {data.resultado.toUpperCase()}
            </span>
            <span className="text-[10px] text-text-tertiary font-mono">USO</span>
          </div>
          <span className="font-mono text-xs text-primary font-medium">{maquina.codigo}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <Row label="Máquina" value={maquina.nombre} />
        <Row label="Fecha" value={data.fecha} mono />
        <Row label="Preparación" value={`${formatTime(data.hora_preparacion)} · ${getName(data.tecnico_preparacion_id)}`} highlight />
        {maquina.requiere_lanzamiento && data.tecnico_lanzamiento_id && (
          <Row label="Lanzamiento" value={getName(data.tecnico_lanzamiento_id)} />
        )}
        {data.hora_acabado && (
          <Row label="Acabado" value={`${formatTime(data.hora_acabado)} · ${getName(data.tecnico_acabado_id)}`} highlight />
        )}
        {incidencias.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] text-averia block mb-1 uppercase tracking-wider">
              Incidencias ({incidencias.length})
            </span>
            <ul className="space-y-0.5">
              {incidencias.map((i) => (
                <li key={i.id} className="text-[11px] text-text-secondary bg-averia-muted/30 border border-averia/20 rounded px-2 py-1">
                  {i.descripcion}
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.observaciones && (
          <div className="pt-1">
            <span className="text-[10px] text-text-tertiary block mb-1">Observaciones</span>
            <p className="text-[11px] text-text-secondary bg-surface-3 rounded px-2.5 py-1.5">{data.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MantenimientoCard({ data, maquina }: { data: Mantenimiento; maquina: Maquina }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  return (
    <div className="bg-surface-2 rounded-lg border border-border-subtle overflow-hidden animate-slide-in">
      <div className="h-0.5 bg-mantenimiento" />

      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider bg-mantenimiento-muted text-mantenimiento">
              {data.tipo.toUpperCase()}
            </span>
            <span className="text-[10px] text-text-tertiary font-mono">MANTENIMIENTO</span>
          </div>
          <span className="font-mono text-xs text-primary font-medium">{maquina.codigo}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <Row label="Máquina" value={maquina.nombre} />
        <Row label="Fecha" value={data.fecha} mono />
        <Row label="Encargada" value={getName(data.persona_encargada_id)} highlight />
        {data.persona_verificadora_id && (
          <Row label="Verificadora" value={getName(data.persona_verificadora_id)} />
        )}
        <div className="pt-1">
          <span className="text-[10px] text-text-tertiary block mb-1">Acción realizada</span>
          <p className="text-[11px] text-text-secondary bg-surface-3 rounded px-2.5 py-1.5">{data.accion_realizada}</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-tertiary">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${highlight ? 'text-primary font-medium' : 'text-text-secondary'}`}>
        {value}
      </span>
    </div>
  )
}
