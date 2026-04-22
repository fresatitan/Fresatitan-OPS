import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import { PROCESOS_POR_TIPO, TIPOS_PROCESO } from '../../constants/estados'
import type { Maquina, SeveridadAveria, TipoProceso } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const todayDate = () => new Date().toISOString().slice(0, 10)

type Step = 'tecnico' | 'lanzamiento' | 'proceso' | 'confirmar' | 'averia'
type FlowStep = Exclude<Step, 'averia'>

/**
 * Flujo rediseñado para trabajadores no-técnicos:
 *   1. ¿Quién va a usar la máquina? (siempre)
 *   2. (opcional) ¿Quién lanza? — solo si la máquina requiere lanzamiento
 *   3. ¿Qué proceso vas a hacer? — fresado, sinterizado, etc. (filtrado por tipo)
 *   4. Confirmación visual con resumen y botón "Empezar ahora"
 *
 * Fecha y hora se auto-rellenan con ahora. Están ocultas tras un "Ajustar datos"
 * para cuando un admin necesita corregir un registro pasado.
 */
export default function NuevoUsoModal({ open, onClose, maquina }: Props) {
  const iniciarUso = useWorkflowStore((s) => s.iniciarUso)
  const reportarAveria = useWorkflowStore((s) => s.reportarAveria)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const procesosDisponibles = PROCESOS_POR_TIPO[maquina.tipo]

  const [step, setStep] = useState<Step>('tecnico')
  const [tecnico, setTecnico] = useState<Trabajador | null>(null)
  const [tecnicoLanz, setTecnicoLanz] = useState<Trabajador | null>(null)
  const [tipoProceso, setTipoProceso] = useState<TipoProceso | null>(null)
  const [showAjustes, setShowAjustes] = useState(false)
  const [fecha, setFecha] = useState(todayDate())
  const [hora, setHora] = useState(nowTime())
  const [observaciones, setObservaciones] = useState('')
  const [averiaMotivo, setAveriaMotivo] = useState('')
  const [averiaTecnico, setAveriaTecnico] = useState<Trabajador | null>(null)
  const [averiaSeveridad, setAveriaSeveridad] = useState<SeveridadAveria>('critica')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('tecnico')
      setTecnico(null)
      setTecnicoLanz(null)
      setTipoProceso(null)
      setShowAjustes(false)
      setFecha(todayDate())
      setHora(nowTime())
      setObservaciones('')
      setAveriaMotivo('')
      setAveriaTecnico(null)
      setAveriaSeveridad('critica')
      setSubmitting(false)
    }
  }, [open])

  const handleReportarAveria = async () => {
    if (!averiaMotivo.trim()) return
    await reportarAveria(
      maquina.id,
      averiaMotivo.trim(),
      averiaTecnico?.id ?? null,
      averiaSeveridad,
    )
    toast(`Aviso enviado al admin · ${maquina.codigo}`, { icon: '⚠', duration: 5000 })
    onClose()
  }

  // Cuando se elige técnico principal, avanza al siguiente paso
  const handleSelectTecnico = (t: Trabajador) => {
    setTecnico(t)
    setTimeout(() => {
      setStep(maquina.requiere_lanzamiento ? 'lanzamiento' : 'proceso')
    }, 150)
  }

  const handleSelectLanz = (t: Trabajador) => {
    setTecnicoLanz(t)
    setTimeout(() => setStep('proceso'), 150)
  }

  const handleSelectProceso = (p: TipoProceso) => {
    setTipoProceso(p)
    setTimeout(() => setStep('confirmar'), 150)
  }

  const handleConfirmar = async () => {
    if (!tecnico) return
    if (maquina.requiere_lanzamiento && !tecnicoLanz) return
    if (!tipoProceso) return
    setSubmitting(true)
    const id = await iniciarUso({
      maquina_id: maquina.id,
      fecha,
      hora_preparacion: hora,
      tecnico_preparacion_id: tecnico.id,
      tecnico_lanzamiento_id: tecnicoLanz?.id ?? null,
      observaciones: observaciones.trim() || null,
      tipo_proceso: tipoProceso,
    })
    setSubmitting(false)
    if (!id) {
      toast.error('No se pudo iniciar el uso')
      return
    }
    toast.success(`${maquina.codigo} en marcha · ${TIPOS_PROCESO[tipoProceso].label}`, { icon: '✓' })
    onClose()
  }

  const handleBack = () => {
    if (step === 'confirmar') {
      setStep('proceso')
    } else if (step === 'proceso') {
      setStep(maquina.requiere_lanzamiento ? 'lanzamiento' : 'tecnico')
    } else if (step === 'lanzamiento') {
      setStep('tecnico')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · ${maquina.nombre}`} size="lg">
      <div className="min-h-[360px]">
        {/* Link escape: reportar avería en cualquier momento (salvo si ya estás en averia) */}
        {step !== 'averia' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setStep('averia')}
              className="text-[11px] text-averia hover:text-averia/80 transition-colors flex items-center gap-1"
            >
              <span>⚠</span>
              <span className="underline decoration-dotted">Reportar avería en esta máquina</span>
            </button>
          </div>
        )}

        {/* Progreso en pasos */}
        {step !== 'averia' && (
          <StepIndicator
            current={step as FlowStep}
            requiereLanzamiento={maquina.requiere_lanzamiento}
          />
        )}

        {/* Modo Avería */}
        {step === 'averia' && (
          <StepContent
            title="⚠ Reportar avería"
            subtitle="Describe qué ocurre y propón la gravedad. La máquina sigue operativa — el admin decidirá si bloquearla o no."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">¿Quién reporta?</label>
                <TrabajadorGrid candidatos={candidatos} selected={averiaTecnico?.id ?? null} onSelect={setAveriaTecnico} />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">¿Qué ha pasado?</label>
                <textarea
                  value={averiaMotivo}
                  onChange={(e) => setAveriaMotivo(e.target.value)}
                  rows={4}
                  placeholder="Ejemplo: la máquina se ha parado a mitad del trabajo. Sale un código de error en pantalla."
                  className="input-field resize-none text-base"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
                  ¿Cómo de grave es? <span className="normal-case text-text-tertiary">(tu propuesta, el admin decide)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <SeveridadOption
                    active={averiaSeveridad === 'critica'}
                    onClick={() => setAveriaSeveridad('critica')}
                    tone="critica"
                    title="Crítica"
                    description="La máquina no se puede usar"
                  />
                  <SeveridadOption
                    active={averiaSeveridad === 'leve'}
                    onClick={() => setAveriaSeveridad('leve')}
                    tone="leve"
                    title="Leve"
                    description="Se puede seguir usando, pero hay algo raro"
                  />
                </div>
              </div>

              <button
                onClick={handleReportarAveria}
                disabled={!averiaMotivo.trim() || !averiaTecnico}
                className="w-full py-5 rounded-xl text-lg font-bold bg-averia text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-averia/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar aviso al admin
              </button>
              <button
                onClick={() => setStep('tecnico')}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Volver al uso normal
              </button>
            </div>
          </StepContent>
        )}

        {/* Paso 1: ¿Quién va a usar la máquina? */}
        {step === 'tecnico' && (
          <StepContent
            title="¿Quién va a usar la máquina?"
            subtitle="Toca a la persona que va a operar la máquina."
          >
            <TrabajadorGrid candidatos={candidatos} selected={tecnico?.id ?? null} onSelect={handleSelectTecnico} />
          </StepContent>
        )}

        {/* Paso 2 (opcional): ¿Quién lanza? */}
        {step === 'lanzamiento' && (
          <StepContent
            title="¿Quién lanza la máquina?"
            subtitle={`Esta máquina necesita que alguien pulse START después de preparar. Puede ser la misma persona que ${tecnico?.nombre}.`}
          >
            <TrabajadorGrid candidatos={candidatos} selected={tecnicoLanz?.id ?? null} onSelect={handleSelectLanz} />
          </StepContent>
        )}

        {/* Paso 3: ¿Qué proceso vas a hacer? */}
        {step === 'proceso' && (
          <StepContent
            title="¿Qué proceso vas a hacer?"
            subtitle="Elige el tipo de trabajo que vas a realizar en esta máquina."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {procesosDisponibles.map((p) => {
                const meta = TIPOS_PROCESO[p]
                const isSelected = tipoProceso === p
                return (
                  <button
                    key={p}
                    onClick={() => handleSelectProceso(p)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-4 min-h-[100px]
                      rounded-xl border-2 transition-all active:scale-[0.96]
                      ${isSelected
                        ? 'bg-primary-muted border-primary'
                        : 'bg-surface-2 border-border-subtle hover:border-primary/40 hover:bg-surface-3'
                      }
                    `}
                  >
                    <span className="text-3xl text-primary">{meta.icon}</span>
                    <span className={`text-sm font-semibold text-center ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                      {meta.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </StepContent>
        )}

        {/* Paso Confirmar */}
        {step === 'confirmar' && tecnico && tipoProceso && (
          <StepContent
            title="¿Empezamos?"
            subtitle="Revisa que todo esté bien y pulsa el botón para poner la máquina en marcha."
          >
            <div className="bg-surface-3 border border-border-subtle rounded-xl p-4 space-y-3">
              <SummaryRow icon="👤" label="Técnico" trabajador={tecnico} />
              {maquina.requiere_lanzamiento && tecnicoLanz && (
                <SummaryRow icon="▶" label="Lanza" trabajador={tecnicoLanz} />
              )}
              <SummaryRow icon={TIPOS_PROCESO[tipoProceso].icon} label="Proceso" value={TIPOS_PROCESO[tipoProceso].label} />
              <SummaryRow icon="🕐" label="Hora" value={hora} />
            </div>

            {!showAjustes ? (
              <button
                onClick={() => setShowAjustes(true)}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary mt-4 py-2 underline decoration-dotted"
              >
                Ajustar fecha, hora o añadir nota
              </button>
            ) : (
              <div className="mt-4 space-y-3 p-4 bg-surface-2 rounded-lg border border-border-subtle">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Hora</label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Nota (opcional)</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Cualquier cosa que quieras recordar..."
                    className="input-field resize-none text-sm"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmar}
              disabled={submitting}
              className="w-full mt-6 py-5 rounded-xl text-lg font-bold bg-primary text-text-inverse hover:bg-primary-light active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Guardando...' : 'Empezar ahora'}
            </button>
          </StepContent>
        )}

        {/* Navegación inferior — en todo paso salvo el primero */}
        {step !== 'averia' && step !== 'tecnico' && (
          <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-sm text-text-tertiary hover:text-text-secondary flex items-center gap-1.5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="10,3 5,8 10,13" />
              </svg>
              Atrás
            </button>
            <button onClick={onClose} className="text-sm text-text-tertiary hover:text-averia transition-colors">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// =============================================================================
// Sub-componentes
// =============================================================================

function StepIndicator({ current, requiereLanzamiento }: { current: FlowStep; requiereLanzamiento: boolean }) {
  const steps: FlowStep[] = [
    'tecnico',
    ...(requiereLanzamiento ? ['lanzamiento' as FlowStep] : []),
    'proceso',
    'confirmar',
  ]
  const currentIdx = steps.indexOf(current)

  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, idx) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`
              w-2 h-2 rounded-full transition-all
              ${idx < currentIdx ? 'bg-activa' : idx === currentIdx ? 'bg-primary w-8' : 'bg-surface-4'}
            `}
          />
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-activa/40' : 'bg-border-subtle'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function StepContent({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="animate-slide-in">
      <h3 className="text-xl font-bold text-text-primary mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-text-tertiary mb-5">{subtitle}</p>}
      {children}
    </div>
  )
}

function TrabajadorGrid({
  candidatos,
  selected,
  onSelect,
}: {
  candidatos: Trabajador[]
  selected: string | null
  onSelect: (t: Trabajador) => void
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {candidatos.map((t) => {
        const isSelected = selected === t.id
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
              active:scale-[0.96]
              ${isSelected
                ? 'bg-primary-muted border-primary'
                : 'bg-surface-2 border-border-subtle hover:border-primary/40 hover:bg-surface-3'
              }
            `}
          >
            <TrabajadorAvatar trabajador={t} size="lg" selected={isSelected} />
            <span className={`text-base font-semibold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
              {t.nombre}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SeveridadOption({
  active,
  onClick,
  tone,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  tone: 'critica' | 'leve'
  title: string
  description: string
}) {
  const palette = tone === 'critica'
    ? { border: 'border-averia', bg: 'bg-averia/10', text: 'text-averia', icon: '🔴' }
    : { border: 'border-parada', bg: 'bg-parada/10', text: 'text-parada', icon: '🟡' }

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all
        active:scale-[0.98]
        ${active
          ? `${palette.bg} ${palette.border}`
          : 'bg-surface-2 border-border-subtle hover:border-border-default hover:bg-surface-3'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{palette.icon}</span>
        <span className={`text-base font-bold ${active ? palette.text : 'text-text-primary'}`}>{title}</span>
      </div>
      <span className="text-xs text-text-tertiary leading-snug">{description}</span>
    </button>
  )
}

function SummaryRow({
  icon,
  label,
  trabajador,
  value,
}: {
  icon: string
  label: string
  trabajador?: Trabajador
  value?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-8 text-center">{icon}</span>
      <span className="text-xs text-text-tertiary uppercase tracking-wider w-20">{label}</span>
      {trabajador ? (
        <div className="flex items-center gap-2 flex-1">
          <TrabajadorAvatar trabajador={trabajador} size="sm" />
          <span className="text-base font-semibold text-text-primary">{trabajador.nombre}</span>
        </div>
      ) : (
        <span className="text-base font-mono text-text-primary">{value}</span>
      )}
    </div>
  )
}
