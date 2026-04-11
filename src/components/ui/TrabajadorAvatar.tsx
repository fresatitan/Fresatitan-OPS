import type { Trabajador } from '../../store/trabajadoresStore'

interface Props {
  trabajador: Pick<Trabajador, 'nombre' | 'apellidos'>
  size?: 'sm' | 'md' | 'lg' | 'xl'
  selected?: boolean
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
} as const

export default function TrabajadorAvatar({ trabajador, size = 'md', selected = false }: Props) {
  const initial = trabajador.nombre.charAt(0).toUpperCase()
  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        rounded-full flex items-center justify-center font-bold shrink-0
        transition-all duration-200
        ${selected
          ? 'bg-primary text-text-inverse shadow-[0_0_0_3px_rgba(208,154,64,0.3)]'
          : 'bg-primary-muted text-primary'
        }
      `}
    >
      {initial}
    </div>
  )
}
