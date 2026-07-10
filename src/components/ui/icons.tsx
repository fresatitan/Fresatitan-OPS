/**
 * Set de iconos del Panel de Planta — rediseño julio 2026.
 *
 * Un solo lenguaje visual: trazo 1.7, terminaciones redondeadas, retícula
 * 24px. Sustituye a los emojis (🧹 ✅ ⚙ 👤 …) que delataban la UI como
 * "generada": los emojis renderizan distinto en cada tablet Android y no
 * comparten peso visual entre sí.
 *
 * Todos heredan `currentColor` para teñirse con el token de texto/estado.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Fresadora: husillo con fresa descendiendo sobre el bloque */
export function IconMill(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 3h8" />
      <path d="M10 3v4h4V3" />
      <path d="M12 7v3" />
      <path d="M10.5 10h3l-1.5 3z" fill="currentColor" stroke="none" />
      <path d="M4 17h16" />
      <path d="M6 17v4h12v-4" />
    </Base>
  )
}

/** Sinterizadora: haz láser enfocado sobre el lecho de polvo */
export function IconSinter(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 3h10" />
      <path d="M12 3v5" />
      <path d="M9 8l3 6 3-6" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <path d="M4 19h16" />
      <path d="M6 21.5h12" />
    </Base>
  )
}

/** Impresora 3D: pórtico con pieza por capas */
export function IconPrinter3D(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 3h16" />
      <path d="M5 3v18M19 3v18" />
      <path d="M12 7v2" />
      <path d="M9.5 13h5" />
      <path d="M8.5 16h7" />
      <path d="M7.5 19h9" />
    </Base>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12h16" />
      <path d="M14 6l6 6-6 6" />
    </Base>
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 12H4" />
      <path d="M10 6l-6 6 6 6" />
    </Base>
  )
}

export function IconClock(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Base>
  )
}

export function IconUser(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Base>
  )
}

export function IconWrench(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M13.5 6.5a4.5 4.5 0 0 1 6-4.2L16 5.8l2.2 2.2 3.5-3.5a4.5 4.5 0 0 1-6.2 6l-7.8 7.8a2 2 0 0 1-2.8-2.8z" />
    </Base>
  )
}

/** Preparación: cepillo/escobilla */
export function IconBroom(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 3l-7.5 7.5" />
      <path d="M11 10l3 3" />
      <path d="M5 21c0-4 2.5-6.5 6-8l3 3c-1.5 3.5-4 6-8 6z" />
      <path d="M7.5 15.5L10 18" />
    </Base>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5L22 20H2z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.2" r="0.4" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Base>
  )
}

export function IconX(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  )
}

/** Historial: reloj con flecha de retroceso */
export function IconHistory(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4l2.8 1.8" />
    </Base>
  )
}

export function IconPlay(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 4.5v15l12-7.5z" />
    </Base>
  )
}
