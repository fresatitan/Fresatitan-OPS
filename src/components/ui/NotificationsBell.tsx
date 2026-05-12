import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, type Notificacion, type NotificacionTipo } from '../../hooks/useNotifications'
import { useNotificationsReadStore } from '../../store/notificationsReadStore'

/**
 * Campana de notificaciones del admin (esquina superior derecha del TopBar).
 *
 * Funcionamiento:
 *   · El hook `useNotifications` deriva la lista a partir del estado actual
 *     del workflow (averías abiertas, mantenimientos sin finalizar, planes
 *     vencidos, usos KO).
 *   · El badge muestra el contador de no leídas (rojo si hay alguna crítica
 *     o alta, ámbar si solo hay medias/info).
 *   · Al clicar una notificación se navega a su destino (/alertas, /maquinas)
 *     y queda marcada como leída en localStorage.
 *   · Hay un botón "Marcar todas como leídas" para limpiar el contador.
 */
export default function NotificationsBell() {
  const navigate = useNavigate()
  const notifications = useNotifications()
  const readIds = useNotificationsReadStore((s) => s.readIds)
  const markRead = useNotificationsReadStore((s) => s.markRead)
  const markManyRead = useNotificationsReadStore((s) => s.markManyRead)

  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cerrar el dropdown al hacer click fuera o pulsar Escape
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const noLeidas = useMemo(
    () => notifications.filter((n) => !readIds[n.id]),
    [notifications, readIds],
  )

  const tieneCritica = noLeidas.some((n) => n.severidad === 'critica')
  const tieneAlta = noLeidas.some((n) => n.severidad === 'alta')

  // Color del badge según la severidad más alta detectada
  const badgeColor = tieneCritica
    ? 'bg-averia'
    : tieneAlta
    ? 'bg-parada'
    : 'bg-mantenimiento'

  const handleNotificationClick = (n: Notificacion) => {
    markRead(n.id)
    setOpen(false)
    navigate(n.destino)
  }

  const handleMarkAllRead = () => {
    markManyRead(noLeidas.map((n) => n.id))
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones (${noLeidas.length} sin leer)`}
        className={`
          relative w-9 h-9 rounded-lg flex items-center justify-center
          border border-border-subtle bg-surface-2 text-text-secondary
          hover:bg-surface-3 hover:text-text-primary hover:border-border-default
          transition-colors
          ${open ? 'bg-surface-3 text-text-primary border-border-default' : ''}
        `}
      >
        <BellIcon />
        {noLeidas.length > 0 && (
          <span
            className={`
              absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
              rounded-full flex items-center justify-center
              text-white text-[10px] font-mono font-bold
              ${badgeColor}
              ${tieneCritica ? 'animate-pulse' : ''}
            `}
          >
            {noLeidas.length > 99 ? '99+' : noLeidas.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="
            absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)]
            rounded-xl border border-border-default bg-surface-2 shadow-xl
            overflow-hidden z-50
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Notificaciones
              </div>
              <div className="text-[11px] text-text-tertiary">
                {noLeidas.length === 0
                  ? notifications.length === 0
                    ? 'Sin notificaciones'
                    : 'Todo al día — no hay nuevas'
                  : `${noLeidas.length} sin leer · ${notifications.length} en total`}
              </div>
            </div>
            {noLeidas.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="
                  shrink-0 text-[10px] uppercase tracking-wider font-semibold
                  text-primary hover:text-primary-light transition-colors
                "
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-[480px] overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-sm text-text-secondary">Todo está en orden</p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Sin averías ni revisiones pendientes
                </p>
              </li>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  leida={!!readIds[n.id]}
                  onClick={() => handleNotificationClick(n)}
                />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Item individual
// =============================================================================
function NotificationItem({
  notif,
  leida,
  onClick,
}: {
  notif: Notificacion
  leida: boolean
  onClick: () => void
}) {
  const tiempoRel = useMemo(() => relativeTime(notif.timestamp), [notif.timestamp])
  const accentClass = tipoAccent(notif.tipo)

  return (
    <li
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`
        relative px-4 py-3 border-b border-border-subtle cursor-pointer
        transition-colors
        ${leida
          ? 'bg-surface-2 hover:bg-surface-3'
          : 'bg-surface-3 hover:bg-surface-4'
        }
      `}
    >
      {/* Acento lateral izquierdo, color único por tipo de notificación */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass.bar}`} />

      <div className="pl-2 flex items-start gap-3">
        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${accentClass.bg}`}>
          <NotificationIcon tipo={notif.tipo} colorClass={accentClass.text} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-xs font-semibold ${leida ? 'text-text-secondary' : 'text-text-primary'}`}>
              {notif.titulo}
            </div>
            <span className="shrink-0 text-[10px] font-mono text-text-tertiary">{tiempoRel}</span>
          </div>
          <p className="text-[11px] text-text-tertiary leading-snug mt-0.5 line-clamp-2">
            {notif.detalle}
          </p>
        </div>
        {!leida && (
          <span className={`shrink-0 mt-1 w-2 h-2 rounded-full ${accentClass.dot}`} />
        )}
      </div>
    </li>
  )
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Color único por tipo de notificación. Cada categoría tiene su paleta para
 * que el admin las distinga de un vistazo en el dropdown.
 *
 *   · Averías (pendiente / crítica) → ROJO (averia)
 *   · Averías leves                       → ROSA (averia con baja opacidad)
 *   · Revisiones de mantenimiento vencidas → NARANJA (parada)
 *   · Usos cerrados con incidencia (KO)    → DORADO (primary, color de marca)
 *   · Mantenimientos abiertos              → AZUL (mantenimiento)
 *
 * Esto independiza el color del item del campo `severidad` (que se usa solo
 * para el color del badge contador global).
 */
function tipoAccent(tipo: Notificacion['tipo']) {
  switch (tipo) {
    case 'averia_pendiente':
    case 'averia_critica':
      return {
        bar: 'bg-averia',
        bg: 'bg-averia/15',
        text: 'text-averia',
        dot: 'bg-averia',
      }
    case 'averia_leve':
      return {
        bar: 'bg-averia/60',
        bg: 'bg-averia/8',
        text: 'text-averia',
        dot: 'bg-averia/70',
      }
    case 'revision_vencida':
      return {
        bar: 'bg-parada',
        bg: 'bg-parada/15',
        text: 'text-parada',
        dot: 'bg-parada',
      }
    case 'uso_ko':
      return {
        bar: 'bg-primary',
        bg: 'bg-primary-muted',
        text: 'text-primary',
        dot: 'bg-primary',
      }
    case 'mantenimiento_abierto':
    default:
      return {
        bar: 'bg-mantenimiento',
        bg: 'bg-mantenimiento/15',
        text: 'text-mantenimiento',
        dot: 'bg-mantenimiento',
      }
  }
}

function NotificationIcon({ tipo, colorClass }: { tipo: NotificacionTipo; colorClass: string }) {
  switch (tipo) {
    case 'averia_pendiente':
    case 'averia_critica':
    case 'averia_leve':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'mantenimiento_abierto':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case 'revision_vencida':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'uso_ko':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
  }
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/**
 * Texto relativo "hace X" en español. Cortar si fecha futura (caso raro) o
 * muy reciente.
 */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const ms = Date.now() - t
  if (ms < 60_000) return 'ahora'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mes`
  return `${Math.floor(mo / 12)}a`
}
