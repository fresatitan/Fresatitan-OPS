import { useState, useEffect, useMemo } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { toIsoDateTime } from '../lib/utils'
import NuevoUsoModal from '../components/maquinas/NuevoUsoModal'
import CerrarUsoModal from '../components/maquinas/CerrarUsoModal'
import HistorialMantenimientosModal from '../components/maquinas/HistorialMantenimientosModal'
import FinalizarMantenimientoModal from '../components/maquinas/FinalizarMantenimientoModal'
import SeleccionTipoTrabajoModal from '../components/panel/SeleccionTipoTrabajoModal'
import StartMantenimientoModal from '../components/panel/StartMantenimientoModal'
import StartPreparacionModal from '../components/panel/StartPreparacionModal'
import ThemeToggle from '../components/ui/ThemeToggle'
import EtiquetaTag from '../components/ui/EtiquetaTag'
import { useThemeStore } from '../store/themeStore'
import {
  IconMill, IconSinter, IconPrinter3D, IconArrowLeft, IconArrowRight,
  IconBroom, IconCheck, IconWrench,
} from '../components/ui/icons'
import { TIPOS_MAQUINA, TIPOS_MAQUINA_PLURAL, SUBTIPOS_FRESADORA } from '../constants/estados'
import type { Maquina, TipoMaquina, UsoEquipo, SubtipoFresadora } from '../types/database'

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
  const setTheme = useThemeStore((s) => s.setTheme)

  // El panel de planta arranca en claro (diseño clínico-técnico) salvo que el
  // usuario ya haya elegido tema explícitamente con el toggle.
  useEffect(() => {
    if (!localStorage.getItem('fresatitan-theme')) setTheme('light')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [family, setFamily] = useState<TipoMaquina | null>(null)

  const maquinaNecesitaPrep = useWorkflowStore((s) => s.maquinaNecesitaPrep)

  const [selectorFor, setSelectorFor] = useState<Maquina | null>(null)
  const [nuevoFor, setNuevoFor] = useState<Maquina | null>(null)
  const [mantFor, setMantFor] = useState<Maquina | null>(null)
  const [prepFor, setPrepFor] = useState<Maquina | null>(null)
  const [cerrarFor, setCerrarFor] = useState<{ maquina: Maquina; uso: UsoEquipo } | null>(null)
  // When user picks "Reportar avería" from the selector, open NuevoUsoModal in avería mode
  const [averiaFor, setAveriaFor] = useState<Maquina | null>(null)
  // Historial de mantenimientos (solo lectura) abierto desde el selector
  const [historialFor, setHistorialFor] = useState<Maquina | null>(null)
  // Finalizar mantenimiento abierto: card en estado 'mantenimiento' → modal
  const [finalizarMantFor, setFinalizarMantFor] = useState<Maquina | null>(null)

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
    } else if (m.estado_actual === 'mantenimiento') {
      // Toca una máquina bloqueada por mantenimiento → modal para finalizarlo
      setFinalizarMantFor(m)
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

  const handleVerHistorialMant = () => {
    const m = selectorFor
    setSelectorFor(null)
    if (m) setHistorialFor(m)
  }

  return (
    <div className="min-h-screen bg-surface-1 flex flex-col">
      {/* Cabecera: identidad a la izquierda, tiempo a la derecha. Una sola línea
          de altura contenida — la cabecera informa, no protagoniza. */}
      <header className="bg-surface-0 border-b border-border-subtle px-6 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-f.png" alt="" className="h-7 w-auto" />
          <div className="leading-none">
            <span className="text-[17px] font-bold text-text-primary tracking-tight">Fresatitan</span>
            <span className="text-[17px] font-medium text-primary-ink ml-1.5">OPS</span>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mt-1">
              Panel de planta
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right leading-none">
            <div className="hidden sm:block text-xs text-text-secondary first-letter:uppercase">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <LiveClock />
          </div>
          <div className="w-px h-8 bg-border-subtle hidden sm:block" />
          <ThemeToggle variant="panel" />
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
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
          needsPrep={maquinaNecesitaPrep(selectorFor.id)}
          onSelectProduccion={handleSelectProduccion}
          onSelectMantenimiento={handleSelectMantenimiento}
          onSelectPreparacion={handleSelectPreparacion}
          onSelectAveria={handleSelectAveria}
          onVerHistorialMantenimientos={handleVerHistorialMant}
        />
      )}
      {historialFor && (
        <HistorialMantenimientosModal
          open={!!historialFor}
          onClose={() => setHistorialFor(null)}
          maquina={historialFor}
        />
      )}
      {finalizarMantFor && (
        <FinalizarMantenimientoModal
          open={!!finalizarMantFor}
          onClose={() => setFinalizarMantFor(null)}
          maquina={finalizarMantFor}
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

  const families: { tipo: TipoMaquina; Icon: typeof IconMill }[] = [
    { tipo: 'fresadora', Icon: IconMill },
    { tipo: 'sinterizadora', Icon: IconSinter },
    { tipo: 'impresora_3d', Icon: IconPrinter3D },
  ]

  // Para cada máquina, ¿tiene una avería abierta (pendiente o confirmada)?
  const tieneAveriaAbierta = (maquinaId: string) =>
    estadosHistorial.some(
      (e) => e.maquina_id === maquinaId && e.estado === 'avería' && !e.cerrada_en,
    )

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-text-primary tracking-tight">
          ¿Qué máquina vas a usar?
        </h1>
        <p className="text-[15px] text-text-secondary mt-1.5">
          Primero elige la familia. Después verás las máquinas disponibles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                relative rounded-xl border p-6 text-left transition-all w-full min-h-[212px]
                flex flex-col bg-surface-2
                ${empty
                  ? 'border-border-subtle opacity-45 cursor-not-allowed'
                  : 'border-border-subtle shadow-card hover:shadow-card-hover hover:border-border-default active:scale-[0.99]'
                }
              `}
            >
              {/* Aviso discreto si hay máquinas con problemas */}
              {hasProblemas && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-averia-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-averia dot-breathe" />
                  <span className="text-[10.5px] font-semibold text-averia tabular-nums">
                    {problemas}
                  </span>
                </div>
              )}

              <div className="w-11 h-11 rounded-lg bg-primary-muted text-primary-ink flex items-center justify-center mb-4">
                <f.Icon size={24} />
              </div>
              <h3 className="text-[19px] font-bold text-text-primary leading-tight tracking-tight">
                {TIPOS_MAQUINA_PLURAL[f.tipo]}
              </h3>
              <p className="text-[12.5px] text-text-tertiary mt-0.5">
                {empty ? 'Sin máquinas dadas de alta' : `${ofFamily.length} máquinas`}
              </p>

              <div className="flex-1" />

              {!empty && (
                <>
                  <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-4">
                    <FamilyStat value={disponibles} label="Libres" dot="bg-activa" />
                    <FamilyStat value={enUso} label="En uso" dot="bg-parada" />
                    <FamilyStat value={problemas} label="Avisos" dot="bg-averia" />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold text-primary-ink">
                    Ver máquinas
                    <IconArrowRight size={15} />
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

function FamilyStat({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${value > 0 ? dot : 'bg-border-strong'}`} />
      <span className="text-[15px] font-mono font-medium tabular-nums text-text-primary">{value}</span>
      <span className="text-[11px] text-text-tertiary">{label}</span>
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
      <div className="mb-7 flex items-center gap-4">
        <button
          onClick={onBack}
          className="
            shrink-0 flex items-center gap-2 px-4 h-11 rounded-lg border border-border-subtle
            bg-surface-2 shadow-card text-text-secondary text-[14px] font-semibold
            hover:text-text-primary hover:border-border-default transition-colors
          "
        >
          <IconArrowLeft size={16} />
          Volver
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight leading-none">
            {TIPOS_MAQUINA_PLURAL[family]}
          </h1>
          <p className="text-[13px] text-text-secondary mt-1.5">
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
      ) : family === 'fresadora' ? (
        // Fresadoras agrupadas por sub-familia (METAL / SECO / HÚMEDO)
        <div className="space-y-7">
          {(['metal', 'seco', 'humedo'] as SubtipoFresadora[]).map((sub) => {
            const lista = [...maquinas]
              .filter((m) => m.subtipo === sub)
              .sort((a, b) => estadoPrioridad(a.estado_actual) - estadoPrioridad(b.estado_actual))
            if (lista.length === 0) return null
            return (
              <div key={sub}>
                <SubFamilyTitle subtipo={sub} count={lista.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lista.map((m) => (
                    <PlantMaquinaCard
                      key={m.id}
                      maquina={m}
                      activeUso={getUso(m.id)}
                      onClick={() => onMachineTap(m)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
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

function SubFamilyTitle({ subtipo, count }: { subtipo: SubtipoFresadora; count: number }) {
  const meta = SUBTIPOS_FRESADORA[subtipo]
  return (
    <div className="mb-3.5 flex items-baseline gap-3">
      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-text-secondary">
        {meta.short}
      </span>
      <span className="text-[11px] font-mono text-text-tertiary tabular-nums">{count}</span>
      <span className="text-[11.5px] text-text-tertiary hidden sm:inline">{meta.description}</span>
      <span className="flex-1 h-px bg-border-subtle self-center" />
    </div>
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
  const getUltimaPreparacion = useWorkflowStore((s) => s.getUltimaPreparacion)
  const maquinaNecesitaPrep = useWorkflowStore((s) => s.maquinaNecesitaPrep)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const isAvailable = maquina.estado_actual === 'parada'
  const isInUse     = maquina.estado_actual === 'activa'
  const isAveria    = maquina.estado_actual === 'avería'
  const isMant      = maquina.estado_actual === 'mantenimiento'
  const isInactiva  = maquina.estado_actual === 'inactiva'

  // Estados "bloqueados" (no usable) → render totalmente distinto y dominante.
  // Mantenimiento sí es clickable porque desde ahí se finaliza la intervención.
  if (isAveria || isMant || isInactiva) {
    return <BlockedMaquinaCard maquina={maquina} onClick={isMant ? onClick : undefined} />
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

  // ¿Necesita preparación antes del próximo uso? (Regla: preparación debe
  // ser posterior al último cierre de uso). Si no lo necesita, mostramos la
  // última prep registrada como referencia.
  const needsPrep = maquinaNecesitaPrep(maquina.id)
  const ultimaPrep = getUltimaPreparacion(maquina.id)
  const listaParaUsar = !needsPrep && ultimaPrep ? ultimaPrep : null

  const warning = openAveria
    ? openAveria.severidad_confirmada_por_admin && openAveria.severidad === 'leve'
      ? { tone: 'leve' as const, label: 'Avería leve activa', sub: 'Puedes usarla — el admin ya lo sabe' }
      : { tone: 'pending' as const, label: 'Avería pendiente de revisar', sub: 'Reportada, esperando al admin' }
    : null

  // Color de la barra lateral de estado: el estado se lee en un vistazo sin
  // teñir toda la card.
  const edge = warning ? 'bg-averia' : isInUse ? 'bg-activa' : 'bg-border-strong'

  return (
    <button
      onClick={onClick}
      className="
        relative rounded-xl border border-border-subtle bg-surface-2 shadow-card
        p-5 pl-6 text-left transition-all w-full min-h-[172px] flex flex-col
        overflow-hidden hover:shadow-card-hover hover:border-border-default active:scale-[0.99]
      "
    >
      {/* Barra lateral de estado */}
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${edge}`} />

      {/* Header: la etiqueta de planta (F 1, SINT 4…) es EL identificador que
          el trabajador busca — coincide con el cartel físico de la máquina */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {maquina.etiqueta ? (
          <EtiquetaTag etiqueta={maquina.etiqueta} size="lg" />
        ) : (
          <span className="font-mono text-sm text-primary-ink font-bold">{maquina.codigo}</span>
        )}
        {warning
          ? <StatusChip tone="averia" label="Avería" breathe />
          : <StatusBadge estado={maquina.estado_actual} />}
      </div>

      {/* Nombre + identificación secundaria */}
      <div className="mb-2">
        <h3 className="text-[16.5px] font-semibold text-text-primary leading-snug tracking-tight">
          {maquina.nombre}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[11px] text-text-tertiary whitespace-nowrap">{maquina.codigo}</span>
          <span className="text-[11px] text-text-tertiary">{TIPOS_MAQUINA[maquina.tipo]}</span>
          {maquina.requiere_lanzamiento && (
            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-primary-ink border border-primary/30 px-1.5 py-px rounded">
              Lanzamiento
            </span>
          )}
        </div>
      </div>

      {/* Aviso de avería abierta no bloqueante */}
      {warning && (
        <div className="mb-2 pl-2.5 border-l-2 border-averia/50">
          <div className="text-[12px] font-semibold text-averia leading-tight">{warning.label}</div>
          {openAveria?.motivo && (
            <p className="text-[11.5px] text-text-secondary leading-snug line-clamp-2 mt-0.5">
              {openAveria.motivo}
            </p>
          )}
        </div>
      )}

      {/* Estado de preparación — solo si la máquina requiere preparación */}
      {isAvailable && maquina.requiere_preparacion && (
        <div className="mb-2 flex items-center gap-2">
          {listaParaUsar ? (
            <>
              <span className="text-activa"><IconCheck size={14} /></span>
              <span className="text-[12px] font-medium text-activa">Lista para producir</span>
              <span className="text-[11px] font-mono text-text-tertiary truncate">
                {listaParaUsar.hora.slice(0, 5)} · {getName(listaParaUsar.trabajador_id)}
              </span>
            </>
          ) : (
            <>
              <span className="text-parada"><IconBroom size={14} /></span>
              <span className="text-[12px] font-medium text-parada">Necesita preparación</span>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      {isAvailable && !isInUse && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className={`text-[13.5px] font-semibold ${warning ? 'text-averia' : 'text-primary-ink'}`}>
            Toca para empezar
          </span>
          <span className={warning ? 'text-averia' : 'text-primary-ink'}>
            <IconArrowRight size={15} />
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
 *
 * Excepción: las máquinas en `mantenimiento` SÍ son tocables — desde ahí
 * se abre el modal para finalizar el mantenimiento y devolverlas a operativa.
 */
function BlockedMaquinaCard({ maquina, onClick }: { maquina: Maquina; onClick?: () => void }) {
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
    ? { edge: 'bg-averia', accent: 'text-averia', chip: 'averia' as const }
    : isMant
    ? { edge: 'bg-mantenimiento', accent: 'text-mantenimiento', chip: 'mantenimiento' as const }
    : { edge: 'bg-inactiva', accent: 'text-text-tertiary', chip: 'inactiva' as const }

  const mainLabel = isAveria ? 'No usar' : isMant ? 'En mantenimiento' : 'Retirada'
  const subLabel = isAveria
    ? 'Máquina averiada — avisa al responsable'
    : isMant
    ? 'Intervención técnica en curso'
    : 'Máquina retirada del servicio'

  const clickable = !!onClick
  const Comp: 'button' | 'div' = clickable ? 'button' : 'div'

  return (
    <Comp
      onClick={clickable ? onClick : undefined}
      type={clickable ? 'button' : undefined}
      className={`
        relative rounded-xl border border-border-subtle bg-surface-2 shadow-card
        p-5 pl-6 text-left w-full min-h-[172px] flex flex-col overflow-hidden
        ${clickable ? 'cursor-pointer hover:shadow-card-hover hover:border-border-default active:scale-[0.99] transition-all' : 'cursor-not-allowed'}
      `}
    >
      {/* Barra lateral de estado */}
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${palette.edge}`} />

      {/* Header: etiqueta + estado */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {maquina.etiqueta ? (
          <EtiquetaTag etiqueta={maquina.etiqueta} size="lg" muted={!isAveria && !isMant} />
        ) : (
          <span className="font-mono text-sm text-text-tertiary font-bold">{maquina.codigo}</span>
        )}
        <StatusChip
          tone={palette.chip}
          label={isAveria ? 'Avería' : isMant ? 'Mant.' : 'Inactiva'}
          breathe={isAveria}
        />
      </div>

      {/* Nombre + identificación secundaria */}
      <div className="mb-2">
        <h3 className="text-[16.5px] font-semibold text-text-primary leading-snug tracking-tight">
          {maquina.nombre}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[11px] text-text-tertiary">{maquina.codigo}</span>
          <span className="text-[11px] text-text-tertiary">{TIPOS_MAQUINA[maquina.tipo]}</span>
        </div>
      </div>

      {/* Mensaje principal — claro sin gritar en toda la card */}
      <div className={`mt-1 ${palette.accent}`}>
        <div className="text-[19px] font-bold tracking-tight leading-none">{mainLabel}</div>
        <div className="text-[12px] mt-1 opacity-80">{subLabel}</div>
      </div>

      {/* Motivo de la avería, si está disponible */}
      {isAveria && averiaAbierta?.motivo && (
        <div className="mt-3 pl-2.5 border-l-2 border-averia/40">
          <p className="text-[11.5px] text-text-secondary leading-snug line-clamp-2">
            {averiaAbierta.motivo}
          </p>
          {averiaAbierta.severidad_confirmada_por_admin && averiaAbierta.severidad && (
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-averia">
              {averiaAbierta.severidad === 'critica' ? 'Crítica confirmada' : 'Leve confirmada'}
            </span>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* CTA visible si la card es clickable (mantenimiento) */}
      {clickable && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <span className="text-[13.5px] font-semibold text-mantenimiento">
            Toca para finalizar mantenimiento
          </span>
          <span className="text-mantenimiento"><IconWrench size={15} /></span>
        </div>
      )}
    </Comp>
  )
}

function ActiveUsoFooter({ uso }: { uso: UsoEquipo }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))

  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <div className="text-[10px] text-text-tertiary uppercase tracking-[0.1em]">Trabajando</div>
          <div className="text-[14.5px] font-semibold text-text-primary truncate mt-0.5">
            {getName(uso.tecnico_preparacion_id)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[19px] font-mono font-medium text-activa tabular-nums leading-none">
            {elapsed}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[13.5px] font-semibold text-activa">Toca para cerrar</span>
        <span className="text-activa"><IconArrowRight size={15} /></span>
      </div>
    </div>
  )
}

/**
 * Chip de estado: punto de color + texto. El punto respira (dot-breathe)
 * solo cuando el estado pide atención — nada de "ping" permanentes.
 */
function StatusChip({
  tone,
  label,
  breathe = false,
}: {
  tone: 'activa' | 'parada' | 'averia' | 'mantenimiento' | 'inactiva'
  label: string
  breathe?: boolean
}) {
  const MAP = {
    activa:        { dot: 'bg-activa',        text: 'text-activa',        bg: 'bg-activa-muted' },
    parada:        { dot: 'bg-parada',        text: 'text-parada',        bg: 'bg-parada-muted' },
    averia:        { dot: 'bg-averia',        text: 'text-averia',        bg: 'bg-averia-muted' },
    mantenimiento: { dot: 'bg-mantenimiento', text: 'text-mantenimiento', bg: 'bg-mantenimiento-muted' },
    inactiva:      { dot: 'bg-inactiva',      text: 'text-inactiva',      bg: 'bg-inactiva-muted' },
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${MAP.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${MAP.dot} ${breathe ? 'dot-breathe' : ''}`} />
      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${MAP.text}`}>
        {label}
      </span>
    </span>
  )
}

function StatusBadge({ estado }: { estado: Maquina['estado_actual'] }) {
  const MAP: Record<Maquina['estado_actual'], { text: string; tone: 'activa' | 'parada' | 'averia' | 'mantenimiento' | 'inactiva' }> = {
    parada: { text: 'Libre', tone: 'activa' },
    activa: { text: 'En uso', tone: 'parada' },
    'avería': { text: 'Avería', tone: 'averia' },
    mantenimiento: { text: 'Mant.', tone: 'mantenimiento' },
    inactiva: { text: 'Inactiva', tone: 'inactiva' },
  }
  const { text, tone } = MAP[estado]
  return <StatusChip tone={tone} label={text} />
}

function LiveClock() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return (
    <div className="text-[22px] font-mono font-medium text-text-primary tabular-nums leading-none mt-1">
      {time}
    </div>
  )
}
