import { useEffect, useMemo, useState } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { useTrabajadoresStore } from '../store/trabajadoresStore'
import { useElapsedTime } from '../hooks/useElapsedTime'
import { toIsoDateTime } from '../lib/utils'
import { TIPOS_MAQUINA_PLURAL, SUBTIPOS_FRESADORA } from '../constants/estados'
import type { Maquina, UsoEquipo, SubtipoFresadora } from '../types/database'

/**
 * Panel TV — vista tipo "aeropuerto" para FRESATITAN OPS.
 *
 * Pensado para una pantalla colgada en la sala común (32"+ / TV) donde
 * cualquiera del equipo puede ver de un vistazo el estado de TODAS las
 * máquinas en tiempo real. NO se usa para fichar ni para operar: es solo
 * consulta.
 *
 * Diseño:
 *   · Fondo oscuro de alta legibilidad.
 *   · Tipografía gigante (≥ 24 px) para verse desde cualquier punto de la sala.
 *   · Una fila por máquina, con código, nombre, estado con color, técnico
 *     activo y tiempo si la máquina está en uso.
 *   · Agrupado por familia (Fresadoras Metal/Seco/Húmedo, Sinterizadoras,
 *     Impresoras 3D).
 *   · Auto-scroll vertical lento si la lista no cabe en pantalla, igual
 *     que los paneles de aeropuerto.
 *   · Banner superior con reloj enorme y fecha.
 *   · Footer fijo con leyenda de colores.
 *
 * Realtime de Supabase ya mantiene el state actualizado vía workflowStore.
 */
export default function TvPanel() {
  const maquinas = useWorkflowStore((s) => s.maquinas)
  const usos = useWorkflowStore((s) => s.usos)

  // Sólo máquinas operativas (Lilian queda fuera).
  const visibles = useMemo(() => maquinas.filter((m) => m.activa), [maquinas])

  // Construimos los bloques visuales: una sección por familia, agrupando
  // fresadoras por subtipo.
  const bloques = useMemo(() => construirBloques(visibles), [visibles])

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      <Header />

      {/* Cuerpo desplazable con auto-scroll si rebosa */}
      <main className="flex-1 relative overflow-hidden">
        <AutoScroll>
          <div className="px-10 pb-12 pt-4">
            {bloques.map((b) => (
              <BloqueFamilia key={b.id} titulo={b.titulo} subtitulo={b.subtitulo} maquinas={b.maquinas} usos={usos} />
            ))}
          </div>
        </AutoScroll>

        {/* Sombra superior para que el scroll quede más limpio visualmente */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#050505] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050505] to-transparent z-10" />
      </main>

      <Leyenda />
    </div>
  )
}

// =============================================================================
// HEADER — fecha grande + reloj enorme + logo de marca
// =============================================================================
function Header() {
  return (
    <header className="shrink-0 px-10 py-6 border-b-2 border-primary/30 flex items-center justify-between bg-[#080808]">
      <div className="flex items-center gap-5">
        <img src="/logo-f.png" alt="" className="h-14 w-auto" />
        <div className="leading-none">
          <div className="text-4xl font-bold tracking-tight">
            <span>Fresatitan</span>
            <span className="text-primary ml-3 font-light">OPS</span>
          </div>
          <div className="text-base text-text-tertiary uppercase tracking-[0.3em] mt-1.5">
            Estado de planta · Tiempo real
          </div>
        </div>
      </div>
      <RelojGigante />
    </header>
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
    <div className="text-right">
      <div className="text-xl text-text-tertiary capitalize">{fecha}</div>
      <div className="text-6xl font-mono font-bold text-primary tabular-nums leading-none mt-1">{time}</div>
    </div>
  )
}

// =============================================================================
// AUTO-SCROLL vertical lento — sólo si el contenido rebosa el viewport
// =============================================================================
function AutoScroll({ children }: { children: React.ReactNode }) {
  // CSS-only loop: si el contenido es más alto que el viewport, se anima de
  // arriba a abajo. Si cabe, no se mueve nada.
  return (
    <div className="h-full overflow-hidden relative">
      <div className="animate-tv-scroll">{children}</div>
    </div>
  )
}

// =============================================================================
// BLOQUE DE FAMILIA — un título con barra de acento + lista de máquinas
// =============================================================================
function BloqueFamilia({
  titulo,
  subtitulo,
  maquinas,
  usos,
}: {
  titulo: string
  subtitulo: string | null
  maquinas: Maquina[]
  usos: UsoEquipo[]
}) {
  if (maquinas.length === 0) return null
  return (
    <section className="mb-10">
      <div className="flex items-end gap-4 pl-1 mb-3">
        <h2 className="text-4xl font-black uppercase tracking-wide text-primary">{titulo}</h2>
        {subtitulo && (
          <span className="text-xl text-text-tertiary italic mb-1.5">{subtitulo}</span>
        )}
        <span className="ml-auto text-2xl font-mono text-text-tertiary">{maquinas.length}</span>
      </div>
      <div className="space-y-2.5">
        {maquinas.map((m) => (
          <FilaMaquina
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
// FILA DE MÁQUINA — código grande, nombre, estado con color, técnico, tiempo
// =============================================================================
function FilaMaquina({ maquina, uso }: { maquina: Maquina; uso: UsoEquipo | null }) {
  const getName = useTrabajadoresStore((s) => s.getTrabajadorName)

  const estado = describirEstado(maquina.estado_actual, !!uso)
  return (
    <div
      className={`
        flex items-center gap-6 rounded-xl px-6 py-4 border-l-8 bg-[#0D0D0D]
        ${estado.barClass}
      `}
    >
      {/* Código */}
      <div className="shrink-0 w-32 font-mono text-3xl text-primary font-bold">{maquina.codigo}</div>

      {/* Nombre */}
      <div className="flex-1 min-w-0">
        <div className="text-3xl font-bold truncate">{maquina.nombre}</div>
      </div>

      {/* Técnico activo si está en uso */}
      <div className="shrink-0 w-72 text-right">
        {uso ? (
          <>
            <div className="text-sm text-text-tertiary uppercase tracking-wider">Operario</div>
            <div className="text-2xl font-semibold truncate">{getName(uso.tecnico_preparacion_id)}</div>
          </>
        ) : null}
      </div>

      {/* Tiempo si está en uso */}
      <div className="shrink-0 w-44 text-right">
        {uso ? <Cronometro uso={uso} /> : <span className="text-2xl text-text-tertiary">—</span>}
      </div>

      {/* Estado con badge enorme */}
      <div className="shrink-0 w-56 flex justify-end">
        <span
          className={`
            inline-flex items-center gap-3 px-5 py-2.5 rounded-lg text-2xl font-black uppercase tracking-wider
            ${estado.badgeClass}
          `}
        >
          {estado.indicator && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-50" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-current" />
            </span>
          )}
          {estado.label}
        </span>
      </div>
    </div>
  )
}

function Cronometro({ uso }: { uso: UsoEquipo }) {
  const elapsed = useElapsedTime(toIsoDateTime(uso.fecha, uso.hora_preparacion))
  return (
    <>
      <div className="text-sm text-text-tertiary uppercase tracking-wider">Tiempo</div>
      <div className="text-2xl font-mono font-bold text-activa tabular-nums">{elapsed}</div>
    </>
  )
}

// =============================================================================
// LEYENDA de colores fija abajo
// =============================================================================
function Leyenda() {
  return (
    <footer className="shrink-0 px-10 py-4 border-t-2 border-primary/30 bg-[#080808] flex items-center justify-between text-base">
      <div className="flex items-center gap-6">
        <ItemLeyenda dot="bg-activa"     label="En uso" />
        <ItemLeyenda dot="bg-text-tertiary" label="Libre" />
        <ItemLeyenda dot="bg-mantenimiento" label="Mantenimiento" />
        <ItemLeyenda dot="bg-averia"     label="Avería" />
        <ItemLeyenda dot="bg-inactiva"   label="Retirada" />
      </div>
      <div className="text-text-tertiary uppercase tracking-[0.25em] text-sm">
        Actualización automática · FRESATITAN OPS TV
      </div>
    </footer>
  )
}

function ItemLeyenda({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-4 h-4 rounded-full ${dot}`} />
      <span className="text-text-secondary">{label}</span>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

type Bloque = {
  id: string
  titulo: string
  subtitulo: string | null
  maquinas: Maquina[]
}

function construirBloques(maquinas: Maquina[]): Bloque[] {
  const bloques: Bloque[] = []

  // Fresadoras agrupadas por subtipo (METAL, SECO, HÚMEDO)
  for (const sub of ['metal', 'seco', 'humedo'] as SubtipoFresadora[]) {
    const lista = maquinas
      .filter((m) => m.tipo === 'fresadora' && m.subtipo === sub)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
    if (lista.length > 0) {
      bloques.push({
        id: `fresadora-${sub}`,
        titulo: `Fresadoras · ${SUBTIPOS_FRESADORA[sub].short}`,
        subtitulo: SUBTIPOS_FRESADORA[sub].description,
        maquinas: lista,
      })
    }
  }

  // Sinterizadoras
  const sint = maquinas
    .filter((m) => m.tipo === 'sinterizadora')
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
  if (sint.length > 0) {
    bloques.push({
      id: 'sinterizadoras',
      titulo: TIPOS_MAQUINA_PLURAL['sinterizadora'],
      subtitulo: null,
      maquinas: sint,
    })
  }

  // Impresoras 3D
  const imp = maquinas
    .filter((m) => m.tipo === 'impresora_3d')
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
  if (imp.length > 0) {
    bloques.push({
      id: 'impresoras',
      titulo: TIPOS_MAQUINA_PLURAL['impresora_3d'],
      subtitulo: null,
      maquinas: imp,
    })
  }

  return bloques
}

type EstadoVisual = {
  label: string
  badgeClass: string
  barClass: string
  indicator: boolean
}

function describirEstado(estado: Maquina['estado_actual'], hayUso: boolean): EstadoVisual {
  // El estado "activa" sin uso pendiente es raro (debería significar en marcha
  // pero sin uso registrado). Lo tratamos como en uso si hay uso pendiente,
  // y como libre si no lo hay.
  if (estado === 'activa' && hayUso) {
    return {
      label: 'En uso',
      badgeClass: 'bg-activa/20 text-activa',
      barClass: 'border-activa',
      indicator: true,
    }
  }
  if (estado === 'parada') {
    return {
      label: 'Libre',
      badgeClass: 'bg-text-tertiary/10 text-text-secondary',
      barClass: 'border-text-tertiary/40',
      indicator: false,
    }
  }
  if (estado === 'mantenimiento') {
    return {
      label: 'Mantenimiento',
      badgeClass: 'bg-mantenimiento/20 text-mantenimiento',
      barClass: 'border-mantenimiento',
      indicator: false,
    }
  }
  if (estado === 'avería') {
    return {
      label: 'Avería',
      badgeClass: 'bg-averia/25 text-averia',
      barClass: 'border-averia',
      indicator: true,
    }
  }
  // inactiva
  return {
    label: 'Retirada',
    badgeClass: 'bg-inactiva/20 text-inactiva',
    barClass: 'border-inactiva/40',
    indicator: false,
  }
}
