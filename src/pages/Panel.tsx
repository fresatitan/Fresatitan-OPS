import { useState, useEffect, useMemo } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { toIsoDateTime } from '../lib/utils'
import NuevoUsoModal from '../components/maquinas/NuevoUsoModal'
import CerrarUsoModal from '../components/maquinas/CerrarUsoModal'
import SeleccionTipoTrabajoModal from '../components/panel/SeleccionTipoTrabajoModal'
import StartMantenimientoModal from '../components/panel/StartMantenimientoModal'
import StartPreparacionModal from '../components/panel/StartPreparacionModal'
import { TIPOS_MAQUINA, TIPOS_MAQUINA_PLURAL } from '../constants/estados'
import type { Maquina, TipoMaquina, UsoEquipo } from '../types/database'

/**
 * Panel de Planta — FRESATITAN OPS
 *
 * Diseñado para trabajadores NO-técnicos operando tablets con guantes:
 *   · Tipografía grande (mín. 16-18px en cards, 24px+ en datos clave)
 *   · Touch targets ≥ 56px
 *   · Zero filtros, zero búsqueda, zero selección previa de trabajador
 *   · Máquinas retiradas (Lilian) se ocultan aquí
 *   · Estado visual por color completo de card, no solo borde
 *
 * Flujo:
 *   1. Selector de familia (Fresadoras / Sinterizadoras / Impresoras 3D)
 *   2. Grid de máquinas de esa familia
 *   3. Tap en disponible → NuevoUsoModal · Tap en en-uso → CerrarUsoModal
 */
export default function Panel() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)

  const [family, setFamily] = useState<TipoMaquina | null>(null)

  const [selectorFor, setSelectorFor] = useState<Maquina | null>(null)
  const [nuevoFor, setNuevoFor] = useState<Maquina | null>(null)
  const [mantFor, setMantFor] = useState<Maquina | null>(null)
  const [prepFor, setPrepFor] = useState<Maquina | null>(null)
  const [cerrarFor, setCerrarFor] = useState<{ maquina: Maquina; uso: UsoEquipo } | null>(null)
  // When user picks "Reportar avería" from the selector, open NuevoUsoModal in avería mode
  const [averiaFor, setAveriaFor] = useState<Maquina | null>(null)

  // Solo máquinas operativas (Lilian queda fuera del panel)
  const visibles = useMemo(() => maquinas.filter((m) => m.activa), [maquinas])

  // Máquinas de la familia seleccionada
  const maquinasFamilia = useMemo(
    () => (family ? visibles.filter((m) => m.tipo === family) : []),
    [visibles, family]
  )

  const getUso = (maquinaId: string) =>
    usos.find((u) => u.maquina_id === maquinaId && u.resultado === 'pendiente') ?? null

  const handleMachineTap = (m: Maquina) => {
    if (m.estado_actual === 'parada') {
      setSelectorFor(m)
    } else if (m.estado_actual === 'activa') {
      const uso = getUso(m.id)
      if (uso) setCerrarFor({ maquina: m, uso })
    }
  }

  const handleSelectProduccion = () => {
    const m = selectorFor
    setSelectorFor(null)
    if (m) setNuevoFor(m)
  }

  const handleSelectMantenimiento = () => {
    const m = selectorFor
    setSelectorFor(null)
    if (m) setMantFor(m)
  }

  const handleSelectPreparacion = () => {
    const m = selectorFor
    setSelectorFor(null)
    if (m) setPrepFor(m)
  }

  const handleSelectAveria = () => {
    const m = selectorFor
    setSelectorFor(null)
    if (m) setAveriaFor(m)
  }

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col">
      {/* Header minimalista */}
      <header className="bg-surface-0 border-b border-border-subtle px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-f.png" alt="" className="h-7 w-auto" />
          <div>
            <span className="text-lg font-bold text-text-primary tracking-tight">Fresatitan</span>
            <span className="text-lg font-light text-primary ml-1.5">OPS</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-text-primary">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <LiveClock />
        </div>
      </header>

      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        {family === null ? (
          <FamilySelector maquinas={visibles} onSelect={setFamily} />
        ) : (
          <MachinesView
            family={family}
            maquinas={maquinasFamilia}
            onBack={() => setFamily(null)}
            onMachineTap={handleMachineTap}
            getUso={getUso}
          />
        )}
      </main>

      {/* Modales */}
      {selectorFor && (
        <SeleccionTipoTrabajoModal
          open={!!selectorFor}
          onClose={() => setSelectorFor(null)}
          maquina={selectorFor}
          onSelectProduccion={handleSelectProduccion}
          onSelectMantenimiento={handleSelectMantenimiento}
          onSelectPreparacion={handleSelectPreparacion}
          onSelectAveria={handleSelectAveria}
        />
      )}
      {nuevoFor && (
        <NuevoUsoModal open={!!nuevoFor} onClose={() => setNuevoFor(null)} maquina={nuevoFor} />
      )}
      {averiaFor && (
        <NuevoUsoModal open={!!averiaFor} onClose={() => setAveriaFor(null)} maquina={averiaFor} />
      )}
      {mantFor && (
        <StartMantenimientoModal open={!!mantFor} onClose={() => setMantFor(null)} maquina={mantFor} />
      )}
      {prepFor && (
        <StartPreparacionModal open={!!prepFor} onClose={() => setPrepFor(null)} maquina={prepFor} />
      )}
      {cerrarFor && (
        <CerrarUsoModal
          open={!!cerrarFor}
          onClose={() => setCerrarFor(null)}
          maquina={cerrarFor.maquina}
          uso={cerrarFor.uso}
        />
      )}
    </div>
  )
}

// =============================================================================
// SELECTOR DE FAMILIA — Paso 1
// =============================================================================
function FamilySelector({
  maquinas,
  onSelect,
}: {
  maquinas: Maquina[]
  onSelect: (t: TipoMaquina) => void
}) {
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)

  const families: { tipo: TipoMaquina; icon: string }[] = [
    { tipo: 'fresadora', icon: '⚙' },
    { tipo: 'sinterizadora', icon: '◎' },
    { tipo: 'impresora_3d', icon: '⎙' },
  ]

  // Para cada máquina, ¿tiene una avería abierta (pendiente o confirmada)?
  const tieneAveriaAbierta = (maquinaId: string) =>
    estadosHistorial.some(
      (e) => e.maquina_id === maquinaId && e.estado === 'avería' && !e.cerrada_en,
    )

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">¿Qué máquina vas a usar?</h1>
        <p className="text-base text-text-secondary mt-2">
          Primero elige la familia. Después verás las máquinas disponibles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {families.map((f) => {
          const ofFamily = maquinas.filter((m) => m.tipo === f.tipo)
          const disponibles = ofFamily.filter((m) => m.estado_actual === 'parada').length
          const enUso = ofFamily.filter((m) => m.estado_actual === 'activa').length
          // Cuenta avisos: máquinas bloqueadas o con avería abierta aunque no esté
          // bloqueada todavía (pendiente de revisar o confirmada leve)
          const problemas = ofFamily.filter(
            (m) =>
              m.estado_actual === 'avería' ||
              m.estado_actual === 'mantenimiento' ||
              tieneAveriaAbierta(m.id),
          ).length
          const empty = ofFamily.length === 0

          const hasProblemas = problemas > 0

          return (
            <button
              key={f.tipo}
              onClick={() => !empty && onSelect(f.tipo)}
              disabled={empty}
              className={`
                relative rounded-2xl border-2 p-6 text-left transition-all w-full min-h-[220px]
                flex flex-col
                ${empty
                  ? 'bg-surface-2 border-border-subtle opacity-40 cursor-not-allowed'
                  : hasProblemas
                    ? 'bg-surface-2 border-averia/40 hover:border-averia hover:bg-surface-3 active:scale-[0.98]'
                    : 'bg-surface-2 border-border-subtle hover:border-primary hover:bg-surface-3 active:scale-[0.98]'
                }
              `}
            >
              {/* Aviso visual si hay problemas — esquina superior derecha */}
              {hasProblemas && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-averia text-white">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider">
                    {problemas} AVERÍA{problemas === 1 ? '' : 'S'}
                  </span>
                </div>
              )}

              <div className="text-4xl text-primary mb-3">{f.icon}</div>
              <h3 className="text-2xl font-bold text-text-primary leading-tight">
                {TIPOS_MAQUINA_PLURAL[f.tipo]}
              </h3>

              <div className="flex-1" />

              {empty ? (
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <span className="text-sm text-text-tertiary">Sin máquinas dadas de alta</span>
                </div>
              ) : (
                <>
                  <div className="mt-4 pt-3 border-t border-border-subtle grid grid-cols-3 gap-2 text-center">
                    <FamilyStat value={disponibles} label="Libres" color="text-activa" />
                    <FamilyStat value={enUso} label="En uso" color="text-parada" />
                    <FamilyStat value={problemas} label="Avería" color="text-averia" />
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-base font-semibold text-primary">Ver máquinas →</span>
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function FamilyStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-mono font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

// =============================================================================
// VISTA DE MÁQUINAS DE UNA FAMILIA — Paso 2
// =============================================================================
function MachinesView({
  family,
  maquinas,
  onBack,
  onMachineTap,
  getUso,
}: {
  family: TipoMaquina
  maquinas: Maquina[]
  onBack: () => void
  onMachineTap: (m: Maquina) => void
  getUso: (maquinaId: string) => UsoEquipo | null
}) {
  return (
    <>
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={onBack}
          className="
            shrink-0 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-2
            text-text-secondary hover:text-text-primary hover:border-primary/40
            transition-colors text-base font-semibold
          "
        >
          ← Volver
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">{TIPOS_MAQUINA_PLURAL[family]}</h1>
          <p className="text-base text-text-secondary mt-1">
            Toca una máquina para empezar un trabajo o cerrar el que tiene en marcha.
          </p>
        </div>
      </div>

      {maquinas.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-8 text-center">
          <p className="text-base text-text-secondary">
            No hay máquinas operativas en esta familia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...maquinas]
            .sort((a, b) => estadoPrioridad(a.estado_actual) - estadoPrioridad(b.estado_actual))
            .map((m) => (
              <PlantMaquinaCard
                key={m.id}
                maquina={m}
                activeUso={getUso(m.id)}
                onClick={() => onMachineTap(m)}
              />
            ))}
        </div>
      )}
    </>
  )
}

// Orden visual: Disponibles primero, luego en uso, luego problemas
function estadoPrioridad(estado: Maquina['estado_actual']): number {
  switch (estado) {
    case 'parada': return 1
    case 'activa': return 2
    case 'mantenimiento': return 3
    case 'avería': return 4
    case 'inactiva': return 5
  }
}

// =============================================================================
// Card táctil de máquina — GRANDE, CLARA, CON COLOR DE ESTADO
// =============================================================================
function PlantMaquinaCard({
  maquina,
  activeUso,
  onClick,
}: {
  maquina: Maquina
  activeUso: UsoEquipo | null
  onClick?: () => void
}) {
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)

  const isAvailable = maquina.estado_actual === 'parada'
  const isInUse     = maquina.estado_actual === 'activa'
  const isAveria    = maquina.estado_actual === 'avería'
  const isMant      = maquina.estado_actual === 'mantenimiento'
  const isInactiva  = maquina.estado_actual === 'inactiva'

  // Estados "bloqueados" (no usable) → render totalmente distinto y dominante
  if (isAveria || isMant || isInactiva) {
    return <BlockedMaquinaCard maquina={maquina} />
  }

  // ¿Hay avería reportada pero aún no bloqueante? (pendiente de revisión por admin
  // o confirmada como leve). En ambos casos la máquina sigue operativa pero se
  // muestra advertencia visible.
  const openAveria = estadosHistorial.find(
    (e) =>
      e.maquina_id === maquina.id &&
      e.estado === 'avería' &&
      !e.cerrada_en &&
      // no consideramos las ya confirmadas como críticas: esas bloquean la
      // máquina (estado_actual = 'avería') y caen en BlockedMaquinaCard arriba
      !(e.severidad_confirmada_por_admin && e.severidad === 'critica'),
  )

  const warning = openAveria
    ? openAveria.severidad_confirmada_por_admin && openAveria.severidad === 'leve'
      ? { tone: 'leve' as const, label: 'AVERÍA LEVE ACTIVA', sub: 'Puedes usarla, pero el admin ya lo sabe' }
      : { tone: 'pending' as const, label: 'AVERÍA PENDIENTE DE REVISAR', sub: 'Reportada, esperando al admin' }
    : null

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-2xl border-2 p-5 text-left transition-all w-full min-h-[180px]
        flex flex-col
        ${isAvailable && !warning ? 'bg-surface-2 border-border-subtle hover:border-primary hover:bg-surface-3 active:scale-[0.98]' : ''}
        ${isInUse    && !warning ? 'bg-activa/10 border-activa/40 hover:bg-activa/15 active:scale-[0.98]' : ''}
        ${warning?.tone === 'pending' ? 'bg-parada/5 border-parada/40 hover:bg-parada/10 active:scale-[0.98]' : ''}
        ${warning?.tone === 'leve'    ? 'bg-parada/5 border-parada/40 hover:bg-parada/10 active:scale-[0.98]' : ''}
      `}
    >
      {/* Banner de advertencia no-bloqueante — cuando hay avería reportada */}
      {warning && (
        <div className="-mx-5 -mt-5 mb-3 px-4 py-2 rounded-t-2xl bg-parada text-white flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono font-bold tracking-wider uppercase leading-tight">
              ⚠ {warning.label}
            </div>
            <div className="text-[10px] opacity-90 leading-tight">{warning.sub}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-primary font-bold">{maquina.codigo}</span>
        <StatusBadge estado={maquina.estado_actual} />
      </div>

      {/* Nombre */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-text-primary leading-tight">{maquina.nombre}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-tertiary uppercase tracking-wider">
            {TIPOS_MAQUINA[maquina.tipo]}
          </span>
          {maquina.requiere_lanzamiento && (
            <span className="text-[10px] font-mono text-primary bg-primary-muted px-1.5 py-0.5 rounded">
              + LANZAMIENTO
            </span>
          )}
        </div>
      </div>

      {/* Motivo del reporte (si hay avería abierta) */}
      {openAveria?.motivo && (
        <div className="mb-2 px-2.5 py-1.5 bg-surface-3/50 border-l-2 border-parada/60 rounded-r">
          <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
            {openAveria.motivo}
          </p>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      {isAvailable && !isInUse && (
        <div className={`mt-4 pt-3 border-t ${warning ? 'border-parada/20' : 'border-border-subtle'}`}>
          <span className={`text-base font-semibold ${warning ? 'text-parada' : 'text-activa'}`}>
            Toca para empezar →
          </span>
        </div>
      )}

      {isInUse && activeUso && <ActiveUsoFooter uso={activeUso} />}
    </button>
  )
}

/**
 * Card para estados bloqueados (avería / mantenimiento / inactiva).
 * Diseño completamente distinto al de máquinas operativas: el estado es lo
 * primero que ve el trabajador, imposible confundirlo con una máquina libre.
 */
function BlockedMaquinaCard({ maquina }: { maquina: Maquina }) {
  const isAveria   = maquina.estado_actual === 'avería'
  const isMant     = maquina.estado_actual === 'mantenimiento'
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)

  // Buscar la última avería abierta para mostrar motivo y severidad
  const averiaAbierta = isAveria
    ? estadosHistorial.find(
        (e) => e.maquina_id === maquina.id && e.estado === 'avería' && !e.cerrada_en,
      )
    : null

  const palette = isAveria
    ? {
        bg: 'bg-averia/10',
        border: 'border-averia',
        accent: 'text-averia',
        banner: 'bg-averia',
        dotPulse: true,
      }
    : isMant
    ? {
        bg: 'bg-mantenimiento/10',
        border: 'border-mantenimiento',
        accent: 'text-mantenimiento',
        banner: 'bg-mantenimiento',
        dotPulse: false,
      }
    : {
        bg: 'bg-surface-2',
        border: 'border-border-subtle',
        accent: 'text-text-tertiary',
        banner: 'bg-surface-4',
        dotPulse: false,
      }

  const mainLabel = isAveria ? 'NO USAR' : isMant ? 'NO DISPONIBLE' : 'RETIRADA'
  const subLabel = isAveria
    ? 'Máquina averiada — avisa al responsable'
    : isMant
    ? 'En mantenimiento'
    : 'Máquina retirada del servicio'

  return (
    <div
      className={`
        relative rounded-2xl border-2 p-5 text-left w-full min-h-[180px] flex flex-col
        cursor-not-allowed
        ${palette.bg} ${palette.border}
        ${isAveria ? 'animate-averia' : ''}
      `}
    >
      {/* Banner superior de ancho completo */}
      <div
        className={`
          ${palette.banner} text-white -mx-5 -mt-5 mb-4 rounded-t-2xl
          px-4 py-2.5 flex items-center gap-2
        `}
      >
        {palette.dotPulse && (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
        )}
        <span className="text-[11px] font-mono font-bold tracking-widest uppercase">
          {isAveria ? '⚠ Avería' : isMant ? '⚙ Mantenimiento' : '· Inactiva'}
        </span>
      </div>

      {/* Header: código + nombre */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-text-tertiary font-bold">{maquina.codigo}</span>
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
            {TIPOS_MAQUINA[maquina.tipo]}
          </span>
        </div>
        <h3 className="text-base font-bold text-text-primary leading-tight">{maquina.nombre}</h3>
      </div>

      {/* Mensaje principal grande — lo PRIMERO que el trabajador ve */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
        <div className={`text-3xl font-black ${palette.accent} tracking-tight leading-none`}>
          {mainLabel}
        </div>
        <div className={`text-xs ${palette.accent} mt-2 opacity-80 font-medium`}>
          {subLabel}
        </div>
      </div>

      {/* Motivo de la avería, si está disponible */}
      {isAveria && averiaAbierta?.motivo && (
        <div className="mt-3 pt-3 border-t border-averia/20">
          <div className="text-[9px] text-averia uppercase tracking-widest font-bold mb-1">
            Motivo reportado
          </div>
          <p className="text-xs text-text-primary leading-relaxed line-clamp-3">
            {averiaAbierta.motivo}
          </p>
          {averiaAbierta.severidad_confirmada_por_admin && averiaAbierta.severidad && (
            <div className="mt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest bg-averia/20 text-averia px-1.5 py-0.5 rounded">
                {averiaAbierta.severidad === 'critica' ? '🔴 Crítica' : '🟡 Leve'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActiveUsoFooter({ uso }: { uso: UsoEquipo }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))

  return (
    <div className="mt-4 pt-3 border-t border-activa/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Trabajando</div>
          <div className="text-base font-semibold text-text-primary">
            {getName(uso.tecnico_preparacion_id)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Tiempo</div>
          <div className="text-xl font-mono font-bold text-activa tabular-nums">{elapsed}</div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span className="text-sm font-semibold text-activa">Toca para cerrar →</span>
      </div>
    </div>
  )
}

function StatusBadge({ estado }: { estado: Maquina['estado_actual'] }) {
  const MAP: Record<Maquina['estado_actual'], { text: string; className: string }> = {
    parada: { text: 'LIBRE', className: 'bg-activa/15 text-activa' },
    activa: { text: 'EN USO', className: 'bg-parada/15 text-parada' },
    'avería': { text: 'AVERÍA', className: 'bg-averia/15 text-averia' },
    mantenimiento: { text: 'MANT.', className: 'bg-mantenimiento/15 text-mantenimiento' },
    inactiva: { text: 'INACTIVA', className: 'bg-inactiva/15 text-inactiva' },
  }
  const { text, className } = MAP[estado]
  return (
    <span className={`text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded ${className}`}>
      {text}
    </span>
  )
}

function LiveClock() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return <div className="text-2xl font-mono font-bold text-primary tabular-nums">{time}</div>
}
