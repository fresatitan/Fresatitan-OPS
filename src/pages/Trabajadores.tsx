import { useState } from 'react'
import Layout from '../components/ui/Layout'
import TopBar from '../components/ui/TopBar'
import Modal from '../components/ui/Modal'
import { useTrabajadoresStore, type Trabajador } from '../store/trabajadoresStore'
import type { RolUsuario } from '../types/database'
import toast from 'react-hot-toast'

const ROLES: { value: RolUsuario; label: string }[] = [
  { value: 'operario', label: 'Operario' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Administrador' },
]

const ROLE_COLORS: Record<RolUsuario, { bg: string; text: string }> = {
  operario: { bg: 'bg-activa-muted', text: 'text-activa' },
  tecnico: { bg: 'bg-mantenimiento-muted', text: 'text-mantenimiento' },
  supervisor: { bg: 'bg-parada-muted', text: 'text-parada' },
  admin: { bg: 'bg-primary-muted', text: 'text-primary' },
}

export default function Trabajadores() {
  const { trabajadores, addTrabajador, toggleActivo, removeTrabajador } = useTrabajadoresStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Trabajador | null>(null)
  const [filterRole, setFilterRole] = useState<RolUsuario | 'todos'>('todos')

  const filtered = filterRole === 'todos'
    ? trabajadores
    : trabajadores.filter((t) => t.role === filterRole)

  const countByRole = (role: RolUsuario) => trabajadores.filter((t) => t.role === role).length

  return (
    <Layout>
      <TopBar
        title="Trabajadores"
        subtitle={`${trabajadores.length} registrados · ${trabajadores.filter((t) => t.activo).length} activos`}
        actions={
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-text-inverse hover:bg-primary-light transition-colors"
          >
            + Nuevo trabajador
          </button>
        }
      />

      <main className="p-4 lg:p-6 space-y-5">
        {/* Role summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {ROLES.map(({ value, label }) => (
            <div key={value} className="bg-surface-2 border border-border-subtle rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-widest text-text-tertiary">{label}s</span>
              <div className="flex items-end justify-between mt-1">
                <span className="text-metric text-2xl text-text-primary">{countByRole(value)}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${ROLE_COLORS[value].bg} ${ROLE_COLORS[value].text}`}>
                  {value.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          <FilterBtn active={filterRole === 'todos'} onClick={() => setFilterRole('todos')}>
            Todos ({trabajadores.length})
          </FilterBtn>
          {ROLES.map(({ value, label }) => (
            <FilterBtn key={value} active={filterRole === value} onClick={() => setFilterRole(value)}>
              {label}s ({countByRole(value)})
            </FilterBtn>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_80px_60px] gap-2 px-4 py-2.5 border-b border-border-subtle text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            <span>Nombre</span>
            <span>Apellidos</span>
            <span>Rol</span>
            <span>Estado</span>
            <span></span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-text-tertiary text-xs">No hay trabajadores con este filtro.</p>
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[1fr_1fr_100px_80px_60px] gap-2 px-4 py-3 border-b border-border-subtle last:border-b-0 items-center hover:bg-surface-3/50 transition-colors"
              >
                <span className="text-sm text-text-primary font-medium truncate">{t.nombre}</span>
                <span className="text-sm text-text-secondary truncate">{t.apellidos}</span>
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider w-fit
                  ${ROLE_COLORS[t.role].bg} ${ROLE_COLORS[t.role].text}
                `}>
                  {t.role.toUpperCase()}
                </span>
                <button
                  onClick={() => toggleActivo(t.id)}
                  className={`
                    inline-flex items-center gap-1 text-[11px] font-medium w-fit
                    ${t.activo ? 'text-activa' : 'text-text-tertiary'}
                  `}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? 'bg-activa' : 'bg-text-tertiary'}`} />
                  {t.activo ? 'Activo' : 'Inactivo'}
                </button>
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setEditTarget(t)}
                    className="text-[10px] text-text-tertiary hover:text-text-primary transition-colors"
                    title="Editar"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { removeTrabajador(t.id); toast.success('Trabajador eliminado') }}
                    className="text-[10px] text-text-tertiary hover:text-averia transition-colors"
                    title="Eliminar"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add modal */}
      <TrabajadorFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={(data) => {
          addTrabajador(data)
          toast.success(`${data.nombre} añadido`)
          setShowAdd(false)
        }}
      />

      {/* Edit modal */}
      {editTarget && (
        <TrabajadorFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(data) => {
            // For now, remove and re-add (store doesn't have edit)
            removeTrabajador(editTarget.id)
            addTrabajador(data)
            toast.success(`${data.nombre} actualizado`)
            setEditTarget(null)
          }}
        />
      )}
    </Layout>
  )
}

/* --- Sub-components --- */

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded text-[11px] font-medium whitespace-nowrap border transition-colors
        ${active
          ? 'bg-primary-muted border-primary/30 text-primary'
          : 'bg-surface-3 border-border-subtle text-text-secondary hover:text-text-primary'
        }
      `}
    >
      {children}
    </button>
  )
}

function TrabajadorFormModal({ open, onClose, onSave, initial }: {
  open: boolean
  onClose: () => void
  onSave: (data: { nombre: string; apellidos: string; role: RolUsuario }) => void
  initial?: Trabajador
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [apellidos, setApellidos] = useState(initial?.apellidos ?? '')
  const [role, setRole] = useState<RolUsuario>(initial?.role ?? 'operario')

  const canSubmit = nombre.trim() && apellidos.trim()

  const handleSubmit = () => {
    if (!canSubmit) return
    onSave({ nombre: nombre.trim(), apellidos: apellidos.trim(), role })
  }

  const handleClose = () => {
    setNombre(initial?.nombre ?? '')
    setApellidos(initial?.apellidos ?? '')
    setRole(initial?.role ?? 'operario')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={initial ? 'Editar trabajador' : 'Nuevo trabajador'}>
      <div className="space-y-3">
        <Field label="Nombre">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="input-field"
            autoFocus
          />
        </Field>

        <Field label="Apellidos">
          <input
            value={apellidos}
            onChange={(e) => setApellidos(e.target.value)}
            placeholder="Apellidos"
            className="input-field"
          />
        </Field>

        <Field label="Rol">
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRole(value)}
                className={`
                  px-2.5 py-2 rounded border text-left transition-colors
                  ${role === value
                    ? `${ROLE_COLORS[value].bg} border-current`
                    : 'bg-surface-3 border-border-subtle hover:border-border-default'
                  }
                `}
              >
                <span className={`text-xs font-medium ${role === value ? ROLE_COLORS[value].text : 'text-text-primary'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 px-3 py-2.5 rounded text-xs font-medium bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-3 py-2.5 rounded text-xs font-medium bg-primary text-text-inverse transition-colors hover:bg-primary-light disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {initial ? 'Guardar cambios' : 'Añadir trabajador'}
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
