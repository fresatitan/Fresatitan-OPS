import { useState } from 'react'
import Badge from '../ui/Badge'
import { useWorkflowStore } from '../../store/workflowStore'
import { useTrabajadoresStore } from '../../store/trabajadoresStore'
import { useElapsedTime } from '../../hooks/useElapsedTime'
import { toIsoDateTime, formatTime } from '../../lib/utils'
import NuevoUsoModal from './NuevoUsoModal'
import CerrarUsoModal from './CerrarUsoModal'
import type { Maquina } from '../../types/database'

interface Props {
  maquina: Maquina
  /** Si se pasa, se muestra un botón 📋 que llama a este callback para abrir el historial. */
  onHistorial?: () => void
  /** Si se pasa, se muestra un botón de editar la máquina. */
  onEdit?: () => void
}

export default function MaquinaWorkCard({ maquina, onHistorial, onEdit }: Props) {
  const usos = useWorkflowStore((s) => s.usos)
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const activeUso = usos.find((u) => u.maquina_id === maquina.id && u.resultado === 'pendiente') ?? null
  const lastUso = !activeUso
    ? usos.find((u) => u.maquina_id === maquina.id && u.resultado !== 'pendiente') ?? null
    : null

  const [showNuevo, setShowNuevo] = useState(false)
  const [showCerrar, setShowCerrar] = useState(false)

  const isBusy = !!activeUso
  const canOperate = maquina.activa && maquina.estado_actual !== 'inactiva'

  return (
    <>
      <div
        className={`
          bg-surface-2 rounded-lg border transition-all duration-200 relative
          h-full flex flex-col
          ${maquina.estado_actual === 'avería' ? 'border-averia/30 animate-averia' : ''}
          ${maquina.estado_actual === 'activa' ? 'border-activa/20' : ''}
          ${maquina.estado_actual === 'mantenimiento' ? 'border-mantenimiento/20' : ''}
          ${!isBusy && maquina.estado_actual !== 'avería' ? 'border-border-subtle hover:border-border-default' : ''}
        `}
      >
        {/* Header — código, nombre, tipo y estado */}
        <div className="px-4 pt-3 pb-2.5 border-b border-border-subtle">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[11px] text-primary font-bold">{maquina.codigo}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
                  {maquina.tipo === 'impresora_3d' ? 'Impresora 3D' : maquina.tipo}
                </span>
              </div>
              <h4 className="text-sm text-text-primary font-semibold leading-snug truncate">{maquina.nombre}</h4>
            </div>
            <Badge estado={maquina.estado_actual} size="sm" />
          </div>
        </div>

        {/* Active uso indicator */}
        {activeUso && <ActiveUsoBar maquina={maquina} uso={activeUso} onFinish={() => setShowCerrar(true)} />}

        {/* Zona central informativa (crece para mantener altura homogénea) */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-center">
          {!isBusy && lastUso ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono text-text-tertiary tracking-wider uppercase">Último uso</span>
                <span className={`text-[10px] font-mono font-bold ${lastUso.resultado === 'ok' ? 'text-activa' : 'text-averia'}`}>
                  {lastUso.resultado.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1">
                <InfoRow label="Fecha" value={lastUso.fecha} mono />
                <InfoRow
                  label="Preparación"
                  value={`${formatTime(lastUso.hora_preparacion)} · ${getName(lastUso.tecnico_preparacion_id)}`}
                  highlight
                />
                {lastUso.hora_acabado && (
                  <InfoRow
                    label="Acabado"
                    value={`${formatTime(lastUso.hora_acabado)} · ${getName(lastUso.tecnico_acabado_id)}`}
                  />
                )}
              </div>
            </>
          ) : !isBusy ? (
            <div className="text-center py-2">
              <p className="text-[11px] text-text-tertiary">Sin trabajos registrados</p>
              {maquina.ubicacion && (
                <p className="text-[10px] text-text-tertiary mt-1 font-mono">{maquina.ubicacion}</p>
              )}
            </div>
          ) : null}
        </div>

        {/* Acciones — siempre en la misma línea gracias al flex-col + mt-auto */}
        <div className="px-4 pt-0 pb-3 mt-auto flex gap-2">
          {!isBusy ? (
            <button
              onClick={() => setShowNuevo(true)}
              disabled={!canOperate}
              className="flex-1 px-3 py-2.5 rounded text-xs font-semibold bg-primary text-text-inverse hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Nuevo uso
            </button>
          ) : (
            <button
              onClick={() => setShowCerrar(true)}
              className="flex-1 px-3 py-2.5 rounded text-xs font-semibold bg-activa text-white hover:opacity-90 transition-colors"
            >
              Cerrar uso
            </button>
          )}

          {onHistorial && (
            <button
              onClick={onHistorial}
              title="Ver historial de averías"
              aria-label="Ver historial de averías"
              className="
                shrink-0 px-2.5 py-2.5 rounded text-xs font-medium
                bg-surface-3 border border-border-subtle text-text-secondary
                hover:bg-surface-4 hover:text-primary hover:border-primary/40
                transition-colors flex items-center justify-center gap-1.5
              "
            >
              <HistoryIcon />
              <span className="hidden md:inline">Historial</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar máquina"
              aria-label="Editar máquina"
              className="
                shrink-0 px-2.5 py-2.5 rounded text-xs font-medium
                bg-surface-3 border border-border-subtle text-text-secondary
                hover:bg-surface-4 hover:text-text-primary
                transition-colors
              "
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>

      {canOperate && <NuevoUsoModal open={showNuevo} onClose={() => setShowNuevo(false)} maquina={maquina} />}
      {activeUso && (
        <CerrarUsoModal open={showCerrar} onClose={() => setShowCerrar(false)} maquina={maquina} uso={activeUso} />
      )}
    </>
  )
}

function ActiveUsoBar({
  maquina,
  uso,
  onFinish,
}: {
  maquina: Maquina
  uso: { fecha: string; hora_preparacion: string; tecnico_preparacion_id: string | null; tecnico_lanzamiento_id: string | null }
  onFinish: () => void
}) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))

  return (
    <div className="px-4 py-2.5 bg-activa/5 border-b border-activa/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-activa animate-pulse shrink-0" />
          <span className="text-[11px] text-activa font-medium">EN USO</span>
        </div>
        <span className="font-mono text-xs text-activa tabular-nums shrink-0">{elapsed}</span>
      </div>
      <div className="mt-1.5 space-y-0.5">
        {uso.tecnico_preparacion_id && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-tertiary">Prep.</span>
            <span className="text-text-secondary">{formatTime(uso.hora_preparacion)} · {getName(uso.tecnico_preparacion_id)}</span>
          </div>
        )}
        {maquina.requiere_lanzamiento && uso.tecnico_lanzamiento_id && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-tertiary">Lanz.</span>
            <span className="text-text-secondary">{getName(uso.tecnico_lanzamiento_id)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end mt-1">
        <button
          onClick={onFinish}
          className="text-[10px] font-medium text-primary hover:text-primary-light transition-colors uppercase tracking-wider"
        >
          Cerrar uso ▸
        </button>
      </div>
    </div>
  )
}

function HistoryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4 8,8 10.5,9.5" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  )
}

function InfoRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-text-tertiary">{label}</span>
      <span className={`${mono ? 'font-mono text-[11px]' : ''} ${highlight ? 'text-primary font-medium' : 'text-text-secondary'}`}>
        {value}
      </span>
    </div>
  )
}
