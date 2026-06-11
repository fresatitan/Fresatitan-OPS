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
      <Header kpis={kpis} />
      <ScrollLoop>
        {bloques.map((b) => (
          <Bloque key={b.id} bloque={b} usos={usos} />
        ))}
      </ScrollLoop>
      <Leyenda />
    </div>
  )
}

// =============================================================================
// HEADER — logo + título + reloj + KPIs en banner superior
// =============================================================================
function Header({ kpis }: { kpis: { activas: number; libres: number; mant: number; averia: number; total: number } }) {
  return (
    <header
      className="shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-8 px-8 py-4 border-b-2"
      style={{
        backgroundColor: '#080808',
        borderColor: 'rgba(208, 154, 64, 0.35)',
      }}
    >
      <div className="flex items-center gap-4">
        <img
          src="/logo-f.png"
          alt=""
          style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#F0F0F0' }}>Fresatitan</span>
            <span style={{ color: '#D09A40', marginLeft: 10, fontWeight: 300 }}>OPS</span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.35em',
              marginTop: 6,
            }}
          >
            Estado de planta · Tiempo real
          </div>
        </div>
      </div>

      {/* KPIs centrales */}
      <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto w-full">
        <Kpi label="En uso" value={kpis.activas} color="#22C55E" />
        <Kpi label="Libres" value={kpis.libres} color="#D09A40" />
        <Kpi label="Manten." value={kpis.mant} color="#3B82F6" />
        <Kpi label="Avería" value={kpis.averia} color="#EF4444" />
      </div>

      <RelojGigante />
    </header>
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

function RelojGigante() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const fecha = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div style={{ textAlign: 'right', minWidth: 200 }}>
      <div style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{fecha}</div>
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
    <main className="flex-1 relative overflow-hidden">
      <div
        ref={innerRef}
        style={{
          animation: `tv-scroll-loop ${duration}s linear infinite`,
        }}
      >
        <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 12, paddingBottom: 20 }}>
          {children}
        </div>
        {/* Duplicado del contenido para que el loop sea visualmente continuo */}
        <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 12, paddingBottom: 20 }} aria-hidden="true">
          {children}
        </div>
      </div>

      {/* Degradados arriba y abajo para que el corte del loop sea limpio */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: 24, background: 'linear-gradient(180deg, #0A0A0A 0%, transparent 100%)', zIndex: 5 }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: 32, background: 'linear-gradient(0deg, #0A0A0A 0%, transparent 100%)', zIndex: 5 }}
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
      {/* Código */}
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
// LEYENDA pie
// =============================================================================
function Leyenda() {
  return (
    <footer
      className="shrink-0 flex items-center justify-between px-8 py-3 border-t-2"
      style={{
        backgroundColor: '#080808',
        borderColor: 'rgba(208, 154, 64, 0.35)',
      }}
    >
      <div className="flex items-center gap-6">
        <Item color="#22C55E" label="En uso" />
        <Item color="#D09A40" label="Libre" />
        <Item color="#3B82F6" label="Mantenimiento" />
        <Item color="#EF4444" label="Avería" />
      </div>
      <div
        style={{
          fontSize: 11,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.3em',
        }}
      >
        Fresatitan OPS · TV · actualización automática
      </div>
    </footer>
  )
}

function Item({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: color }} />
      <span style={{ color: '#CCC', fontSize: 13, fontWeight: 600 }}>{label}</span>
    </div>
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
