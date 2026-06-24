// =============================================================================
// FRESATITAN OPS · Edge Function: notify-alerta
// =============================================================================
// Envía un email a los administradores (Roser + Toni) cuando ocurre un evento
// crítico en el taller:
//
//   · event = 'averia_reportada' → alguien reportó avería desde el /panel
//   · event = 'uso_ko'           → un uso se ha cerrado con resultado 'ko'
//
// Se invoca directamente desde el cliente con supabase.functions.invoke() tras
// completar la acción correspondiente (ver src/store/workflowStore.ts).
//
// Para evitar abuso: la función recibe solo IDs, y luego consulta la DB con el
// service_role_key para obtener los datos reales y verificar el estado antes
// de enviar el correo. Si la avería/ko no está realmente registrada, no manda
// nada.
//
// Secretos requeridos (supabase secrets set):
//   · RESEND_API_KEY      → https://resend.com
//   · RESEND_FROM         → remitente (dominio verificado en Resend)
//   · NOTIFY_TO_EMAILS    → CSV de destinatarios
// Variables auto-provistas por Supabase en el runtime de Edge Functions:
//   · SUPABASE_URL
//   · SUPABASE_SERVICE_ROLE_KEY
// =============================================================================

// @ts-expect-error — Deno imports se resuelven en runtime de Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
// @ts-expect-error — esm.sh import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// @ts-expect-error Deno global
const env = (k: string): string => Deno.env.get(k) ?? ''

const RESEND_API_KEY = env('RESEND_API_KEY')
const RESEND_FROM = env('RESEND_FROM') || 'FRESATITAN OPS <onboarding@resend.dev>'
const NOTIFY_TO_EMAILS = (env('NOTIFY_TO_EMAILS') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const SUPABASE_URL = env('SUPABASE_URL')
const SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// -----------------------------------------------------------------------------
// Payloads admitidos
// -----------------------------------------------------------------------------
interface AveriaPayload {
  event: 'averia_reportada'
  maquina_id: string
  motivo?: string | null
  reportado_por_id?: string | null
}

interface UsoKoPayload {
  event: 'uso_ko'
  uso_id: string
}

interface AveriaResueltaPayload {
  event: 'averia_resuelta'
  maquina_id: string
  resuelto_por_id?: string | null
}

type Payload = AveriaPayload | UsoKoPayload | AveriaResueltaPayload

// -----------------------------------------------------------------------------
// Envío de correo via Resend
// -----------------------------------------------------------------------------
async function sendEmail(subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('[notify-alerta] RESEND_API_KEY no configurada')
    return
  }
  if (NOTIFY_TO_EMAILS.length === 0) {
    console.error('[notify-alerta] NOTIFY_TO_EMAILS vacío')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: NOTIFY_TO_EMAILS,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[notify-alerta] Resend error:', res.status, err)
    throw new Error(`Resend ${res.status}: ${err}`)
  }
  console.log('[notify-alerta] Email enviado:', subject)
}

// -----------------------------------------------------------------------------
// Plantillas HTML
// -----------------------------------------------------------------------------
function wrap(innerHtml: string): string {
  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #f0f0f0; padding: 24px; border-radius: 8px;">
      <div style="border-bottom: 2px solid #d09a40; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #d09a40; margin: 0; font-size: 20px; letter-spacing: 0.5px;">FRESATITAN OPS</h1>
        <p style="color: #888; margin: 4px 0 0; font-size: 12px;">Alerta automática del sistema</p>
      </div>
      ${innerHtml}
      <p style="text-align: center; margin: 20px 0 0;">
        <a href="https://ops.fresatitan.com/alertas" style="display: inline-block; background: #d09a40; color: #0f0f0f; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">Ver en el panel</a>
      </p>
      <p style="color: #555; font-size: 11px; text-align: center; margin: 16px 0 0;">
        Este correo es automático. No respondas a esta dirección.
      </p>
    </div>
  `
}

function renderAveriaHtml(args: {
  codigo: string
  nombre: string
  tipo: string
  ubicacion: string | null
  motivo: string | null
  reportadoPor: string | null
  fechaReporte: string
}): string {
  const { codigo, nombre, tipo, ubicacion, motivo, reportadoPor, fechaReporte } = args
  return wrap(`
    <div style="background: #1a0e0e; border: 2px solid #EF4444; border-radius: 8px; padding: 20px; margin-bottom: 12px;">
      <h2 style="color: #EF4444; margin: 0 0 8px; font-size: 18px;">⚠ Avería reportada</h2>
      <p style="color: #f0f0f0; margin: 0 0 16px; font-size: 14px;">
        Una máquina acaba de pasar al estado <strong>avería</strong> y requiere atención.
      </p>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="color: #888; padding: 4px 0; width: 130px;">Código</td>
          <td style="color: #d09a40; font-family: 'DM Mono', monospace; font-weight: bold;">${codigo}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Nombre</td>
          <td style="color: #f0f0f0; font-weight: 600;">${nombre}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Tipo</td>
          <td style="color: #f0f0f0; text-transform: capitalize;">${tipo}</td>
        </tr>
        ${ubicacion ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Ubicación</td>
          <td style="color: #f0f0f0;">${ubicacion}</td>
        </tr>` : ''}
        ${reportadoPor ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Reportado por</td>
          <td style="color: #f0f0f0; font-weight: 600;">${reportadoPor}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #888; padding: 4px 0;">Fecha</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${fechaReporte}</td>
        </tr>
      </table>
      ${motivo ? `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(239,68,68,0.2);">
        <div style="color: #EF4444; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Motivo reportado</div>
        <p style="color: #f0f0f0; margin: 0; font-size: 13px; line-height: 1.5;">${escapeHtml(motivo)}</p>
      </div>` : ''}
    </div>
  `)
}

function renderAveriaResueltaHtml(args: {
  codigo: string
  nombre: string
  tipo: string
  ubicacion: string | null
  motivoOriginal: string | null
  duracionLegible: string | null
  fechaAveria: string | null
  fechaResolucion: string
  resueltoPor: string | null
}): string {
  const {
    codigo, nombre, tipo, ubicacion, motivoOriginal,
    duracionLegible, fechaAveria, fechaResolucion, resueltoPor,
  } = args
  return wrap(`
    <div style="background: #0e1a12; border: 2px solid #22C55E; border-radius: 8px; padding: 20px; margin-bottom: 12px;">
      <h2 style="color: #22C55E; margin: 0 0 8px; font-size: 18px;">✓ Avería resuelta</h2>
      <p style="color: #f0f0f0; margin: 0 0 16px; font-size: 14px;">
        La máquina vuelve a estar disponible.
      </p>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="color: #888; padding: 4px 0; width: 130px;">Código</td>
          <td style="color: #d09a40; font-family: 'DM Mono', monospace; font-weight: bold;">${codigo}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Nombre</td>
          <td style="color: #f0f0f0; font-weight: 600;">${nombre}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Tipo</td>
          <td style="color: #f0f0f0; text-transform: capitalize;">${tipo}</td>
        </tr>
        ${ubicacion ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Ubicación</td>
          <td style="color: #f0f0f0;">${ubicacion}</td>
        </tr>` : ''}
        ${fechaAveria ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Reportada</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${fechaAveria}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #888; padding: 4px 0;">Resuelta</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${fechaResolucion}</td>
        </tr>
        ${duracionLegible ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Duración avería</td>
          <td style="color: #22C55E; font-family: 'DM Mono', monospace; font-weight: 600;">${duracionLegible}</td>
        </tr>` : ''}
        ${resueltoPor ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Resuelta por</td>
          <td style="color: #f0f0f0; font-weight: 600;">${resueltoPor}</td>
        </tr>` : ''}
      </table>
      ${motivoOriginal ? `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(34,197,94,0.2);">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Motivo original de la avería</div>
        <p style="color: #f0f0f0; margin: 0; font-size: 13px; line-height: 1.5;">${escapeHtml(motivoOriginal)}</p>
      </div>` : ''}
    </div>
  `)
}

function renderUsoKoHtml(args: {
  codigoMaquina: string
  nombreMaquina: string
  fecha: string
  horaPreparacion: string
  horaAcabado: string | null
  tecnicoAcabado: string | null
  observaciones: string | null
  incidencias: string[]
}): string {
  const { codigoMaquina, nombreMaquina, fecha, horaPreparacion, horaAcabado, tecnicoAcabado, observaciones, incidencias } = args
  return wrap(`
    <div style="background: #1a140e; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 12px;">
      <h2 style="color: #F59E0B; margin: 0 0 8px; font-size: 18px;">⚠ Uso cerrado con incidencia (KO)</h2>
      <p style="color: #f0f0f0; margin: 0 0 16px; font-size: 14px;">
        Un trabajo en máquina se ha cerrado con resultado <strong>KO</strong>.
      </p>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="color: #888; padding: 4px 0; width: 130px;">Máquina</td>
          <td style="color: #d09a40; font-family: 'DM Mono', monospace; font-weight: bold;">${codigoMaquina}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Nombre</td>
          <td style="color: #f0f0f0; font-weight: 600;">${nombreMaquina}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Fecha</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${fecha}</td>
        </tr>
        <tr>
          <td style="color: #888; padding: 4px 0;">Preparación</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${horaPreparacion.slice(0, 5)}</td>
        </tr>
        ${horaAcabado ? `
        <tr>
          <td style="color: #888; padding: 4px 0;">Cierre</td>
          <td style="color: #f0f0f0; font-family: 'DM Mono', monospace;">${horaAcabado.slice(0, 5)}${tecnicoAcabado ? ` · ${tecnicoAcabado}` : ''}</td>
        </tr>` : ''}
      </table>
      ${incidencias.length > 0 ? `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(245,158,11,0.2);">
        <div style="color: #F59E0B; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Incidencias reportadas (${incidencias.length})</div>
        <ul style="margin: 0; padding: 0; list-style: none;">
          ${incidencias.map((i) => `<li style="color: #f0f0f0; font-size: 13px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">⚠ ${escapeHtml(i)}</li>`).join('')}
        </ul>
      </div>` : ''}
      ${observaciones ? `
      <div style="margin-top: 12px;">
        <div style="color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Observaciones</div>
        <p style="color: #f0f0f0; margin: 0; font-size: 13px; line-height: 1.5;">${escapeHtml(observaciones)}</p>
      </div>` : ''}
    </div>
  `)
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDuracion(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const dias = Math.floor(totalMin / (60 * 24))
  const horas = Math.floor((totalMin % (60 * 24)) / 60)
  const mins = totalMin % 60
  if (dias > 0) return `${dias}d ${horas}h ${mins}m`
  if (horas > 0) return `${horas}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return 'menos de 1 minuto'
}

function formatFecha(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid',
    })
  } catch {
    return ts
  }
}

// -----------------------------------------------------------------------------
// Handlers por evento
// -----------------------------------------------------------------------------
async function handleAveria(p: AveriaPayload): Promise<void> {
  // Obtener la máquina y verificar que está en avería
  const { data: maquina, error: mErr } = await admin
    .from('maquinas')
    .select('id, codigo, nombre, tipo, ubicacion, estado_actual')
    .eq('id', p.maquina_id)
    .single()

  if (mErr || !maquina) {
    console.error('[notify-alerta][averia] máquina no encontrada:', p.maquina_id, mErr)
    return
  }
  if (maquina.estado_actual !== 'avería') {
    console.log('[notify-alerta][averia] la máquina ya no está en avería, saltando envío')
    return
  }

  // Nombre de quien lo reportó (si se pasó id)
  let reportadoPor: string | null = null
  if (p.reportado_por_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('nombre, apellidos')
      .eq('id', p.reportado_por_id)
      .single()
    if (profile) {
      reportadoPor = `${profile.nombre} ${profile.apellidos}`.trim()
    }
  }

  await sendEmail(
    `⚠ Avería en ${maquina.codigo} — ${maquina.nombre}`,
    renderAveriaHtml({
      codigo: maquina.codigo,
      nombre: maquina.nombre,
      tipo: maquina.tipo,
      ubicacion: maquina.ubicacion,
      motivo: p.motivo ?? null,
      reportadoPor,
      fechaReporte: formatFecha(new Date().toISOString()),
    })
  )
}

async function handleAveriaResuelta(p: AveriaResueltaPayload): Promise<void> {
  const { data: maquina, error: mErr } = await admin
    .from('maquinas')
    .select('id, codigo, nombre, tipo, ubicacion, estado_actual')
    .eq('id', p.maquina_id)
    .single()

  if (mErr || !maquina) {
    console.error('[notify-alerta][resuelta] máquina no encontrada:', p.maquina_id, mErr)
    return
  }
  // Sanity: la máquina NO debería estar ya en avería (si sigue en avería, no se resolvió)
  if (maquina.estado_actual === 'avería') {
    console.log('[notify-alerta][resuelta] la máquina sigue en avería, saltando envío')
    return
  }

  // Buscamos la última entrada de avería en el historial para obtener motivo y duración
  const { data: ultimaAveria } = await admin
    .from('maquina_estados')
    .select('timestamp, motivo')
    .eq('maquina_id', maquina.id)
    .eq('estado', 'avería')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ahora = new Date()
  const fechaAveria = ultimaAveria?.timestamp ?? null
  const duracionMs = fechaAveria
    ? ahora.getTime() - new Date(fechaAveria).getTime()
    : null

  let resueltoPor: string | null = null
  if (p.resuelto_por_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('nombre, apellidos')
      .eq('id', p.resuelto_por_id)
      .single()
    if (profile) resueltoPor = `${profile.nombre} ${profile.apellidos}`.trim()
  }

  await sendEmail(
    `✓ Avería resuelta en ${maquina.codigo} — ${maquina.nombre}`,
    renderAveriaResueltaHtml({
      codigo: maquina.codigo,
      nombre: maquina.nombre,
      tipo: maquina.tipo,
      ubicacion: maquina.ubicacion,
      motivoOriginal: ultimaAveria?.motivo ?? null,
      duracionLegible: duracionMs !== null ? formatDuracion(duracionMs) : null,
      fechaAveria: fechaAveria ? formatFecha(fechaAveria) : null,
      fechaResolucion: formatFecha(ahora.toISOString()),
      resueltoPor,
    })
  )
}

async function handleUsoKo(p: UsoKoPayload): Promise<void> {
  const { data: uso, error: uErr } = await admin
    .from('usos_equipo')
    .select('id, maquina_id, fecha, hora_preparacion, hora_acabado, resultado, tecnico_acabado_id, observaciones')
    .eq('id', p.uso_id)
    .single()

  if (uErr || !uso) {
    console.error('[notify-alerta][uso_ko] uso no encontrado:', p.uso_id, uErr)
    return
  }
  if (uso.resultado !== 'ko') {
    console.log('[notify-alerta][uso_ko] el uso no está en KO, saltando envío')
    return
  }

  const { data: maquina } = await admin
    .from('maquinas')
    .select('codigo, nombre')
    .eq('id', uso.maquina_id)
    .single()

  if (!maquina) {
    console.error('[notify-alerta][uso_ko] máquina asociada no encontrada')
    return
  }

  let tecnicoAcabado: string | null = null
  if (uso.tecnico_acabado_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('nombre, apellidos')
      .eq('id', uso.tecnico_acabado_id)
      .single()
    if (profile) tecnicoAcabado = `${profile.nombre} ${profile.apellidos}`.trim()
  }

  const { data: incidencias } = await admin
    .from('incidencias')
    .select('descripcion')
    .eq('uso_id', uso.id)

  const incidenciasStr: string[] = (incidencias ?? []).map((i: { descripcion: string }) => i.descripcion)

  await sendEmail(
    `⚠ Uso KO en ${maquina.codigo} — ${uso.fecha}`,
    renderUsoKoHtml({
      codigoMaquina: maquina.codigo,
      nombreMaquina: maquina.nombre,
      fecha: uso.fecha,
      horaPreparacion: uso.hora_preparacion,
      horaAcabado: uso.hora_acabado,
      tecnicoAcabado,
      observaciones: uso.observaciones,
      incidencias: incidenciasStr,
    })
  )
}

// -----------------------------------------------------------------------------
// Entrypoint
// -----------------------------------------------------------------------------
serve(async (req: Request) => {
  // CORS — permite invocar desde el cliente (anon) en el dominio de la app
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as Payload

    if (payload.event === 'averia_reportada') {
      await handleAveria(payload)
    } else if (payload.event === 'averia_resuelta') {
      await handleAveriaResuelta(payload)
    } else if (payload.event === 'uso_ko') {
      await handleUsoKo(payload)
    } else {
      console.warn('[notify-alerta] evento desconocido:', (payload as { event?: string }).event)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notify-alerta] error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
