import type { Maquina } from '../../types/database'

/**
 * Placa identificadora de planta (F 1, Zr 2, SINT 4, TI 1, Imp 1…).
 *
 * Replica el cartel físico que el cliente cuelga en cada máquina: fondo dorado
 * sólido con texto oscuro, imposible de confundir. Es EL identificador que el
 * trabajador usa para localizar la máquina — debe dominar visualmente sobre
 * el código REF y el nombre del modelo.
 */
export default function EtiquetaTag({
  etiqueta,
  size = 'md',
}: {
  etiqueta: Maquina['etiqueta']
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!etiqueta) return null

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 rounded min-w-[36px]',
    md: 'text-base px-2.5 py-1 rounded-md min-w-[52px]',
    lg: 'text-2xl px-3.5 py-1.5 rounded-lg min-w-[72px] shadow-md shadow-primary/25',
  }[size]

  return (
    <span
      className={`
        inline-flex items-center justify-center whitespace-nowrap
        bg-primary text-text-inverse font-mono font-black leading-none tracking-tight
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
    <span className="inline-flex items-center gap-2">
      <EtiquetaTag etiqueta={maquina.etiqueta} size="sm" />
      <span>{maquina.codigo} · {suffix ?? maquina.nombre}</span>
    </span>
  )
}
