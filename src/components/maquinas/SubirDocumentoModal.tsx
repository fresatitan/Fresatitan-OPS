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
import type { Maquina, MaquinaEstado } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
  averia: MaquinaEstado
}

/**
 * Modal ligero para subir partes del técnico, facturas o fotos a una avería
 * (abierta o ya cerrada). Independiente del modal de resolución.
 *
 * Flujo de uso:
 *   · /alertas  → pulsar "📎 Añadir documento" en una avería abierta.
 *   · /auditoria → abrir historial → cualquier avería → "+ Añadir documento".
 */
export default function SubirDocumentoModal({ open, onClose, maquina, averia }: Props) {
  const refetchDocs = useWorkflowStore((s) => s.refetchAveriaDocumentos)
  const adminUser = useAuthStore((s) => s.user)

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
    setArchivos([])
    setSubmitting(false)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (archivos.length === 0) {
      toast.error('Selecciona al menos un archivo')
      return
    }
    setSubmitting(true)
    const results = await Promise.all(
      archivos.map((file) =>
        uploadAveriaDocumento({
          maquinaId: maquina.id,
          maquinaEstadoId: averia.id,
          file,
          subidoPor: adminUser?.id ?? null,
        }),
      ),
    )
    const errores = results.filter((r) => !r.ok)
    const exitos = results.length - errores.length

    if (errores.length > 0) {
      errores.forEach((r) => toast.error(r.error ?? 'Error al subir'))
    }
    if (exitos > 0) {
      toast.success(`${exitos} documento${exitos === 1 ? '' : 's'} subido${exitos === 1 ? '' : 's'}`)
    }

    await refetchDocs()
    reset()
    onClose()
  }

  const fechaAveria = new Date(averia.timestamp).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <Modal open={open} onClose={handleClose} title={`Añadir documentos · ${maquina.codigo}`} size="lg">
      <div className="space-y-4">
        <div className="bg-surface-2 border border-border-subtle rounded-lg p-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">Avería</span>
            <span className="font-mono">{fechaAveria}</span>
            {averia.cerrada_en ? (
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-4 text-text-tertiary">
                CERRADA
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-averia/15 text-averia">
                ABIERTA
              </span>
            )}
          </div>
          {averia.motivo && (
            <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">
              {averia.motivo}
            </p>
          )}
        </div>

        {/* Drop zone */}
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
          <div className="space-y-2">
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
            disabled={submitting || archivos.length === 0}
            className="flex-1 px-3 py-2.5 rounded text-sm font-semibold bg-primary text-text-inverse hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Subiendo…' : `Subir ${archivos.length || ''}`}
          </button>
        </div>
      </div>
    </Modal>
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
