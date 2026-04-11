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
}

export default function MaquinaWorkCard({ maquina }: Props) {
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
          ${maquina.estado_actual === 'avería' ? 'border-averia/30 animate-averia' : ''}
          ${maquina.estado_actual === 'activa' ? 'border-activa/20' : ''}
          ${maquina.estado_actual === 'mantenimiento' ? 'border-mantenimiento/20' : ''}
          ${!isBusy && maquina.estado_actual !== 'avería' ? 'border-border-subtle hover:border-border-default' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs text-primary font-medium shrink-0">{maquina.codigo}</span>
            <span className="text-[10px] text-text-tertiary">|</span>
            <span className="text-sm text-text-primary font-medium truncate">{maquina.nombre}</span>
          </div>
          <Badge estado={maquina.estado_actual} size="sm" />
        </div>

        {/* Active uso indicator */}
        {activeUso && <ActiveUsoBar maquina={maquina} uso={activeUso} onFinish={() => setShowCerrar(true)} />}

        {/* Last completed uso */}
        {!isBusy && lastUso && (
          <div className="px-4 py-2.5 bg-surface-3/50 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-text-tertiary tracking-wider">ÚLTIMO USO</span>
              <span className={`text-[10px] font-mono font-medium ${lastUso.resultado === 'ok' ? 'text-activa' : 'text-averia'}`}>
                {lastUso.resultado.toUpperCase()}
              </span>
            </div>
            <InfoRow label="Fecha" value={lastUso.fecha} mono />
            <InfoRow label="Preparación" value={`${formatTime(lastUso.hora_preparacion)} · ${getName(lastUso.tecnico_preparacion_id)}`} highlight />
            {lastUso.hora_acabado && (
              <InfoRow label="Acabado" value={`${formatTime(lastUso.hora_acabado)} · ${getName(lastUso.tecnico_acabado_id)}`} />
            )}
          </div>
        )}

        {/* Info + Actions */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-text-tertiary">Tipo</span>
            <span className="text-text-secondary font-mono text-[11px]">
              {maquina.tipo.toUpperCase()}
              {maquina.requiere_lanzamiento && <span className="text-primary ml-1.5">· lanzamiento</span>}
            </span>
          </div>
          {maquina.ubicacion && (
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-text-tertiary">Ubicación</span>
              <span className="text-text-secondary">{maquina.ubicacion}</span>
            </div>
          )}

          <div className="flex gap-2">
            {!isBusy ? (
              <button
                onClick={() => setShowNuevo(true)}
                disabled={!canOperate}
                className="flex-1 px-3 py-2 rounded text-xs font-medium bg-primary text-text-inverse hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Nuevo uso
              </button>
            ) : (
              <button
                onClick={() => setShowCerrar(true)}
                className="flex-1 px-3 py-2 rounded text-xs font-medium bg-activa text-white hover:opacity-90 transition-colors"
              >
                Cerrar uso
              </button>
            )}
          </div>
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
  uso: { fecha: string; hora_preparacion: string; tecnico_preparacion_id: string; tecnico_lanzamiento_id: string | null }
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
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-text-tertiary">Prep.</span>
          <span className="text-text-secondary">{formatTime(uso.hora_preparacion)} · {getName(uso.tecnico_preparacion_id)}</span>
        </div>
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
