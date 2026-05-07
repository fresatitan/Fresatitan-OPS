import { useMemo, useState } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import MaquinaWorkCard from '../components/maquinas/MaquinaWorkCard'
import CompletedWorkCard from '../components/maquinas/CompletedWorkCard'
import MaquinaFormModal from '../components/maquinas/MaquinaFormModal'
import HistorialAveriasModal from '../components/maquinas/HistorialAveriasModal'
import { useWorkflowStore } from '../store/workflowStore'
import { toIsoDateTime } from '../lib/utils'
import type { Maquina } from '../types/database'

type FilterTab = 'todas' | 'activa' | 'parada' | 'mantenimiento' | 'avería' | 'inactiva'

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'parada', label: 'Disponibles' },
  { value: 'activa', label: 'En uso' },
  { value: 'mantenimiento', label: 'Mant.' },
  { value: 'avería', label: 'Avería' },
  { value: 'inactiva', label: 'Inactivas' },
]

// Cinco grupos visuales en el orden en el que se enseñan al admin
type GrupoKey =
  | 'fresadora_metal'
  | 'fresadora_seco'
  | 'fresadora_humedo'
  | 'sinterizadora'
  | 'impresora_3d'

interface Grupo {
  key: GrupoKey
  label: string
  /** Texto explicativo bajo el título */
  hint?: string
}

const GRUPOS: Grupo[] = [
  { key: 'fresadora_metal',  label: 'Fresadoras · Metal',   hint: 'CNC con lanzamiento manual (Fanuc)' },
  { key: 'fresadora_seco',   label: 'Fresadoras · Seco',    hint: 'UP3D, P53' },
  { key: 'fresadora_humedo', label: 'Fresadoras · Húmedo',  hint: 'Biomill, DS UP3D' },
  { key: 'sinterizadora',    label: 'Sinterizadoras',       hint: 'Trumpf, Sisma' },
  { key: 'impresora_3d',     label: 'Impresoras 3D' },
]

function grupoDe(m: Maquina): GrupoKey {
  if (m.tipo === 'fresadora') {
    if (m.subtipo === 'metal')  return 'fresadora_metal'
    if (m.subtipo === 'humedo') return 'fresadora_humedo'
    return 'fresadora_seco'   // default si subtipo es null/seco
  }
  if (m.tipo === 'sinterizadora') return 'sinterizadora'
  return 'impresora_3d'
}

export default function Maquinas() {
  const { maquinas, usos, mantenimientos } = useWorkflowStore()
  const [filter, setFilter] = useState<FilterTab>('todas')
  const [viewMode, setViewMode] = useState<'grid' | 'activity'>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Maquina | null>(null)
  const [historialFor, setHistorialFor] = useState<Maquina | null>(null)

  const filtered = useMemo(
    () => filter === 'todas'
      ? maquinas
      : maquinas.filter((m) => m.estado_actual === filter),
    [maquinas, filter],
  )

  const porGrupo = useMemo(() => {
    const map: Record<GrupoKey, Maquina[]> = {
      fresadora_metal:  [],
      fresadora_seco:   [],
      fresadora_humedo: [],
      sinterizadora:    [],
      impresora_3d:     [],
    }
    // Ordena por código dentro de cada grupo para una lectura predecible
    for (const m of [...filtered].sort((a, b) => a.codigo.localeCompare(b.codigo))) {
      map[grupoDe(m)].push(m)
    }
    return map
  }, [filtered])

  const allWork = [
    ...usos.map((u) => ({
      type: 'uso' as const,
      data: u,
      time: toIsoDateTime(u.fecha, u.hora_preparacion),
      maquina_id: u.maquina_id,
    })),
    ...mantenimientos.map((m) => ({
      type: 'mantenimiento' as const,
      data: m,
      time: `${m.fecha}T00:00:00`,
      maquina_id: m.maquina_id,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return (
    <Layout>
      <TopBar
        title="Máquinas"
        subtitle={`${maquinas.length} registradas · ${filtered.length} visibles`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-text-inverse hover:bg-primary-light transition-colors"
            >
              + Nueva máquina
            </button>
            <div className="flex items-center gap-1 bg-surface-3 rounded-lg p-0.5 border border-border-subtle">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-surface-4 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Máquinas
              </button>
              <button
                onClick={() => setViewMode('activity')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === 'activity' ? 'bg-surface-4 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Actividad
                {allWork.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-mono">
                    {allWork.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        }
      />

      <main className="p-4 lg:p-6">
        {viewMode === 'grid' ? (
          <>
            {/* Filtros por estado */}
            <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
              {TABS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`
                    px-3 py-1.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors
                    ${filter === value
                      ? 'bg-primary-muted border-primary/30 text-primary'
                      : 'bg-surface-3 border-border-subtle text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Grid agrupado por sub-familia */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-tertiary text-sm">No hay máquinas con estado «{filter}»</p>
              </div>
            ) : (
              <div className="space-y-7">
                {GRUPOS.map(({ key, label, hint }) => {
                  const lista = porGrupo[key]
                  if (lista.length === 0) return null
                  return (
                    <section key={key}>
                      <GroupHeader label={label} hint={hint} count={lista.length} grupoKey={key} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {lista.map((m) => (
                          <MaquinaWorkCard
                            key={m.id}
                            maquina={m}
                            onHistorial={() => setHistorialFor(m)}
                            onEdit={() => setEditTarget(m)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary flex items-center gap-2">
                Registro de trabajos
                <span className="h-px flex-1 bg-border-subtle" />
              </h3>
            </div>

            {allWork.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-tertiary text-sm">Aún no se ha registrado ningún trabajo.</p>
                <p className="text-text-tertiary text-xs mt-1">Inicia un uso desde cualquier máquina.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
                {allWork.map((item) => {
                  const maquina = maquinas.find((m) => m.id === item.maquina_id)!
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
            )}
          </>
        )}
      </main>

      <MaquinaFormModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editTarget && (
        <MaquinaFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
        />
      )}
      {historialFor && (
        <HistorialAveriasModal
          open={!!historialFor}
          onClose={() => setHistorialFor(null)}
          maquina={historialFor}
        />
      )}
    </Layout>
  )
}

// =============================================================================
// Cabecera de grupo
// =============================================================================
function GroupHeader({
  label,
  hint,
  count,
  grupoKey,
}: {
  label: string
  hint?: string
  count: number
  grupoKey: GrupoKey
}) {
  // Color de acento por familia/sub-familia
  const acento =
    grupoKey === 'fresadora_metal'  ? 'border-l-mantenimiento'
    : grupoKey === 'fresadora_seco' ? 'border-l-primary'
    : grupoKey === 'fresadora_humedo' ? 'border-l-activa'
    : grupoKey === 'sinterizadora'  ? 'border-l-parada'
    : 'border-l-text-tertiary'   // impresora_3d

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`pl-3 border-l-4 ${acento} flex items-baseline gap-2`}>
        <h3 className="text-sm font-bold text-text-primary">{label}</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-3 text-text-tertiary">
          {count}
        </span>
      </div>
      {hint && (
        <span className="text-[11px] text-text-tertiary italic hidden sm:inline">· {hint}</span>
      )}
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  )
}
