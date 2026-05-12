import NotificationsBell from './NotificationsBell'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  /**
   * Oculta la campana de notificaciones (por defecto se muestra).
   * Usar solo en páginas donde no aplique (ej. login o panel APK).
   */
  hideNotifications?: boolean
}

export default function TopBar({ title, subtitle, actions, hideNotifications }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-1/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-text-tertiary font-mono mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {!hideNotifications && <NotificationsBell />}
      </div>
    </header>
  )
}
