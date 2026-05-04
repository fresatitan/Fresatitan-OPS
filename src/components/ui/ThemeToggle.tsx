import { useThemeStore } from '../../store/themeStore'

interface Props {
  /** Variante: "compact" para sidebar admin, "panel" para tablet en /panel */
  variant?: 'compact' | 'panel'
}

export default function ThemeToggle({ variant = 'compact' }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)

  const isDark = theme === 'dark'
  const label = isDark ? 'Modo claro' : 'Modo oscuro'

  if (variant === 'panel') {
    return (
      <button
        onClick={toggle}
        title={label}
        aria-label={label}
        className="
          inline-flex items-center justify-center w-10 h-10 rounded-full
          bg-surface-3 border border-border-subtle text-text-secondary
          hover:text-primary hover:border-primary/40 transition-colors
        "
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </button>
    )
  }

  // compact (sidebar admin)
  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className="
        flex items-center gap-2.5 w-full px-3 py-2 rounded text-[13px] font-medium
        text-text-secondary hover:text-text-primary hover:bg-surface-3
        transition-colors
      "
    >
      {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      <span>{label}</span>
    </button>
  )
}

function SunIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
  )
}

function MoonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
