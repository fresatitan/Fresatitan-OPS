import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import TrabajadorAvatar from '../ui/TrabajadorAvatar'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore, type Trabajador } from '../../store/trabajadoresStore'
import type { Maquina } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

/**
 * Modal para registrar una preparación (limpieza/acondicionamiento) de una máquina.
 *
 * Flujo mínimo:
 *   1. Grid de trabajadores → tocar su nombre (se queda seleccionado).
 *   2. Campo opcional de observaciones.
 *   3. Botón grande "Registrar preparación".
 *
 * No cambia el estado de la máquina. Es un simple log que el admin podrá
 * consultar para verificar si la máquina ha sido preparada hoy.
 */
export default function StartPreparacionModal({ open, onClose, maquina }: Props) {
  const registrarPreparacion = useWorkflowStore((s) => s.registrarPreparacion)
  const trabajadores = useTrabajadoresStore((s) => s.trabajadores)
  const candidatos = trabajadores.filter((t) => t.activo && t.puede_operar)

  const [tecnico, setTecnico] = useState<Trabajador | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTecnico(null)
      setObservaciones('')
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!tecnico) return
    setSubmitting(true)
    const id = await registrarPreparacion({
      maquinaId: maquina.id,
      trabajadorId: tecnico.id,
      observaciones: observaciones.trim() || null,
    })
    setSubmitting(false)
    if (!id) {
      toast.error('No se pudo registrar la preparación')
      return
    }
    toast.success(`${maquina.codigo} preparada · ${tecnico.nombre}`, { icon: '🧹' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Preparación · ${maquina.codigo}`} size="lg">
      <div className="min-h-[360px]">
        <h3 className="text-xl font-bold text-text-primary mb-1">
          ¿Quién prepara la máquina?
        </h3>
        <p className="text-sm text-text-tertiary mb-5">
          Selecciona a la persona que está limpiando o acondicionando {maquina.nombre}.
        </p>

        {/* Grid de trabajadores */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-5">
          {candidatos.map((t) => {
            const isSelected = tecnico?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTecnico(t)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  active:scale-[0.96]
                  ${isSelected
                    ? 'bg-activa/10 border-activa'
                    : 'bg-surface-2 border-border-subtle hover:border-activa/40 hover:bg-surface-3'
                  }
                `}
              >
                <TrabajadorAvatar trabajador={t} size="lg" selected={isSelected} />
                <span className={`text-base font-semibold ${isSelected ? 'text-activa' : 'text-text-primary'}`}>
                  {t.nombre}
                </span>
              </button>
            )
          })}
        </div>

        {/* Observaciones opcionales */}
        <div className="mb-5">
          <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
            Observaciones <span className="normal-case text-text-tertiary">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Ej: limpieza completa tras cambio de material"
            className="input-field resize-none text-sm"
          />
        </div>

        {/* Acción principal */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !tecnico}
          className="
            w-full py-5 rounded-xl text-lg font-bold bg-activa text-white
            hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-activa/20
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {submitting ? 'Guardando…' : 'Registrar preparación'}
        </button>

        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full mt-3 text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
