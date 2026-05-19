import { useMemo, useState } from 'react'
import { useWorkflowStore } from '../../store/workflowStore'
import { useAuthStore } from '../../store/authStore'
import { UNIDADES_PLAN } from '../../constants/estados'
import { plantillasParaMaquina, type PlantillaPlan } from '../../constants/mantenimiento'
import type { Maquina, MantenimientoPlan, PlanUnidad } from '../../types/database'
import type { PlanEstado } from '../../store/workflowStore'

/**
 * Sección embebida (en MaquinaFormModal y similares) para gestionar los
 * planes de revisión / mantenimiento programado de una máquina concreta.
 *
 * Cada plan puede ser:
 *   · Por tiempo: cada N días / semanas / meses desde la última ejecución
 *   · Por usos: cada N usos cerrados de la máquina
 *
 * Al registrar un mantenimiento vinculado al plan, el contador se resetea
 * automáticamente vía trigger SQL (ver migración 0022).
 */
export default function PlanesMantenimientoSection({ maquina }: { maquina: Maquina }) {
  const getPlanes = useWorkflowStore((s) => s.getPlanesByMaquina)
  const getEstadoPlan = useWorkflowStore((s) => s.getEstadoPlan)
  const eliminarPlan = useWorkflowStore((s) => s.eliminarPlanMantenimiento)
  const planes = useMemo(() => getPlanes(maquina.id), [getPlanes, maquina.id])

  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MantenimientoPlan | null>(null)

  const handleEdit = (plan: MantenimientoPlan) => {
    setEditingPlan(plan)
    setShowForm(true)
  }

  const handleDelete = async (plan: MantenimientoPlan) => {
    const ok = window.confirm(
      `¿Eliminar el plan "${plan.nombre}"?\n\n` +
      `No se borran los mantenimientos ya registrados, sólo dejará de avisar.`,
    )
    if (!ok) return
    await eliminarPlan(plan.id)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingPlan(null)
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Planes de revisión</h4>
          <p className="text-[11px] text-text-tertiary mt-0.5 leading-snug">
            Revisiones programadas cada X tiempo o cada X usos. El sistema avisa cuando se cumple el plazo.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="
              shrink-0 px-3 py-1.5 rounded text-xs font-semibold
              bg-primary text-text-inverse hover:bg-primary-light transition-colors
            "
          >
            + Nuevo plan
          </button>
        )}
      </div>

      {/* Lista de planes existentes */}
      {planes.length === 0 && !showForm ? (
        <div className="rounded border border-dashed border-border-subtle bg-surface-2 p-3 text-center">
          <p className="text-xs text-text-tertiary italic">
            Esta máquina aún no tiene planes de revisión.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 mb-2">
          {planes.map((plan) => (
            <PlanItem
              key={plan.id}
              plan={plan}
              estado={getEstadoPlan(plan)}
              onEdit={() => handleEdit(plan)}
              onDelete={() => handleDelete(plan)}
            />
          ))}
        </ul>
      )}

      {/* Formulario inline (crear/editar) */}
      {showForm && (
        <PlanForm
          maquina={maquina}
          plan={editingPlan}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}

// =============================================================================
// Item del listado
// =============================================================================
function PlanItem({
  plan,
  estado,
  onEdit,
  onDelete,
}: {
  plan: MantenimientoPlan
  estado: PlanEstado
  onEdit: () => void
  onDelete: () => void
}) {
  const unidadMeta = UNIDADES_PLAN[plan.unidad]
  const intervaloLabel = `cada ${plan.cada_n} ${plan.cada_n === 1 ? unidadMeta.labelSingular : unidadMeta.label}`

  let estadoLabel: string
  let estadoClass: string
  if (estado.vencido) {
    estadoLabel = estado.usosRestantes !== null
      ? `Vencido (${Math.abs(estado.usosRestantes)} usos de más)`
      : `Vencido hace ${Math.abs(estado.diasRestantes ?? 0)} ${Math.abs(estado.diasRestantes ?? 0) === 1 ? 'día' : 'días'}`
    estadoClass = 'text-averia bg-averia/10 border-averia/30'
  } else if (estado.usosRestantes !== null) {
    estadoLabel = `Faltan ${estado.usosRestantes} ${estado.usosRestantes === 1 ? 'uso' : 'usos'}`
    estadoClass = estado.usosRestantes <= 3
      ? 'text-parada bg-parada/10 border-parada/30'
      : 'text-activa bg-activa/10 border-activa/20'
  } else {
    const d = estado.diasRestantes ?? 0
    estadoLabel = `En ${d} ${d === 1 ? 'día' : 'días'}`
    estadoClass = d <= 3
      ? 'text-parada bg-parada/10 border-parada/30'
      : 'text-activa bg-activa/10 border-activa/20'
  }

  return (
    <li className="rounded border border-border-subtle bg-surface-2 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-text-primary truncate">{plan.nombre}</span>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${estadoClass}`}>
              {estadoLabel}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary font-mono">{intervaloLabel}</div>
          {plan.descripcion && (
            <p className="text-[11px] text-text-secondary mt-1 leading-snug">{plan.descripcion}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="text-[10px] px-2 py-1 rounded bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] px-2 py-1 rounded bg-surface-3 border border-border-subtle text-text-tertiary hover:text-averia hover:border-averia/40 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </li>
  )
}

// =============================================================================
// Formulario inline
// =============================================================================
function PlanForm({
  maquina,
  plan,
  onClose,
}: {
  maquina: Maquina
  plan: MantenimientoPlan | null
  onClose: () => void
}) {
  const crearPlan = useWorkflowStore((s) => s.crearPlanMantenimiento)
  const actualizarPlan = useWorkflowStore((s) => s.actualizarPlanMantenimiento)
  const planesExistentes = useWorkflowStore((s) => s.getPlanesByMaquina)(maquina.id)
  const adminUser = useAuthStore((s) => s.user)

  const [nombre, setNombre] = useState(plan?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '')
  const [unidad, setUnidad] = useState<PlanUnidad>(plan?.unidad ?? 'meses')
  const [cadaN, setCadaN] = useState<number>(plan?.cada_n ?? 1)
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!plan

  // Plantillas recomendadas para esta máquina, filtrando las que ya tiene
  // como plan activo (para no sugerir duplicados al crear desde cero).
  const plantillas = useMemo(() => {
    const all = plantillasParaMaquina(maquina.tipo, maquina.subtipo)
    if (isEdit) return all
    const nombresExistentes = new Set(
      planesExistentes.map((p) => p.nombre.trim().toLowerCase()),
    )
    return all.filter((t) => !nombresExistentes.has(t.nombre.trim().toLowerCase()))
  }, [maquina.tipo, maquina.subtipo, planesExistentes, isEdit])

  const aplicarPlantilla = (t: PlantillaPlan) => {
    setNombre(t.nombre)
    setDescripcion(t.descripcion)
    setUnidad(t.unidad)
    setCadaN(t.cada_n)
  }

  const handleSubmit = async () => {
    if (nombre.trim().length === 0 || cadaN <= 0 || submitting) return
    setSubmitting(true)
    if (isEdit) {
      await actualizarPlan(plan.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        unidad,
        cada_n: cadaN,
      })
    } else {
      await crearPlan({
        maquina_id: maquina.id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        unidad,
        cada_n: cadaN,
        creado_por: adminUser?.id ?? null,
      })
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="rounded border border-primary/30 bg-primary-muted/30 p-3 space-y-2.5">
      {/* Plantillas recomendadas — solo en alta */}
      {!isEdit && plantillas.length > 0 && (
        <div className="rounded border border-border-subtle bg-surface-2 p-2.5 mb-1">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Plantillas recomendadas</span>
            <span className="font-mono normal-case text-text-tertiary/70">
              {plantillas.length} disponibles
            </span>
          </div>
          <p className="text-[10px] text-text-tertiary mb-2 leading-snug">
            Valores típicos del sector CAD-CAM dental. Toca una para pre-rellenar el formulario y ajústala si quieres.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plantillas.map((t) => (
              <button
                key={t.id}
                onClick={() => aplicarPlantilla(t)}
                title={`${t.descripcion}\nSugerencia: cada ${t.cada_n} ${UNIDADES_PLAN[t.unidad].label}\n${t.fuente}`}
                className="
                  inline-flex items-center gap-1.5 px-2 py-1 rounded
                  bg-surface-3 border border-border-subtle text-[11px] text-text-secondary
                  hover:bg-surface-4 hover:text-text-primary hover:border-primary/40
                  transition-colors
                "
              >
                <span className="font-semibold">{t.nombre}</span>
                <span className="text-text-tertiary font-mono">
                  · {t.cada_n} {UNIDADES_PLAN[t.unidad].label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
          Nombre del plan <span className="text-averia">*</span>
        </label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Limpieza husillo, Revisión técnica general…"
          className="input-field text-sm"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-[1fr_140px] gap-2">
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
            Frecuencia <span className="text-averia">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">cada</span>
            <input
              type="number"
              min={1}
              value={cadaN}
              onChange={(e) => setCadaN(parseInt(e.target.value || '1', 10))}
              className="input-field text-sm w-16 text-center font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
            Unidad
          </label>
          <select
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as PlanUnidad)}
            className="input-field text-sm"
          >
            {Object.entries(UNIDADES_PLAN).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
          Descripción (opcional)
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Qué hay que revisar exactamente…"
          className="input-field text-sm resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || nombre.trim().length === 0 || cadaN <= 0}
          className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-primary text-text-inverse hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </button>
      </div>
    </div>
  )
}
