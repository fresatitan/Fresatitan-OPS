interface StatCardProps {
  label: string
  value: string | number
  subvalue?: string
  accent?: string
  icon?: React.ReactNode
}

export default function StatCard({ label, value, subvalue, accent = 'border-border-default', icon }: StatCardProps) {
  return (
    <div className={`
      bg-surface-2 border ${accent} rounded-lg p-4
      card-interactive group
    `}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-text-tertiary">
          {label}
        </span>
        {icon && (
          <span className="text-text-tertiary group-hover:text-primary transition-colors">
            {icon}
          </span>
        )}
      </div>
      <div className="text-metric text-3xl text-text-primary leading-none">
        {value}
      </div>
      {subvalue && (
        <p className="text-[11px] text-text-tertiary mt-2 font-mono">{subvalue}</p>
      )}
    </div>
  )
}
