import { useState, useRef, useMemo } from 'react'
import Modal from '../ui/Modal'
import { useWorkflowStore } from '../../store/workflowStore'
import { useAuthStore } from '../../store/authStore'
import {
  uploadAveriaDocumento,
  EXTS_ACEPTADOS,
  MIME_ACEPTADOS,
  MAX_BYTES,
} from '../../lib/averiaDocumentos'
import type { Maquina } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

/**
 * Modal que se abre cuando el admin pulsa "Marcar como resuelta" en una avería.
 *
 * Obligatorio (requisito regulatorio sanitario): capturar las medidas correctoras
 * aplicadas y cualquier parte/informe del técnico como adjunto.
 *
 * Campos:
 *   · Descripción de la resolución (obligatorio)
 *   · Nombre del técnico que intervino (opcional)
 *   · Fecha de la intervención (opcional, por defecto hoy)
 *   · Documentos adjuntos: PDF, JPG, PNG, HEIC, WEBP (múltiples)
 */
export default function ResolverAveriaModal({ open, onClose, maquina }: Props) {
  const resolverAveria = useWorkflowStore((s) => s.resolverAveria)
  const refetchDocs = useWorkflowStore((s) => s.refetchAveriaDocumentos)
  const adminUser = useAuthStore((s) => s.user)

  const [descripcion, setDescripcion] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [archivos, setArchivos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalBytes = useMemo(() => archivos.reduce((acc, f) => acc + f.size, 0), [archivos])

  const addFiles = (files: FileList | File[]) => {
    const nuevos: File[] = []
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" supera ${MAX_BYTES / 1024 / 1024}MB`)
        continue
      }
      if (!MIME_ACEPTADOS.includes(f.type)) {
        toast.error(`"${f.name}" tiene un formato no soportado`)
        continue
      }
      nuevos.push(f)
    }
    if (nuevos.length) setArchivos((prev) => [...prev, ...nuevos])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    // Permitir volver a seleccionar el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const removeFile = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx))
  }

  const reset = () => {
    setDescripcion('')
    setTecnico('')
    setFecha(new Date().toISOString().slice(0, 10))
    setArchivos([])
    setSubmitting(false)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!descripcion.trim()) {
      toast.error('La descripción de la resolución es obligatoria')
      return
    }
    setSubmitting(true)

    // 1. Cerrar la avería en DB + recibir id de la fila cerrada
    const maquinaEstadoId = await resolverAveria({
      maquinaId: maquina.id,
      adminId: adminUser?.id ?? null,
      resolucionDescripcion: descripcion.trim(),
      tecnicoIntervencion: tecnico.trim() || null,
      fechaIntervencion: fecha || null,
    })

    if (!maquinaEstadoId) {
      setSubmitting(false)
      toast.error('No se pudo cerrar la avería. Revisa los datos.')
      return
    }

    // 2. Subir cada archivo en paralelo
    if (archivos.length > 0) {
      const uploads = archivos.map((file) =>
        uploadAveriaDocumento({
          maquinaId: maquina.id,
          maquinaEstadoId,
          file,
          subidoPor: adminUser?.id ?? null,
        }),
      )
      const results = await Promise.all(uploads)
      const errores = results.filter((r) => !r.ok)
      if (errores.length > 0) {
        errores.forEach((r) => toast.error(r.error ?? 'Error subiendo documento'))
      }
      await refetchDocs()
    }

    toast.success(`${maquina.codigo} marcada como resuelta`, { icon: '✓' })
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Resolver avería · ${maquina.codigo}`} size="lg">
      <div className="space-y-5">
        <div className="bg-averia/5 border border-averia/20 rounded-lg p-3 text-[11px] text-text-secondary leading-relaxed">
          Completa los datos de la resolución. Este registro queda en el historial
          de la máquina para cumplir con los requisitos de trazabilidad sanitaria.
        </div>

        <Field label="¿Qué se ha hecho?" required>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            placeholder="Describe las medidas correctoras aplicadas (ej: cambiado sensor óptico del eje Z, calibrado, comprobada precisión con pieza testigo)."
            className="input-field resize-none text-sm"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Técnico que intervino">
            <input
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              placeholder="Nombre (interno o externo)"
              className="input-field text-sm"
            />
          </Field>
          <Field label="Fecha de intervención">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input-field font-mono text-sm"
            />
          </Field>
        </div>

        {/* Drop zone de archivos */}
        <div>
          <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-2">
            Documentos adjuntos
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="
              cursor-pointer rounded-xl border-2 border-dashed border-border-subtle
              bg-surface-2 p-6 text-center transition-colors
              hover:border-primary/50 hover:bg-surface-3
            "
          >
            <div className="text-3xl mb-2">📎</div>
            <div className="text-sm font-semibold text-text-primary">
              Arrastra archivos aquí o toca para seleccionar
            </div>
            <div className="text-[11px] text-text-tertiary mt-1">
              Partes del técnico, facturas, fotos · PDF, JPG, PNG, HEIC · máx. {MAX_BYTES / 1024 / 1024}MB por archivo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={EXTS_ACEPTADOS}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {archivos.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-text-tertiary uppercase tracking-wider">
                <span>{archivos.length} archivo{archivos.length === 1 ? '' : 's'}</span>
                <span className="font-mono">{formatBytes(totalBytes)}</span>
              </div>
              <ul className="space-y-1.5">
                {archivos.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center gap-2 bg-surface-3 border border-border-subtle rounded px-3 py-2 text-xs"
                  >
                    <span className="text-base">{iconForMime(f.type)}</span>
                    <span className="flex-1 truncate text-text-primary">{f.name}</span>
                    <span className="text-text-tertiary font-mono tabular-nums">{formatBytes(f.size)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(idx)
                      }}
                      className="text-text-tertiary hover:text-averia transition-colors"
                      aria-label="Quitar archivo"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t border-border-subtle">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-3 py-2.5 rounded text-sm font-medium bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !descripcion.trim()}
            className="flex-1 px-3 py-2.5 rounded text-sm font-semibold bg-activa text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando…' : 'Cerrar avería'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-averia">*</span>}
      </label>
      {children}
    </div>
  )
}

function iconForMime(type: string): string {
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('image/')) return '🖼'
  return '📎'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
