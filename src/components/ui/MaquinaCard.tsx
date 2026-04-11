import Badge from './Badge'
import type { EstadoMaquina } from '../../types/database'

interface MaquinaCardProps {
  codigo: string
  nombre: string
  estado: EstadoMaquina
  ubicacion?: string
  operario?: string
  proceso?: string
  tiempoEstado?: string
}

export default function MaquinaCard({
  codigo,
  nombre,
  estado,
  ubicacion,
  operario,
  proceso,
  tiempoEstado,
}: MaquinaCardProps) {
  const isAveria = estado === 'avería'

  return (
    <div className={`
      bg-surface-2 rounded-lg border transition-all duration-200
      ${isAveria
        ? 'border-averia/30 animate-averia'
        : 'border-border-subtle hover:border-border-default'
      }
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-primary font-medium">{codigo}</span>
          <span className="text-[10px] text-text-tertiary">|</span>
          <span className="text-sm text-text-primary font-medium truncate">{nombre}</span>
        </div>
        <Badge estado={estado} size="sm" />
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {ubicacion && (
          <Row label="Ubicación" value={ubicacion} />
        )}
        {operario && (
          <Row label="Operario" value={operario} />
        )}
        {proceso && (
          <Row label="Proceso" value={proceso} />
        )}
        {tiempoEstado && (
          <Row label="En estado" value={tiempoEstado} mono />
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-tertiary">{label}</span>
      <span className={`text-text-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
