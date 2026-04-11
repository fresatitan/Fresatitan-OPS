interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-1/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-text-tertiary font-mono mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
