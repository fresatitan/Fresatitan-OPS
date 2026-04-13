import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { useWorkflowStore } from '../../store/workflowStore'
import type { Maquina, TipoMaquina } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Maquina
}

export default function MaquinaFormModal({ open, onClose, initial }: Props) {
  const addMaquina = useWorkflowStore((s) => s.addMaquina)
  const updateMaquina = useWorkflowStore((s) => s.updateMaquina)

  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoMaquina>('fresadora')
  const [requierePreparacion, setRequierePreparacion] = useState(false)
  const [requiereLanzamiento, setRequiereLanzamiento] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  useEffect(() => {
    if (open) {
      setCodigo(initial?.codigo ?? '')
      setNombre(initial?.nombre ?? '')
      const t = initial?.tipo ?? 'fresadora'
      setTipo(t)
      // Default: sinterizadoras requieren preparación, fresadoras no
      setRequierePreparacion(initial?.requiere_preparacion ?? (t === 'sinterizadora'))
      setRequiereLanzamiento(initial?.requiere_lanzamiento ?? false)
      setDescripcion(initial?.descripcion ?? '')
      setUbicacion(initial?.ubicacion ?? '')
    }
  }, [open, initial])

  // Cuando cambia el tipo y es una máquina nueva, auto-ajustar el default
  const handleTipoChange = (newTipo: TipoMaquina) => {
    setTipo(newTipo)
    if (!initial) {
      setRequierePreparacion(newTipo === 'sinterizadora')
    }
  }

  const canSubmit = codigo.trim() && nombre.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    const payload = {
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      tipo,
      requiere_preparacion: requierePreparacion,
      requiere_lanzamiento: requiereLanzamiento,
      descripcion: descripcion.trim() || null,
      ubicacion: ubicacion.trim() || null,
    }
    if (initial) {
      updateMaquina(initial.id, payload)
      toast.success(`${codigo.trim()} actualizada`)
    } else {
      addMaquina(payload)
      toast.success(`${codigo.trim()} creada`)
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? `Editar ${initial.codigo}` : 'Nueva máquina'}>
      <div className="space-y-3">
        <Field label="Código">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="REF-000"
            className="input-field font-mono"
            autoFocus
          />
        </Field>

        <Field label="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la máquina"
            className="input-field"
          />
        </Field>

        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(['fresadora', 'sinterizadora'] as TipoMaquina[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTipoChange(t)}
                className={`
                  px-3 py-2 rounded border text-xs font-medium transition-colors
                  ${tipo === t
                    ? 'bg-primary-muted border-primary/30 text-primary'
                    : 'bg-surface-3 border-border-subtle text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {t === 'fresadora' ? 'Fresadora' : 'Sinterizadora'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Requiere preparación">
          <button
            onClick={() => setRequierePreparacion(!requierePreparacion)}
            className={`
              w-full px-3 py-2.5 rounded border text-xs font-medium text-left transition-colors flex items-center justify-between
              ${requierePreparacion
                ? 'bg-primary-muted border-primary/30 text-primary'
                : 'bg-surface-3 border-border-subtle text-text-secondary'
              }
            `}
          >
            <span>{requierePreparacion ? 'Sí — el trabajador indica quién prepara' : 'No — va directo a producción'}</span>
            <span className={`w-8 h-4 rounded-full relative ${requierePreparacion ? 'bg-primary' : 'bg-surface-4'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${requierePreparacion ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
          <p className="text-[10px] text-text-tertiary mt-1">
            Si se activa, el trabajador seleccionará quién prepara la máquina antes de empezar.
          </p>
        </Field>

        <Field label="Requiere técnico de lanzamiento">
          <button
            onClick={() => setRequiereLanzamiento(!requiereLanzamiento)}
            className={`
              w-full px-3 py-2.5 rounded border text-xs font-medium text-left transition-colors flex items-center justify-between
              ${requiereLanzamiento
                ? 'bg-primary-muted border-primary/30 text-primary'
                : 'bg-surface-3 border-border-subtle text-text-secondary'
              }
            `}
          >
            <span>{requiereLanzamiento ? 'Sí — pulsación manual de START' : 'No — arranque automático'}</span>
            <span className={`w-8 h-4 rounded-full relative ${requiereLanzamiento ? 'bg-primary' : 'bg-surface-4'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${requiereLanzamiento ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
          <p className="text-[10px] text-text-tertiary mt-1">
            Solo CNC tradicional (Fanuc, Biomill). UP3D y sinterizadoras no lo necesitan.
          </p>
        </Field>

        <Field label="Ubicación">
          <input
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Zona CNC / Zona Sinter. / ..."
            className="input-field"
          />
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles adicionales..."
            rows={2}
            className="input-field resize-none"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded text-xs font-medium bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-3 py-2.5 rounded text-xs font-medium bg-primary text-text-inverse transition-colors hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {initial ? 'Guardar cambios' : 'Crear máquina'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
