import { useMemo, useState } from 'react'
import Modal from '../ui/Modal'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { getSignedUrl } from '../../lib/averiaDocumentos'
import { SEVERIDADES } from '../../constants/estados'
import { exportHistorialAveriasPdf } from '../../lib/pdfExport'
import type { Maquina, MaquinaEstado, AveriaDocumento } from '../../types/database'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  maquina: Maquina
}

type Filter = 'todas' | 'abiertas' | 'cerradas'

/**
 * Historial de averías de una máquina — timeline completo para auditoría.
 *
 * Muestra cada avería con:
 *   · Fecha/hora del reporte, severidad propuesta y final
 *   · Motivo reportado por el trabajador
 *   · Medidas correctoras aplicadas (resolución)
 *   · Técnico que intervino + fecha de intervención
 *   · Documentos adjuntos descargables
 *   · Estado actual (abierta / cerrada)
 *
 * Botón "Exportar historial PDF" para presentar ante inspecciones sanitarias.
 */
export default function HistorialAveriasModal({ open, onClose, maquina }: Props) {
  const getAveriasByMaquina = useWorkflowStore((s) => s.getAveriasByMaquina)
  const getDocumentosByAveria = useWorkflowStore((s) => s.getDocumentosByAveria)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const [filter, setFilter] = useState<Filter>('todas')
  const [exporting, setExporting] = useState(false)

  const averias = useMemo(() => getAveriasByMaquina(maquina.id), [getAveriasByMaquina, maquina.id])

  const filtered = useMemo(() => {
    if (filter === 'abiertas') return averias.filter((a) => !a.cerrada_en)
    if (filter === 'cerradas') return averias.filter((a) => !!a.cerrada_en)
    return averias
  }, [averias, filter])

  const stats = useMemo(() => ({
    total: averias.length,
    abiertas: averias.filter((a) => !a.cerrada_en).length,
    cerradas: averias.filter((a) => !!a.cerrada_en).length,
    criticas: averias.filter((a) => a.severidad === 'critica').length,
    leves: averias.filter((a) => a.severidad === 'leve').length,
  }), [averias])

  const handleExport = async () => {
    setExporting(true)
    try {
      // Pasamos al export el historial completo + el map de documentos por avería
      const docsByAveria: Record<string, AveriaDocumento[]> = {}
      for (const a of averias) {
        docsByAveria[a.id] = getDocumentosByAveria(a.id)
      }
      await exportHistorialAveriasPdf({
        maquina,
        averias,
        docsByAveria,
        getName,
      })
      toast.success('Historial exportado')
    } catch (err) {
      console.error(err)
      toast.error('No se pudo exportar el historial')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Historial de averías · ${maquina.codigo}`} size="xl">
      <div className="space-y-4">
        {/* Cabecera con stats + export */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Abiertas" value={stats.abiertas} tone={stats.abiertas > 0 ? 'averia' : undefined} />
            <StatPill label="Cerradas" value={stats.cerradas} />
            <StatPill label="Críticas" value={stats.criticas} tone="averia" />
            <StatPill label="Leves" value={stats.leves} tone="parada" />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || averias.length === 0}
            className="px-3 py-2 rounded text-xs font-semibold bg-primary-muted border border-primary/30 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? 'Generando…' : '📑 Exportar PDF'}
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 text-xs">
          {(['todas', 'abiertas', 'cerradas'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded font-medium transition-colors capitalize
                ${filter === f
                  ? 'bg-primary-muted border border-primary/30 text-primary'
                  : 'bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-8 text-center">
            <p className="text-sm text-text-tertiary">
              {averias.length === 0
                ? 'Esta máquina no tiene averías registradas. 🎉'
                : 'No hay averías con este filtro.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((averia) => (
              <AveriaHistorialCard
                key={averia.id}
                averia={averia}
                documentos={getDocumentosByAveria(averia.id)}
                getName={getName}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'averia' | 'parada'
}) {
  const toneClass = tone === 'averia'
    ? 'bg-averia-muted text-averia border-averia/20'
    : tone === 'parada'
    ? 'bg-parada/10 text-parada border-parada/20'
    : 'bg-surface-3 text-text-secondary border-border-subtle'
  return (
    <div className={`border rounded px-2.5 py-1 ${toneClass} flex items-center gap-1.5`}>
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-sm font-mono font-bold tabular-nums">{value}</span>
    </div>
  )
}

function AveriaHistorialCard({
  averia,
  documentos,
  getName,
}: {
  averia: MaquinaEstado
  documentos: AveriaDocumento[]
  getName: (id: string | null) => string
}) {
  const abierta = !averia.cerrada_en
  const severidadTone = averia.severidad === 'critica' ? 'averia' : 'parada'

  const fechaReporte = new Date(averia.timestamp).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const fechaCierre = averia.cerrada_en
    ? new Date(averia.cerrada_en).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const duracionMs = averia.cerrada_en
    ? new Date(averia.cerrada_en).getTime() - new Date(averia.timestamp).getTime()
    : Date.now() - new Date(averia.timestamp).getTime()
  const duracionHoras = Math.max(1, Math.round(duracionMs / 36e5))

  return (
    <div className={`
      rounded-lg border-2 p-4
      ${abierta ? 'bg-averia/5 border-averia/30' : 'bg-surface-2 border-border-subtle'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded ${
            abierta ? 'bg-averia/15 text-averia' : 'bg-surface-4 text-text-secondary'
          }`}>
            {abierta ? 'ABIERTA' : 'CERRADA'}
          </span>
          {averia.severidad && (
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${
              severidadTone === 'averia' ? 'bg-averia/15 text-averia' : 'bg-parada/15 text-parada'
            }`}>
              {severidadTone === 'averia' ? '🔴' : '🟡'} {SEVERIDADES[averia.severidad].label}
            </span>
          )}
          {!averia.severidad_confirmada_por_admin && abierta && (
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-surface-4 text-text-tertiary">
              Sin confirmar
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-text-tertiary">
          {duracionHoras}h {abierta ? 'abierta' : 'hasta resolución'}
        </span>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Reportada</div>
          <div className="text-text-primary font-mono">{fechaReporte}</div>
          <div className="text-text-secondary mt-0.5">por {getName(averia.usuario_id)}</div>
        </div>
        {fechaCierre && (
          <div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Cerrada</div>
            <div className="text-text-primary font-mono">{fechaCierre}</div>
            {averia.cerrada_por && (
              <div className="text-text-secondary mt-0.5">por {getName(averia.cerrada_por)}</div>
            )}
          </div>
        )}
      </div>

      {/* Motivo */}
      {averia.motivo && (
        <div className="mb-3">
          <div className="text-[10px] text-averia uppercase tracking-wider mb-1">Motivo reportado</div>
          <p className="text-xs text-text-primary bg-averia-muted/20 border border-averia/15 rounded px-3 py-2 leading-relaxed">
            ⚠ {averia.motivo}
          </p>
        </div>
      )}

      {/* Resolución */}
      {averia.resolucion_descripcion && (
        <div className="mb-3">
          <div className="text-[10px] text-activa uppercase tracking-wider mb-1">Medidas correctoras</div>
          <p className="text-xs text-text-primary bg-activa/10 border border-activa/20 rounded px-3 py-2 leading-relaxed">
            ✓ {averia.resolucion_descripcion}
          </p>
          {(averia.tecnico_intervencion || averia.fecha_intervencion) && (
            <div className="mt-2 flex items-center gap-3 text-[11px] text-text-tertiary">
              {averia.tecnico_intervencion && (
                <span>Técnico: <span className="text-text-secondary font-medium">{averia.tecnico_intervencion}</span></span>
              )}
              {averia.fecha_intervencion && (
                <span>Intervención: <span className="text-text-secondary font-mono">{averia.fecha_intervencion}</span></span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Documentos */}
      {documentos.length > 0 && (
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
            Documentos ({documentos.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {documentos.map((doc) => (
              <DocumentoChip key={doc.id} documento={doc} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentoChip({ documento }: { documento: AveriaDocumento }) {
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setLoading(true)
    const url = await getSignedUrl(documento.storage_path)
    setLoading(false)
    if (!url) {
      toast.error('No se pudo generar el enlace de descarga')
      return
    }
    window.open(url, '_blank', 'noopener')
  }

  const icon = documento.mime_type === 'application/pdf'
    ? '📄'
    : documento.mime_type?.startsWith('image/')
    ? '🖼'
    : '📎'

  return (
    <button
      onClick={handleOpen}
      disabled={loading}
      className="
        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded
        bg-surface-3 border border-border-subtle text-text-primary text-xs
        hover:bg-surface-4 hover:border-primary/30 transition-colors
        disabled:opacity-50
      "
    >
      <span>{icon}</span>
      <span className="max-w-[180px] truncate">{documento.nombre_original}</span>
      <span className="text-text-tertiary">↗</span>
    </button>
  )
}
