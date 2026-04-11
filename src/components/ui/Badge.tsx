import type { EstadoMaquina } from '../../types/database'

const STATE_STYLES: Record<EstadoMaquina, { dot: string; bg: string; text: string; animate?: string }> = {
  activa: { dot: 'bg-activa', bg: 'bg-activa-muted', text: 'text-activa' },
  parada: { dot: 'bg-parada', bg: 'bg-parada-muted', text: 'text-parada' },
  'avería': { dot: 'bg-averia', bg: 'bg-averia-muted', text: 'text-averia', animate: 'animate-averia' },
  mantenimiento: { dot: 'bg-mantenimiento', bg: 'bg-mantenimiento-muted', text: 'text-mantenimiento' },
  inactiva: { dot: 'bg-inactiva', bg: 'bg-inactiva-muted', text: 'text-inactiva' },
}

interface BadgeProps {
  estado: EstadoMaquina
  size?: 'sm' | 'md'
}

export default function Badge({ estado, size = 'md' }: BadgeProps) {
  const style = STATE_STYLES[estado]
  const label = estado === 'avería' ? 'AVERÍA' : estado.toUpperCase()

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-[11px] gap-1.5'

  return (
    <span
      className={`
        inline-flex items-center font-mono font-medium tracking-wider rounded
        ${style.bg} ${style.text} ${sizeClasses} ${style.animate ?? ''}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
      {label}
    </span>
  )
}
