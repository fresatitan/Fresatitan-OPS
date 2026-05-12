import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Estado persistente (localStorage) que rastrea qué notificaciones ha leído
 * el admin de este dispositivo. La unicidad de cada notificación se basa en
 * su `id` estable (ver `useNotifications`), que se deriva del registro
 * subyacente (avería, mantenimiento, plan…). Por eso es seguro persistir IDs
 * a través de sesiones — si una avería se cierra, su ID desaparece de la
 * lista calculada y la marca en localStorage queda como huérfana inofensiva.
 *
 * Mantenemos un Set en memoria pero serializamos como array de strings, ya
 * que Set no es serializable directamente en JSON.
 */
interface NotificationsReadState {
  readIds: Record<string, boolean>
  /** Marca una notificación como leída */
  markRead: (id: string) => void
  /** Marca una lista entera como leída (usado por "Marcar todas") */
  markManyRead: (ids: string[]) => void
  /** Marca una notificación como no leída (utilidad, no usado todavía) */
  markUnread: (id: string) => void
  /** Borra TODO el historial de leídas (útil para depurar) */
  clearAll: () => void
  /** Helper: ¿está leída? */
  isRead: (id: string) => boolean
}

export const useNotificationsReadStore = create<NotificationsReadState>()(
  persist(
    (set, get) => ({
      readIds: {},
      markRead: (id) =>
        set((s) => (s.readIds[id] ? s : { readIds: { ...s.readIds, [id]: true } })),
      markManyRead: (ids) =>
        set((s) => {
          const next: Record<string, boolean> = { ...s.readIds }
          let changed = false
          for (const id of ids) {
            if (!next[id]) {
              next[id] = true
              changed = true
            }
          }
          return changed ? { readIds: next } : s
        }),
      markUnread: (id) =>
        set((s) => {
          if (!s.readIds[id]) return s
          const next = { ...s.readIds }
          delete next[id]
          return { readIds: next }
        }),
      clearAll: () => set({ readIds: {} }),
      isRead: (id) => !!get().readIds[id],
    }),
    {
      name: 'fresatitan-ops:notifications-read',
      version: 1,
    },
  ),
)
