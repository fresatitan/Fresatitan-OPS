import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import StatCard from '../components/ui/StatCard'
import MaquinaWorkCard from '../components/maquinas/MaquinaWorkCard'
import CompletedWorkCard from '../components/maquinas/CompletedWorkCard'
import EnVivoPanel from '../components/maquinas/EnVivoPanel'
import { useWorkflowStore } from '../store/workflowStore'
import { useAlertasRealtime } from '../hooks/useAlertasRealtime'
import { toIsoDateTime } from '../lib/utils'

export default function Dashboard() {
  useAlertasRealtime()
  const { maquinas, usos, mantenimientos } = useWorkflowStore()

  const visibles = maquinas.filter((m) => m.activa)

  const enUso   = visibles.filter((m) => m.estado_actual === 'activa').length
  const averias = visibles.filter((m) => m.estado_actual === 'avería').length
  const enMant  = visibles.filter((m) => m.estado_actual === 'mantenimiento').length
  const disponibles = visibles.filter((m) => m.estado_actual === 'parada').length

  const usosHoy = usos.filter((u) => u.fecha === new Date().toISOString().slice(0, 10)).length

  // Últimos 5 trabajos completados (usos + mantenimientos)
  const recentWork = [
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
    .slice(0, 5)

  return (
    <Layout>
      <TopBar
        title="Dashboard"
        subtitle={`${visibles.length} máquinas activas · ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-text-tertiary px-2 py-1 rounded bg-surface-3 border border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-activa animate-pulse" />
            ONLINE
          </span>
        }
      />

      <main className="p-4 lg:p-6 space-y-6">
        {/* En vivo — supervisión en tiempo real */}
        <EnVivoPanel />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          <StatCard
            label="Disponibles"
            value={disponibles}
            subvalue={`${visibles.length > 0 ? Math.round((disponibles / visibles.length) * 100) : 0}% del total`}
            accent="border-activa/20"
          />
          <StatCard
            label="En uso"
            value={enUso}
            subvalue={`${enUso} máquina${enUso === 1 ? '' : 's'} trabajando`}
            accent="border-primary/20"
          />
          <StatCard
            label="Usos hoy"
            value={usosHoy}
            subvalue="Tandas registradas"
            accent="border-primary/20"
          />
          <StatCard
            label="Averías"
            value={averias}
            subvalue={averias > 0 ? 'Requiere atención' : 'Sin incidencias'}
            accent={averias > 0 ? 'border-averia/30' : 'border-border-default'}
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SectionHeader title="Estado de planta" count={visibles.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibles.slice(0, 6).map((m) => (
                <MaquinaWorkCard key={m.id} maquina={m} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Últimos trabajos" />
            {recentWork.length === 0 ? (
              <div className="bg-surface-2 rounded-lg border border-border-subtle p-6 text-center">
                <p className="text-text-tertiary text-xs">Sin trabajos completados aún.</p>
                <p className="text-text-tertiary text-[10px] mt-1">Inicia un uso desde cualquier máquina.</p>
              </div>
            ) : (
              <div className="space-y-3 stagger-children">
                {recentWork.map((item) => {
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
          </div>
        </div>

        {/* State distribution */}
        <div className="bg-surface-2 rounded-lg border border-border-subtle p-4">
          <span className="text-[11px] font-medium uppercase tracking-widest text-text-tertiary block mb-3">
            Distribución de estados
          </span>
          <div className="flex h-2 rounded-full overflow-hidden bg-surface-4 gap-px">
            <Bar count={disponibles} total={visibles.length} color="bg-activa" />
            <Bar count={enUso}       total={visibles.length} color="bg-parada" />
            <Bar count={averias}     total={visibles.length} color="bg-averia" />
            <Bar count={enMant}      total={visibles.length} color="bg-mantenimiento" />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
            <Legend color="bg-activa"        label="Disponibles" count={disponibles} />
            <Legend color="bg-parada"        label="En uso"      count={enUso} />
            <Legend color="bg-averia"        label="Avería"      count={averias} />
            <Legend color="bg-mantenimiento" label="Mant."       count={enMant} />
          </div>
        </div>
      </main>
    </Layout>
  )
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{title}</h3>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-text-tertiary bg-surface-4 px-1.5 py-0.5 rounded">{count}</span>
      )}
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  )
}

function Bar({ count, total, color }: { count: number; total: number; color: string }) {
  if (count === 0 || total === 0) return null
  return <div className={`${color} rounded-full transition-all duration-500`} style={{ width: `${(count / total) * 100}%` }} />
}

function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-sm ${color}`} />
      <span className="text-[11px] text-text-secondary">{label}</span>
      <span className="text-[11px] font-mono text-text-tertiary">{count}</span>
    </div>
  )
}
