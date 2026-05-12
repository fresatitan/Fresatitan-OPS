import { useMemo } from 'react'
import { useWorkflowStore } from '../store/workflowStore'

/**
 * Una notificación del centro de notificaciones del admin.
 *
 * Las notificaciones NO se persisten en BD: se derivan en cliente del estado
 * actual del workflowStore (averías abiertas, mantenimientos no validados,
 * planes vencidos, usos KO). Cada notificación tiene un `id` estable derivado
 * del evento subyacente, de modo que el store `notificationsReadStore` puede
 * marcarla como leída de forma persistente en localStorage.
 */
export type NotificacionTipo =
  | 'averia_pendiente'
  | 'averia_critica'
  | 'averia_leve'
  | 'mantenimiento_abierto'
  | 'revision_vencida'
  | 'uso_ko'

export interface Notificacion {
  /** ID estable. Patrón: '{tipo}:{registroId}' o '{tipo}:{planId}'. */
  id: string
  tipo: NotificacionTipo
  /** ISO timestamp del evento (sirve para ordenar y mostrar "hace X") */
  timestamp: string
  /** Texto principal: una línea, sin redundancia */
  titulo: string
  /** Texto secundario: máquina + detalle corto */
  detalle: string
  /** Severidad visual (define el color del icono y border) */
  severidad: 'critica' | 'alta' | 'media' | 'info'
  /** A dónde navegar al hacer click */
  destino: '/alertas' | '/maquinas' | '/auditoria'
}

const tipoToSeveridad: Record<NotificacionTipo, Notificacion['severidad']> = {
  averia_pendiente: 'critica',
  averia_critica: 'critica',
  averia_leve: 'media',
  mantenimiento_abierto: 'info',
  revision_vencida: 'alta',
  uso_ko: 'media',
}

const tipoToDestino: Record<NotificacionTipo, Notificacion['destino']> = {
  averia_pendiente: '/alertas',
  averia_critica: '/alertas',
  averia_leve: '/alertas',
  mantenimiento_abierto: '/maquinas',
  revision_vencida: '/alertas',
  uso_ko: '/alertas',
}

/**
 * Hook que deriva las notificaciones a partir del estado del workflow.
 * Reactivo: se recalcula cuando cambia cualquiera de las fuentes (Realtime
 * mantiene el state actualizado).
 */
export function useNotifications(): Notificacion[] {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const estadosHistorial = useWorkflowStore((s) => s.estadosHistorial)
  const mantenimientos = useWorkflowStore((s) => s.mantenimientos)
  const usos = useWorkflowStore((s) => s.usos)
  const planes = useWorkflowStore((s) => s.mantenimientoPlanes)
  const getEstadoPlan = useWorkflowStore((s) => s.getEstadoPlan)

  return useMemo(() => {
    const result: Notificacion[] = []
    const maqById = new Map(maquinas.map((m) => [m.id, m]))

    // 1. Averías abiertas — una notificación por máquina con avería abierta
    const seenMaquinas = new Set<string>()
    for (const e of estadosHistorial) {
      if (e.estado !== 'avería' || e.cerrada_en) continue
      if (seenMaquinas.has(e.maquina_id)) continue
      seenMaquinas.add(e.maquina_id)
      const maq = maqById.get(e.maquina_id)
      if (!maq) continue

      let tipo: NotificacionTipo
      let titulo: string
      if (!e.severidad_confirmada_por_admin) {
        tipo = 'averia_pendiente'
        titulo = 'Avería pendiente de revisar'
      } else if (e.severidad === 'critica') {
        tipo = 'averia_critica'
        titulo = 'Avería crítica · máquina bloqueada'
      } else {
        tipo = 'averia_leve'
        titulo = 'Avería leve abierta'
      }

      result.push({
        id: `${tipo}:${e.id}`,
        tipo,
        timestamp: e.timestamp,
        titulo,
        detalle: `${maq.codigo} · ${maq.nombre}${e.motivo ? ` — ${e.motivo}` : ''}`,
        severidad: tipoToSeveridad[tipo],
        destino: tipoToDestino[tipo],
      })
    }

    // 2. Mantenimientos abiertos (no validados) — uno por entrada
    for (const m of mantenimientos) {
      if (m.validado) continue
      const maq = maqById.get(m.maquina_id)
      if (!maq) continue
      // Solo notificamos si la máquina sigue en estado 'mantenimiento'
      if (maq.estado_actual !== 'mantenimiento') continue
      result.push({
        id: `mantenimiento_abierto:${m.id}`,
        tipo: 'mantenimiento_abierto',
        timestamp: m.created_at,
        titulo: 'Mantenimiento sin finalizar',
        detalle: `${maq.codigo} · ${maq.nombre} — ${m.accion_realizada.slice(0, 80)}`,
        severidad: 'info',
        destino: '/maquinas',
      })
    }

    // 3. Planes de revisión vencidos
    for (const p of planes) {
      if (!p.activo) continue
      const estado = getEstadoPlan(p)
      if (!estado.vencido) continue
      const maq = maqById.get(p.maquina_id)
      if (!maq) continue
      const desfase = estado.usosRestantes !== null
        ? `${Math.abs(estado.usosRestantes)} usos por encima`
        : `vencida hace ${Math.abs(estado.diasRestantes ?? 0)} días`
      result.push({
        id: `revision_vencida:${p.id}`,
        tipo: 'revision_vencida',
        timestamp: p.ultima_ejecucion_en ?? p.created_at,
        titulo: 'Revisión vencida',
        detalle: `${maq.codigo} · ${p.nombre} — ${desfase}`,
        severidad: 'alta',
        destino: '/alertas',
      })
    }

    // 4. Usos KO — solo los más recientes (últimos 10) para no saturar
    const usosKo = usos
      .filter((u) => u.resultado === 'ko')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
    for (const u of usosKo) {
      const maq = maqById.get(u.maquina_id)
      if (!maq) continue
      result.push({
        id: `uso_ko:${u.id}`,
        tipo: 'uso_ko',
        timestamp: u.updated_at,
        titulo: 'Uso cerrado con incidencia',
        detalle: `${maq.codigo} · ${maq.nombre}${u.observaciones ? ` — ${u.observaciones.slice(0, 80)}` : ''}`,
        severidad: 'media',
        destino: '/alertas',
      })
    }

    // Orden: más recientes primero
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return result
  }, [maquinas, estadosHistorial, mantenimientos, usos, planes, getEstadoPlan])
}
