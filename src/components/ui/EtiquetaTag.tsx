import type { Maquina } from '../../types/database'

/**
 * Placa identificadora de planta (F 1, Zr 2, SINT 4, TI 1, Imp 1…).
 *
 * Replica el cartel físico que el cliente cuelga en cada máquina: placa dorada
 * con texto oscuro y un anillo interior que sugiere metal grabado. Es EL
 * identificador que el trabajador usa para localizar la máquina — debe dominar
 * visualmente sobre el código REF y el nombre del modelo.
 */
export default function EtiquetaTag({
  etiqueta,
  size = 'md',
  muted = false,
}: {
  etiqueta: Maquina['etiqueta']
  size?: 'sm' | 'md' | 'lg'
  /** Versión apagada para máquinas fuera de servicio (retiradas) */
  muted?: boolean
}) {
  if (!etiqueta) return null

  const sizeClasses = {
    sm: 'text-[12px] px-2 py-[3px] rounded min-w-[38px]',
    md: 'text-[15px] px-2.5 py-1 rounded-md min-w-[52px]',
    lg: 'text-[21px] px-3 py-1.5 rounded-md min-w-[68px]',
  }[size]

  return (
    <span
      className={`
        inline-flex items-center justify-center whitespace-nowrap
        font-mono font-medium leading-none tracking-tight
        ring-1 ring-inset
        ${muted
          ? 'bg-surface-3 text-text-tertiary ring-border-default'
          : 'bg-primary text-[#2A1F0C] ring-[rgba(42,31,12,0.25)]'
        }
        ${sizeClasses}
      `}
    >
      {etiqueta}
    </span>
  )
}

/**
 * Título estándar de modal de máquina: placa de etiqueta + código + texto.
 * `suffix` sustituye al nombre cuando el modal es de una acción concreta
 * (p. ej. "Mantenimiento", "Preparación").
 */
export function MaquinaModalTitle({
  maquina,
  suffix,
}: {
  maquina: Pick<Maquina, 'etiqueta' | 'codigo' | 'nombre'>
  suffix?: string
}) {
  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      <EtiquetaTag etiqueta={maquina.etiqueta} size="sm" />
      <span className="truncate">
        <span className="font-mono text-[12px] text-text-tertiary mr-1.5">{maquina.codigo}</span>
        <span className="font-semibold">{suffix ?? maquina.nombre}</span>
      </span>
    </span>
  )
}
