import { useMemo } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import MaquinaWorkCard from '../components/maquinas/MaquinaWorkCard'
import CompletedWorkCard from '../components/maquinas/CompletedWorkCard'
import EnVivoPanel from '../components/maquinas/EnVivoPanel'
import { IconMill, IconSinter, IconPrinter3D } from '../components/ui/icons'
import { useWorkflowStore } from '../store/workflowStore'
import { useAlertasRealtime } from '../hooks/useAlertasRealtime'
import { TIPOS_MAQUINA_PLURAL, SUBTIPOS_FRESADORA, SUBTIPOS_SINTERIZADORA } from '../constants/estados'
import { toIsoDateTime } from '../lib/utils'
import type { Maquina, TipoMaquina, SubtipoFresadora, SubtipoSinterizadora } from '../types/database'

const FAMILIAS: TipoMaquina[] = ['fresadora', 'sinterizadora', 'impresora_3d']
const SUBFAMILIAS_FRESADORA: SubtipoFresadora[] = ['metal', 'seco', 'humedo']
const SUBFAMILIAS_SINTERIZADORA: SubtipoSinterizadora[] = ['cr_co', 'titanio']

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

      <main className="p-4 lg:p-6 space-y-8">
        {/* KPIs — 3 métricas esenciales */}
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
    activa: { dot: 'bg-activa', color: 'text-activa' },
    parada: { dot: 'bg-parada', color: 'text-parada' },
    averia: { dot: 'bg-averia', color: 'text-averia' },
    neutral: { dot: 'bg-border-strong', color: 'text-text-primary' },
  }
  const t = toneMap[tone]
  return (
    <div className="bg-surface-2 border border-border-subtle rounded-lg px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
        <span className="text-[10px] text-text-tertiary uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-3xl font-mono font-bold tabular-nums mt-1.5 leading-none ${t.color}`}>
        {value}
      </div>
    </div>
  )
}

// Icono y acentos por familia
const FAMILIA_META: Record<TipoMaquina, { Icon: typeof IconMill }> = {
  fresadora: { Icon: IconMill },
  sinterizadora: { Icon: IconSinter },
  impresora_3d: { Icon: IconPrinter3D },
}

// Acento de raíl por sub-familia (fresadoras mantienen su código de color
// histórico; sinterizadoras estrenan el suyo)
const SUBFAMILIA_ACCENT: Record<string, { rail: string; dot: string }> = {
  metal:   { rail: 'border-l-mantenimiento/40', dot: 'bg-mantenimiento' },
  seco:    { rail: 'border-l-primary/50',       dot: 'bg-primary' },
  humedo:  { rail: 'border-l-activa/40',        dot: 'bg-activa' },
  cr_co:   { rail: 'border-l-mantenimiento/40', dot: 'bg-mantenimiento' },
  titanio: { rail: 'border-l-activa/40',        dot: 'bg-activa' },
  none:    { rail: 'border-l-border-default',   dot: 'bg-border-strong' },
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
  const { Icon } = FAMILIA_META[familia]

  const libres  = maquinas.filter((m) => m.estado_actual === 'parada').length
  const enUso   = maquinas.filter((m) => m.estado_actual === 'activa').length
  const alertas = maquinas.filter(
    (m) => m.estado_actual === 'avería' || m.estado_actual === 'mantenimiento',
  ).length

  return (
    <section>
      {/* Cabecera de familia — banda con icono, título grande y resumen de estado.
          Es el nivel 1 de la jerarquía: debe verse de un vistazo dónde empieza
          cada familia al hacer scroll. */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border-default">
        <div className="w-9 h-9 rounded-lg bg-primary-muted text-primary-ink flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <h2 className="text-[18px] font-bold text-text-primary tracking-tight leading-none">
            {label}
          </h2>
          <span className="text-[11.5px] font-mono text-text-tertiary tabular-nums">{count}</span>
        </div>
        {count > 0 && (
          <div className="hidden sm:flex items-center gap-3.5">
            <MiniStat value={libres} label="libres" dot="bg-activa" />
            <MiniStat value={enUso} label="en uso" dot="bg-parada" />
            <MiniStat value={alertas} label="avisos" dot="bg-averia" />
          </div>
        )}
      </div>

      {count === 0 ? (
        <div className="bg-surface-2 border border-dashed border-border-subtle rounded-lg px-4 py-6 text-center">
          <p className="text-xs text-text-tertiary">
            Sin {label.toLowerCase()} dadas de alta todavía.
          </p>
        </div>
      ) : familia === 'fresadora' ? (
        <div className="space-y-6">
          {SUBFAMILIAS_FRESADORA.map((sub) => (
            <SubFamilyGroup
              key={sub}
              maquinas={maquinas.filter((m) => m.subtipo === sub)}
              accentKey={sub}
              short={SUBTIPOS_FRESADORA[sub].short}
              description={SUBTIPOS_FRESADORA[sub].description}
            />
          ))}
          <SubFamilyGroup
            maquinas={maquinas.filter((m) => !m.subtipo)}
            accentKey="none"
            short="SIN SUB-FAMILIA"
            description=""
          />
        </div>
      ) : familia === 'sinterizadora' ? (
        <div className="space-y-6">
          {SUBFAMILIAS_SINTERIZADORA.map((sub) => (
            <SubFamilyGroup
              key={sub}
              maquinas={maquinas.filter((m) => m.subtipo === sub)}
              accentKey={sub}
              short={SUBTIPOS_SINTERIZADORA[sub].short}
              description={SUBTIPOS_SINTERIZADORA[sub].description}
            />
          ))}
          <SubFamilyGroup
            maquinas={maquinas.filter((m) => !m.subtipo || (m.subtipo !== 'cr_co' && m.subtipo !== 'titanio'))}
            accentKey="none"
            short="SIN SUB-FAMILIA"
            description=""
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...maquinas]
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((m) => (
              <MaquinaWorkCard key={m.id} maquina={m} />
            ))}
        </div>
      )}
    </section>
  )
}

function MiniStat({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${value > 0 ? dot : 'bg-border-strong'}`} />
      <span className="text-[12px] font-mono tabular-nums text-text-primary">{value}</span>
      <span className="text-[10.5px] text-text-tertiary">{label}</span>
    </span>
  )
}

/**
 * Grupo de sub-familia: cabecera con punto de color + raíl vertical del mismo
 * acento recorriendo todo el grupo. El raíl hace que al escanear la página se
 * distinga al instante dónde empieza y acaba cada sub-familia (nivel 2).
 */
function SubFamilyGroup({
  maquinas,
  accentKey,
  short,
  description,
}: {
  maquinas: Maquina[]
  accentKey: string
  short: string
  description: string
}) {
  if (maquinas.length === 0) return null
  const accent = SUBFAMILIA_ACCENT[accentKey] ?? SUBFAMILIA_ACCENT.none
  const lista = [...maquinas].sort((a, b) => a.codigo.localeCompare(b.codigo))

  return (
    <div className={`pl-4 border-l-2 ${accent.rail}`}>
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className={`w-2 h-2 rounded-full self-center ${accent.dot}`} />
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-primary">
          {short}
        </span>
        <span className="text-[10.5px] font-mono text-text-tertiary tabular-nums">{lista.length}</span>
        {description && (
          <span className="text-[11px] text-text-tertiary hidden sm:inline">· {description}</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.map((m) => (
          <MaquinaWorkCard key={m.id} maquina={m} />
        ))}
      </div>
    </div>
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
