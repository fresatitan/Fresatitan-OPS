import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'

/**
 * Hook que escucha cambios críticos en Supabase Realtime y muestra toasts
 * flotantes en el dashboard admin.
 *
 * Dispara notificaciones cuando:
 *   1. Una máquina pasa al estado 'avería' (alguien reportó avería)
 *   2. Un uso se cierra con resultado 'ko' (hubo un problema)
 *
 * Solo debe montarse en rutas de admin (Dashboard, Alertas...). NO en el Panel,
 * porque los operarios de taller no necesitan ver estos avisos — son para Roser
 * y los admins.
 */
export function useAlertasRealtime() {
  // Evita duplicados en primer render
  const initialized = useRef(false)
  const seenUsos = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('[alertas-realtime] Supabase no configurado, skip')
      return
    }

    console.log('[alertas-realtime] Montando hook y suscribiendo canal...')

    // Prime los IDs ya vistos al montar (para no disparar toasts por datos existentes)
    const currentUsos = useWorkflowStore.getState().usos
    for (const u of currentUsos) {
      if (u.resultado === 'ko') seenUsos.current.add(u.id)
    }
    initialized.current = true

    const channel = supabase
      .channel('alertas-realtime')
      // Nueva avería → estado pasa a 'avería'
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'maquinas' },
        (payload) => {
          console.log('[alertas-realtime] UPDATE maquinas recibido:', payload)
          const nuevo = payload.new as { id: string; codigo: string; nombre: string; estado_actual: string }
          const viejo = payload.old as { estado_actual?: string }
          // Disparamos si el estado nuevo es avería (sin depender del antiguo — REPLICA IDENTITY puede no enviarlo)
          if (nuevo.estado_actual === 'avería' && viejo?.estado_actual !== 'avería') {
            console.log('[alertas-realtime] 🔔 Disparando toast avería para', nuevo.codigo)
            toast.error(
              `⚠ Avería reportada: ${nuevo.codigo} — ${nuevo.nombre}`,
              {
                duration: 8000,
                style: {
                  background: '#1a0e0e',
                  color: '#F0F0F0',
                  border: '1px solid #EF4444',
                  fontSize: '13px',
                },
              }
            )
          }
        }
      )
      // Uso cerrado con KO → resultado cambia a 'ko'
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usos_equipo' },
        (payload) => {
          console.log('[alertas-realtime] UPDATE usos_equipo recibido:', payload)
          const nuevo = payload.new as { id: string; maquina_id: string; resultado: string }
          if (nuevo.resultado === 'ko' && !seenUsos.current.has(nuevo.id)) {
            seenUsos.current.add(nuevo.id)
            const maquina = useWorkflowStore.getState().maquinas.find((m) => m.id === nuevo.maquina_id)
            const getName = useTrabajadoresStore.getState().getTrabajadorName
            const usoCompleto = useWorkflowStore.getState().usos.find((u) => u.id === nuevo.id)
            const cerradoPor = usoCompleto?.tecnico_acabado_id ? getName(usoCompleto.tecnico_acabado_id) : ''
            console.log('[alertas-realtime] 🔔 Disparando toast KO')
            toast(
              `⚠ ${maquina?.codigo ?? 'Máquina'} cerrada con incidencia${cerradoPor ? ' por ' + cerradoPor : ''}`,
              {
                duration: 6000,
                icon: '⚠',
                style: {
                  background: '#1a140e',
                  color: '#F0F0F0',
                  border: '1px solid #F59E0B',
                  fontSize: '13px',
                },
              }
            )
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[alertas-realtime] Estado del canal:', status, err ?? '')
        if (status === 'SUBSCRIBED') {
          console.log('[alertas-realtime] ✓ Suscrito correctamente a Realtime')
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[alertas-realtime] ✗ Error al suscribir', err)
        }
      })

    return () => {
      console.log('[alertas-realtime] Desmontando canal')
      supabase!.removeChannel(channel)
    }
  }, [])
}
