import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import { useElapsedTime } from '../../hooks/useElapsedTime'
import { toIsoDateTime, formatTime } from '../../lib/utils'
import type { Maquina, UsoEquipo } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
  uso: UsoEquipo
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Step = 'cierre' | 'resultado' | 'problema'

/**
 * Flujo simplificado para cerrar un uso:
 *  1. "¿Quién cierra?" (timer visible arriba)
 *  2. "¿Todo bien?" → Sí 👍 / No 👎
 *  3. (solo si No) "¿Qué pasó?"
 * Al final, cierra el uso con toast verde.
 */
export default function CerrarUsoModal({ open, onClose, maquina, uso }: Props) {
  const cerrarUso = useWorkflowStore((s) => s.cerrarUso)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))

  const [step, setStep] = useState<Step>('cierre')
  const [tecnicoCierre, setTecnicoCierre] = useState<Trabajador | null>(null)
  const [problema, setProblema] = useState('')
  const [showAjustes, setShowAjustes] = useState(false)
  const [horaAcabado, setHoraAcabado] = useState(nowTime())

  useEffect(() => {
    if (open) {
      setStep('cierre')
      setTecnicoCierre(null)
      setProblema('')
      setShowAjustes(false)
      setHoraAcabado(nowTime())
    }
  }, [open])

  const handleSelectTecnico = (t: Trabajador) => {
    setTecnicoCierre(t)
    setTimeout(() => setStep('resultado'), 150)
  }

  const [submitting, setSubmitting] = useState(false)

  const finalizar = async (res: 'ok' | 'ko', incidencias: string[] = []) => {
    if (!tecnicoCierre) return
    setSubmitting(true)
    await cerrarUso({
      uso_id: uso.id,
      hora_acabado: horaAcabado,
      tecnico_acabado_id: tecnicoCierre.id,
      resultado: res,
      incidencias,
    })
    setSubmitting(false)
    toast.success(
      res === 'ok'
        ? `${maquina.codigo} cerrada — ¡buen trabajo!`
        : `${maquina.codigo} cerrada con incidencia`,
      { icon: res === 'ok' ? '✓' : '⚠' }
    )
    onClose()
  }

  const handleResultado = (res: 'ok' | 'ko') => {
    if (res === 'ok') {
      finalizar('ok')
    } else {
      setStep('problema')
    }
  }

  const handleGuardarProblema = () => {
    const incidencias = problema
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    finalizar('ko', incidencias.length > 0 ? incidencias : ['Incidencia sin descripción'])
  }

  const handleBack = () => {
    if (step === 'problema') setStep('resultado')
    else if (step === 'resultado') {
      setTecnicoCierre(null)
      setStep('cierre')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`${maquina.codigo} · ${maquina.nombre}`} size="lg">
      <div className="min-h-[360px]">
        {/* Cronómetro destacado — siempre visible */}
        <div className="flex items-center justify-between bg-activa/5 border border-activa/20 rounded-xl px-4 py-3 mb-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-activa">En uso desde</div>
            <div className="text-sm text-text-secondary mt-0.5">
              {formatTime(uso.hora_preparacion)} · {getName(uso.tecnico_preparacion_id)}
              {maquina.requiere_lanzamiento && uso.tecnico_lanzamiento_id && (
                <> → {getName(uso.tecnico_lanzamiento_id)}</>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Tiempo</div>
            <div className="text-2xl font-mono text-activa tabular-nums font-bold leading-none mt-1">{elapsed}</div>
          </div>
        </div>

        <StepIndicator step={step} />

        {/* Paso 1: ¿Quién cierra? */}
        {step === 'cierre' && (
          <StepContent
            title="¿Quién cierra el trabajo?"
            subtitle="Toca a la persona que está recogiendo el resultado de la máquina."
          >
            <TrabajadorGrid candidatos={candidatos} selected={tecnicoCierre?.id ?? null} onSelect={handleSelectTecnico} />
            {!showAjustes ? (
              <button
                onClick={() => setShowAjustes(true)}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary mt-4 py-2 underline decoration-dotted"
              >
                Ajustar hora de cierre
              </button>
            ) : (
              <div className="mt-4 p-3 bg-surface-3 rounded-lg border border-border-subtle">
                <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Hora de cierre</label>
                <input
                  type="time"
                  value={horaAcabado}
                  onChange={(e) => setHoraAcabado(e.target.value)}
                  className="input-field font-mono text-sm"
                />
              </div>
            )}
          </StepContent>
        )}

        {/* Paso 2: ¿Todo bien? */}
        {step === 'resultado' && tecnicoCierre && (
          <StepContent
            title="¿Ha ido todo bien?"
            subtitle="Si hubo algún problema, podrás describirlo en el siguiente paso."
          >
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleResultado('ok')}
                disabled={submitting}
                className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-activa/30 bg-activa/5 hover:bg-activa/10 hover:border-activa active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="w-16 h-16 rounded-full bg-activa/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-activa">Todo bien</span>
                <span className="text-xs text-text-tertiary">Cerrar sin incidencias</span>
              </button>

              <button
                onClick={() => handleResultado('ko')}
                className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-averia/30 bg-averia/5 hover:bg-averia/10 hover:border-averia active:scale-[0.97] transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-averia/20 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="8" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-averia">Hubo un problema</span>
                <span className="text-xs text-text-tertiary">Contar qué pasó</span>
              </button>
            </div>
          </StepContent>
        )}

        {/* Paso 3: ¿Qué pasó? */}
        {step === 'problema' && (
          <StepContent
            title="¿Qué pasó?"
            subtitle="Escribe una línea por cada problema. Así el jefe puede revisarlo después."
          >
            <textarea
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              autoFocus
              rows={5}
              placeholder="Ejemplo:&#10;La fresa se rompió a los 20 minutos&#10;La pieza salió movida"
              className="input-field resize-none text-base leading-relaxed"
            />
            <button
              onClick={handleGuardarProblema}
              disabled={submitting}
              className="w-full mt-5 py-5 rounded-xl text-lg font-bold bg-averia text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-averia/20 disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Guardando...' : 'Guardar y cerrar'}
            </button>
          </StepContent>
        )}

        {step !== 'cierre' && (
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

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ['cierre', 'resultado', 'problema']
  const currentIdx = steps.indexOf(step)
  return (
    <div className="flex items-center gap-2 mb-5">
      {['cierre', 'resultado'].map((s, idx) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={`
              w-2 h-2 rounded-full transition-all
              ${idx < currentIdx ? 'bg-activa' : idx === currentIdx ? 'bg-primary w-8' : 'bg-surface-4'}
            `}
          />
          {idx < 1 && <div className={`flex-1 h-px ${idx < currentIdx ? 'bg-activa/40' : 'bg-border-subtle'}`} />}
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
