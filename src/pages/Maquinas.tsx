import { useState } from 'react'
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

export default function Maquinas() {
  const { maquinas, usos, mantenimientos } = useWorkflowStore()
  const [filter, setFilter] = useState<FilterTab>('todas')
  const [viewMode, setViewMode] = useState<'grid' | 'activity'>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Maquina | null>(null)
  const [historialFor, setHistorialFor] = useState<Maquina | null>(null)

  const filtered = filter === 'todas'
    ? maquinas
    : maquinas.filter((m) => m.estado_actual === filter)

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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((m) => (
                <div key={m.id} className="relative group">
                  <MaquinaWorkCard maquina={m} />
                  <div className="absolute top-2.5 right-12 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => setHistorialFor(m)}
                      className="bg-surface-3 border border-border-default rounded p-1 text-text-tertiary hover:text-primary"
                      title="Historial de averías"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="6.5" />
                        <polyline points="8,4 8,8 10.5,9.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditTarget(m)}
                      className="bg-surface-3 border border-border-default rounded p-1 text-text-tertiary hover:text-text-primary"
                      title="Editar máquina"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 2l3 3-8 8H3v-3l8-8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-text-tertiary text-sm">No hay máquinas con estado «{filter}»</p>
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
