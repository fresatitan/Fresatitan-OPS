import { useMemo } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import MaquinaWorkCard from '../components/maquinas/MaquinaWorkCard'
import CompletedWorkCard from '../components/maquinas/CompletedWorkCard'
import EnVivoPanel from '../components/maquinas/EnVivoPanel'
import { useWorkflowStore } from '../store/workflowStore'
import { useAlertasRealtime } from '../hooks/useAlertasRealtime'
import { TIPOS_MAQUINA_PLURAL } from '../constants/estados'
import { toIsoDateTime } from '../lib/utils'
import type { Maquina, TipoMaquina } from '../types/database'

const FAMILIAS: TipoMaquina[] = ['fresadora', 'sinterizadora', 'impresora_3d']

export default function Dashboard() {
  useAlertasRealtime()
  const { maquinas, usos, mantenimientos } = useWorkflowStore()

  const visibles = useMemo(() => maquinas.filter((m) => m.activa), [maquinas])

  const disponibles = visibles.filter((m) => m.estado_actual === 'parada').length
  const enUso       = visibles.filter((m) => m.estado_actual === 'activa').length
  const averias     = visibles.filter((m) => m.estado_actual === 'avería').length

  // Agrupa máquinas por familia (siempre las tres, aunque alguna esté vacía)
  const porFamilia = useMemo(() => {
    const groups: Record<TipoMaquina, Maquina[]> = {
      fresadora: [],
      sinterizadora: [],
      impresora_3d: [],
    }
    for (const m of visibles) groups[m.tipo].push(m)
    return groups
  }, [visibles])

  // Últimos 4 trabajos completados
  const recentWork = useMemo(() => {
    return [
      ...usos.filter((u) => u.resultado !== 'pendiente').map((u) => ({
        type: 'uso' as const,
        data: u,
        time: toIsoDateTime(u.fecha, u.hora_acabado ?? u.hora_preparacion),
        maquina_id: u.maquina_id,
      })),
      ...mantenimientos.map((m) => ({
        type: 'mantenimiento' as const,
        data: m,
        time: `${m.fecha}T00:00:00`,
        maquina_id: m.maquina_id,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4)
  }, [usos, mantenimientos])

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <Layout>
      <TopBar
        title="Dashboard"
        subtitle={today}
        actions={
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-text-tertiary px-2 py-1 rounded bg-surface-3 border border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-activa animate-pulse" />
            ONLINE
          </span>
        }
      />

      <main className="p-4 lg:p-6 space-y-6">
        {/* KPIs — 3 métricas esenciales (sin subtexto ni adornos) */}
        <div className="grid grid-cols-3 gap-3">
          <KpiBox label="Disponibles" value={disponibles} tone="activa" />
          <KpiBox label="En uso" value={enUso} tone="parada" />
          <KpiBox
            label="Averías"
            value={averias}
            tone={averias > 0 ? 'averia' : 'neutral'}
          />
        </div>

        {/* En vivo — solo si hay algo en curso */}
        {enUso > 0 && <EnVivoPanel />}

        {/* Máquinas agrupadas por familia — las tres siempre visibles */}
        {FAMILIAS.map((familia) => (
          <FamilySection
            key={familia}
            familia={familia}
            maquinas={porFamilia[familia]}
          />
        ))}

        {/* Últimos trabajos — compacto, sin section header pesado */}
        {recentWork.length > 0 && (
          <section>
            <SectionTitle text="Últimos trabajos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {recentWork.map((item) => {
                const maquina = maquinas.find((m) => m.id === item.maquina_id)
                if (!maquina) return null
                return (
                  <CompletedWorkCard
                    key={`${item.type}-${item.data.id}`}
                    type={item.type}
                    data={item.data as never}
                    maquina={maquina}
                  />
                )
              })}
            </div>
          </section>
        )}
      </main>
    </Layout>
  )
}

// =============================================================================
// Sub-componentes
// =============================================================================

function KpiBox({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'activa' | 'parada' | 'averia' | 'neutral'
}) {
  const toneMap = {
    activa: { border: 'border-activa/25', color: 'text-activa' },
    parada: { border: 'border-parada/25', color: 'text-parada' },
    averia: { border: 'border-averia/30', color: 'text-averia' },
    neutral: { border: 'border-border-subtle', color: 'text-text-primary' },
  }
  const t = toneMap[tone]
  return (
    <div className={`bg-surface-2 border ${t.border} rounded-lg px-4 py-3`}>
      <div className="text-[10px] text-text-tertiary uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-mono font-bold tabular-nums mt-1 leading-none ${t.color}`}>
        {value}
      </div>
    </div>
  )
}

function FamilySection({
  familia,
  maquinas,
}: {
  familia: TipoMaquina
  maquinas: Maquina[]
}) {
  const label = TIPOS_MAQUINA_PLURAL[familia]
  const count = maquinas.length

  return (
    <section>
      <SectionTitle text={label} count={count} />

      {count === 0 ? (
        <div className="bg-surface-2 border border-dashed border-border-subtle rounded-lg px-4 py-6 text-center">
          <p className="text-xs text-text-tertiary">
            Sin {label.toLowerCase()} dadas de alta todavía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {maquinas.map((m) => (
            <MaquinaWorkCard key={m.id} maquina={m} />
          ))}
        </div>
      )}
    </section>
  )
}

function SectionTitle({ text, count }: { text: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="text-sm font-semibold text-text-primary">{text}</h3>
      {count !== undefined && (
        <span className="text-xs font-mono text-text-tertiary">{count}</span>
      )}
      <div className="flex-1 h-px bg-border-subtle ml-2" />
    </div>
  )
}
