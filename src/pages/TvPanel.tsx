import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { toIsoDateTime } from '../lib/utils'
import { TIPOS_MAQUINA_PLURAL, SUBTIPOS_FRESADORA } from '../constants/estados'
import type { Maquina, UsoEquipo, SubtipoFresadora } from '../types/database'

/**
 * Panel TV — vista tipo "panel de aeropuerto" para FRESATITAN OPS.
 *
 * IMPORTANTE: este panel NO usa las variables CSS del tema (--color-text-…)
 * porque la APK TV debe verse igual en cualquier dispositivo, sin depender
 * del modo claro/oscuro del WebView. Usamos hex explícitos de la paleta
 * corporativa FRESATITAN:
 *   · Fondo:        #0A0A0A (surface-0)
 *   · Surface card: #141414 (surface-2)
 *   · Marca:        #D09A40 (primary)
 *   · Texto base:   #F0F0F0
 *   · Verde activa: #22C55E
 *   · Rojo avería:  #EF4444
 *   · Azul mant.:   #3B82F6
 *   · Naranja:      #F59E0B
 *   · Gris:         #6B7280
 *
 * Diseñado para 1366×768 (HD TV) como base y adaptable hacia arriba
 * (1920×1080 Full HD, 2560×1440, 3840×2160).
 *
 * Auto-scroll: el contenido entero se duplica y va recorriendo
 * verticalmente en bucle infinito. Si todo cabe en pantalla, igualmente
 * va dando un paso visual cada cierto tiempo para que se note actividad.
 */
export default function TvPanel() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)

  // Solo máquinas operativas — las retiradas (Lilian) no se muestran
  const visibles = useMemo(() => maquinas.filter((m) => m.activa), [maquinas])
  const bloques = useMemo(() => construirBloques(visibles), [visibles])

  // KPIs globales para el header
  const kpis = useMemo(() => {
    let activas = 0, libres = 0, mant = 0, averia = 0
    for (const m of visibles) {
      const hayUso = usos.some((u) => u.maquina_id === m.id && u.resultado === 'pendiente')
      if (m.estado_actual === 'avería') averia++
      else if (m.estado_actual === 'mantenimiento') mant++
      else if (hayUso) activas++
      else libres++
    }
    return { activas, libres, mant, averia, total: visibles.length }
  }, [visibles, usos])

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: '#0A0A0A', color: '#F0F0F0' }}
    >
      {/* Header opaco con TODA la información estática: logo, reloj, KPIs
          y leyenda. Queda fijo arriba, con z-index para que la lista que
          corre por debajo NUNCA lo tape. */}
      <Header kpis={kpis} />
      {/* Zona inferior: lista en bucle. Confinada con overflow-hidden y
          relative para que la animación no salga del contenedor. */}
      <ScrollLoop>
        {bloques.map((b) => (
          <Bloque key={b.id} bloque={b} usos={usos} />
        ))}
      </ScrollLoop>
    </div>
  )
}

// =============================================================================
// HEADER — banner superior fijo con TODA la información estática:
// logo + reloj/fecha arriba, KPIs grandes en medio, leyenda de colores abajo.
// Z-index elevado para que la lista que corre por debajo nunca lo tape.
// =============================================================================
function Header({ kpis }: { kpis: { activas: number; libres: number; mant: number; averia: number; total: number } }) {
  return (
    <header
      className="shrink-0 relative"
      style={{
        backgroundColor: '#080808',
        borderBottom: '2px solid rgba(208, 154, 64, 0.35)',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Fila superior: logo + título + reloj/fecha a la derecha */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px 10px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/logo-f.png"
            alt=""
            style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block' }}
          />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span style={{ color: '#F0F0F0' }}>Fresatitan</span>
              <span style={{ color: '#D09A40', marginLeft: 10, fontWeight: 300 }}>OPS</span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.32em',
                marginTop: 6,
              }}
            >
              Estado de planta · Tiempo real
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <ConnectionBadge />
          <RelojGigante />
        </div>
      </div>

      {/* Fila media: KPIs grandes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          padding: '4px 28px 14px 28px',
        }}
      >
        <Kpi label="En uso" value={kpis.activas} color="#22C55E" />
        <Kpi label="Libres" value={kpis.libres} color="#D09A40" />
        <Kpi label="Mantenimiento" value={kpis.mant} color="#3B82F6" />
        <Kpi label="Avería" value={kpis.averia} color="#EF4444" />
      </div>

      {/* Fila inferior: leyenda compacta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 28px',
          borderTop: '1px solid rgba(208, 154, 64, 0.15)',
          backgroundColor: '#050505',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <ItemLeyenda color="#22C55E" label="En uso" />
          <ItemLeyenda color="#D09A40" label="Libre" />
          <ItemLeyenda color="#3B82F6" label="Mantenimiento" />
          <ItemLeyenda color="#EF4444" label="Avería" />
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
          }}
        >
          Fresatitan OPS · TV · actualización automática
        </div>
      </div>
    </header>
  )
}

function ItemLeyenda({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: color }} />
      <span style={{ color: '#CCC', fontSize: 12, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        backgroundColor: '#141414',
        border: `1px solid ${color}33`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          fontFamily: 'DM Mono, monospace',
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  )
}

/**
 * Indicador ONLINE / RECONECTANDO / OFFLINE.
 *
 *   · ONLINE       — hay internet (navigator.onLine) Y el canal Realtime
 *                    nos envió un evento en los últimos 90 segundos.
 *   · RECONECTANDO — hay internet pero el canal lleva más de 90 s en silencio
 *                    (puede ser tráfico nulo o pérdida temporal del WS).
 *   · OFFLINE      — el dispositivo se quedó sin internet.
 *
 * Refresca cada 5 segundos para detectar cambios pronto.
 */
function ConnectionBadge() {
  const lastRealtimeAt = useWorkflowStore((s) => s.lastRealtimeAt)
  const [, setTick] = useState(0)
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(id)
    }
  }, [])

  const STALE_MS = 90_000
  let label = 'OFFLINE'
  let color = '#EF4444'
  if (online) {
    const ageMs = lastRealtimeAt > 0 ? Date.now() - lastRealtimeAt : Infinity
    if (ageMs < STALE_MS) {
      label = 'ONLINE'
      color = '#22C55E'
    } else {
      label = 'RECONECTANDO'
      color = '#F59E0B'
    }
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 8,
        backgroundColor: `${color}1A`,
        border: `1.5px solid ${color}55`,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: color,
          animation: 'tv-pulse 1.6s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.18em',
          color,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function RelojGigante() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fechaRaw = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  // Solo la primera letra en mayúscula ("Sábado, 11 de julio") — un
  // text-transform: capitalize pondría "De Julio".
  const fecha = fechaRaw.charAt(0).toUpperCase() + fechaRaw.slice(1)
  return (
    <div style={{ textAlign: 'right', minWidth: 200 }}>
      <div style={{ fontSize: 12, color: '#888' }}>{fecha}</div>
      <div
        style={{
          fontSize: 44,
          fontFamily: 'DM Mono, monospace',
          fontWeight: 700,
          color: '#D09A40',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        {time}
      </div>
    </div>
  )
}

// =============================================================================
// SCROLL LOOP — auto-scroll vertical infinito, duplicando el contenido
// =============================================================================
function ScrollLoop({ children }: { children: React.ReactNode }) {
  // Velocidad: ~30 px/segundo. Se ajusta automáticamente al alto del contenido
  // para que cualquier lista (corta o larga) recorra a un ritmo similar.
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [duration, setDuration] = useState(60)

  useEffect(() => {
    const update = () => {
      if (!innerRef.current) return
      // El interior tiene el contenido duplicado: su altura es el doble del original.
      const total = innerRef.current.scrollHeight
      const original = total / 2
      // Velocidad ~40 px/segundo
      const dur = Math.max(20, Math.round(original / 40))
      setDuration(dur)
    }
    update()
    const ro = new ResizeObserver(update)
    if (innerRef.current) ro.observe(innerRef.current)
    return () => ro.disconnect()
  }, [children])

  return (
    <main
      style={{
        flex: '1 1 0',
        minHeight: 0,            // imprescindible para que flex-1 confine la altura dentro de flex-col
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,                // siempre por debajo del header (z=10)
        backgroundColor: '#0A0A0A',
      }}
    >
      <div
        ref={innerRef}
        style={{
          animation: `tv-scroll-loop ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        <div style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 14, paddingBottom: 14 }}>
          {children}
        </div>
        {/* Duplicado del contenido para que el loop sea visualmente continuo */}
        <div style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 14, paddingBottom: 14 }} aria-hidden="true">
          {children}
        </div>
      </div>

      {/* Degradados de entrada/salida para suavizar visualmente el corte del scroll */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, top: 0,
          height: 18,
          background: 'linear-gradient(180deg, #0A0A0A 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          height: 24,
          background: 'linear-gradient(0deg, #0A0A0A 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    </main>
  )
}

// =============================================================================
// BLOQUE DE FAMILIA — titular grande + lista de máquinas
// =============================================================================
function Bloque({ bloque, usos }: { bloque: BloqueData; usos: UsoEquipo[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          marginBottom: 10,
          paddingLeft: 4,
          borderBottom: '2px solid #D09A4033',
          paddingBottom: 6,
        }}
      >
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#D09A40',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          {bloque.titulo}
        </h2>
        {bloque.subtitulo && (
          <span style={{ fontSize: 14, color: '#888', fontStyle: 'italic' }}>{bloque.subtitulo}</span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 14,
            color: '#666',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {bloque.maquinas.length} máquinas
        </span>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bloque.maquinas.map((m) => (
          <Fila
            key={m.id}
            maquina={m}
            uso={usos.find((u) => u.maquina_id === m.id && u.resultado === 'pendiente') ?? null}
          />
        ))}
      </div>
    </section>
  )
}

// =============================================================================
// FILA DE MÁQUINA
// =============================================================================
function Fila({ maquina, uso }: { maquina: Maquina; uso: UsoEquipo | null }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)
  const estado = describirEstado(maquina.estado_actual, !!uso)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px minmax(0, 1fr) 220px 160px 200px',
        alignItems: 'center',
        gap: 18,
        padding: '14px 18px 14px 22px',
        borderRadius: 10,
        backgroundColor: '#141414',
        borderLeft: `8px solid ${estado.barColor}`,
      }}
    >
      {/* Etiqueta de planta (F 1, SINT 4…) — coincide con el cartel físico.
          Fallback al código REF si la máquina aún no tiene etiqueta. */}
      {maquina.etiqueta ? (
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 22,
            fontWeight: 800,
            backgroundColor: '#D09A40',
            color: '#0A0A0A',
            borderRadius: 8,
            padding: '4px 12px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            justifySelf: 'start',
          }}
        >
          {maquina.etiqueta}
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 22,
            fontWeight: 800,
            color: '#D09A40',
            letterSpacing: '0.02em',
          }}
        >
          {maquina.codigo}
        </div>
      )}

      {/* Nombre */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#F0F0F0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {maquina.nombre}
      </div>

      {/* Operario */}
      <div style={{ textAlign: 'right' }}>
        {uso ? (
          <>
            <div
              style={{
                fontSize: 10,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: 2,
              }}
            >
              Operario
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F0F0F0',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {getName(uso.tecnico_preparacion_id)}
            </div>
          </>
        ) : (
          <span style={{ color: '#444', fontSize: 22 }}>—</span>
        )}
      </div>

      {/* Cronómetro */}
      <div style={{ textAlign: 'right' }}>
        {uso ? <Cronometro uso={uso} /> : <span style={{ color: '#444', fontSize: 22 }}>—</span>}
      </div>

      {/* Badge de estado */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: estado.badgeBg,
            color: estado.color,
            fontSize: 16,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            border: `1.5px solid ${estado.color}66`,
          }}
        >
          {estado.indicator && <Pulse color={estado.color} />}
          {estado.label}
        </span>
      </div>
    </div>
  )
}

function Pulse({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 0 0 ${color}AA`,
        animation: 'tv-pulse 1.6s ease-in-out infinite',
      }}
    />
  )
}

function Cronometro({ uso }: { uso: UsoEquipo }) {
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))
  return (
    <>
      <div
        style={{
          fontSize: 10,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: 2,
        }}
      >
        Tiempo
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#22C55E',
          fontFamily: 'DM Mono, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {elapsed}
      </div>
    </>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

type BloqueData = {
  id: string
  titulo: string
  subtitulo: string | null
  maquinas: Maquina[]
}

function construirBloques(maquinas: Maquina[]): BloqueData[] {
  const bloques: BloqueData[] = []
  for (const sub of ['metal', 'seco', 'humedo'] as SubtipoFresadora[]) {
    const lista = maquinas
      .filter((m) => m.tipo === 'fresadora' && m.subtipo === sub)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
    if (lista.length > 0) {
      bloques.push({
        id: `fresadora-${sub}`,
        titulo: `Fresadoras ${SUBTIPOS_FRESADORA[sub].short}`,
        subtitulo: SUBTIPOS_FRESADORA[sub].description,
        maquinas: lista,
      })
    }
  }
  const sint = maquinas.filter((m) => m.tipo === 'sinterizadora').sort((a, b) => a.codigo.localeCompare(b.codigo))
  if (sint.length > 0) {
    bloques.push({ id: 'sinterizadoras', titulo: TIPOS_MAQUINA_PLURAL['sinterizadora'], subtitulo: null, maquinas: sint })
  }
  const imp = maquinas.filter((m) => m.tipo === 'impresora_3d').sort((a, b) => a.codigo.localeCompare(b.codigo))
  if (imp.length > 0) {
    bloques.push({ id: 'impresoras', titulo: TIPOS_MAQUINA_PLURAL['impresora_3d'], subtitulo: null, maquinas: imp })
  }
  return bloques
}

type Visual = { label: string; color: string; badgeBg: string; barColor: string; indicator: boolean }

function describirEstado(estado: Maquina['estado_actual'], hayUso: boolean): Visual {
  if (estado === 'activa' && hayUso) {
    return { label: 'En uso', color: '#22C55E', badgeBg: '#22C55E1A', barColor: '#22C55E', indicator: true }
  }
  if (estado === 'parada') {
    return { label: 'Libre', color: '#D09A40', badgeBg: '#D09A4014', barColor: '#D09A4066', indicator: false }
  }
  if (estado === 'mantenimiento') {
    return { label: 'Mantenimiento', color: '#3B82F6', badgeBg: '#3B82F61A', barColor: '#3B82F6', indicator: false }
  }
  if (estado === 'avería') {
    return { label: 'Avería', color: '#EF4444', badgeBg: '#EF44441F', barColor: '#EF4444', indicator: true }
  }
  return { label: 'Retirada', color: '#6B7280', badgeBg: '#6B72801A', barColor: '#6B728055', indicator: false }
}
