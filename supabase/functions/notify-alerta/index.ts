// =============================================================================
// FRESATITAN OPS · Edge Function: notify-alerta
// =============================================================================
// Envía un email a los administradores de FRESATITAN cuando se dispara un
// evento crítico (avería reportada o uso cerrado con KO).
//
// Se invoca desde un Database Webhook de Supabase configurado sobre las tablas:
//   · maquinas (cuando estado_actual cambia a 'avería')
//   · usos_equipo (cuando resultado cambia a 'ko')
//
// Requiere los siguientes secretos en Supabase (Settings → Edge Functions):
//   · RESEND_API_KEY      → API key de Resend (https://resend.com)
//   · RESEND_FROM         → email remitente verificado en Resend (ej. alertas@ops.fresatitan.com)
//   · NOTIFY_TO_EMAILS    → lista separada por comas de admins a notificar (ej. toni@fresatitan.com,roser@fresatitan.com)
// =============================================================================

// @ts-expect-error — Deno imports se resuelven en runtime de Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

// Tipos locales (evitamos import del proyecto porque Edge Functions son Deno)
interface MaquinaRow {
  id: string
  codigo: string
  nombre: string
  estado_actual: string
  tipo: string
  ubicacion: string | null
}

interface UsoRow {
  id: string
  maquina_id: string
  fecha: string
  hora_preparacion: string
  hora_acabado: string | null
  resultado: string
  tecnico_preparacion_id: string | null
  tecnico_acabado_id: string | null
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: MaquinaRow | UsoRow
  old_record?: MaquinaRow | UsoRow
  schema: string
}

// @ts-expect-error Deno global
const env = (k: string): string => Deno.env.get(k) ?? ''

const RESEND_API_KEY = env('RESEND_API_KEY')
const RESEND_FROM = env('RESEND_FROM') || 'FRESATITAN OPS <onboarding@resend.dev>'
const NOTIFY_TO_EMAILS = (env('NOTIFY_TO_EMAILS') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

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
      'Authorization': `Bearer ${RESEND_API_KEY}`,
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
  } else {
    console.log('[notify-alerta] Email enviado:', subject)
  }
}

function renderAveriaHtml(maquina: MaquinaRow): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #f0f0f0; padding: 24px; border-radius: 8px;">
      <div style="border-bottom: 2px solid #d09a40; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #d09a40; margin: 0; font-size: 20px;">FRESATITAN OPS</h1>
        <p style="color: #888; margin: 4px 0 0; font-size: 12px;">Alerta de producción</p>
      </div>
      <div style="background: #1a0e0e; border: 2px solid #EF4444; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #EF4444; margin: 0 0 8px; font-size: 18px;">⚠ Avería reportada</h2>
        <p style="color: #f0f0f0; margin: 0 0 16px; font-size: 14px;">
          Una máquina ha pasado al estado de <strong>avería</strong> y requiere atención.
        </p>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #888; padding: 4px 0; width: 120px;">Código</td>
            <td style="color: #d09a40; font-family: monospace; font-weight: bold;">${maquina.codigo}</td>
          </tr>
          <tr>
            <td style="color: #888; padding: 4px 0;">Nombre</td>
            <td style="color: #f0f0f0; font-weight: 600;">${maquina.nombre}</td>
          </tr>
          <tr>
            <td style="color: #888; padding: 4px 0;">Tipo</td>
            <td style="color: #f0f0f0;">${maquina.tipo}</td>
          </tr>
          ${maquina.ubicacion ? `
          <tr>
            <td style="color: #888; padding: 4px 0;">Ubicación</td>
            <td style="color: #f0f0f0;">${maquina.ubicacion}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      <p style="color: #888; font-size: 12px; text-align: center; margin: 16px 0 0;">
        Entra al panel de administración para ver el detalle y gestionar la incidencia.
      </p>
      <p style="text-align: center; margin: 16px 0 0;">
        <a href="https://ops.fresatitan.com/alertas" style="display: inline-block; background: #d09a40; color: #0f0f0f; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">Ver en el panel</a>
      </p>
    </div>
  `
}

function renderKoHtml(uso: UsoRow): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #f0f0f0; padding: 24px; border-radius: 8px;">
      <div style="border-bottom: 2px solid #d09a40; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #d09a40; margin: 0; font-size: 20px;">FRESATITAN OPS</h1>
        <p style="color: #888; margin: 4px 0 0; font-size: 12px;">Alerta de producción</p>
      </div>
      <div style="background: #1a140e; border: 2px solid #F59E0B; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #F59E0B; margin: 0 0 8px; font-size: 18px;">⚠ Uso cerrado con incidencia</h2>
        <p style="color: #f0f0f0; margin: 0 0 16px; font-size: 14px;">
          Un trabajo en máquina se ha cerrado con resultado <strong>KO</strong>.
        </p>
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #888; padding: 4px 0; width: 120px;">Fecha</td>
            <td style="color: #f0f0f0; font-family: monospace;">${uso.fecha}</td>
          </tr>
          <tr>
            <td style="color: #888; padding: 4px 0;">Preparación</td>
            <td style="color: #f0f0f0; font-family: monospace;">${uso.hora_preparacion.slice(0, 5)}</td>
          </tr>
          ${uso.hora_acabado ? `
          <tr>
            <td style="color: #888; padding: 4px 0;">Acabado</td>
            <td style="color: #f0f0f0; font-family: monospace;">${uso.hora_acabado.slice(0, 5)}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      <p style="color: #888; font-size: 12px; text-align: center; margin: 16px 0 0;">
        Revisa las incidencias reportadas en el panel de alertas.
      </p>
      <p style="text-align: center; margin: 16px 0 0;">
        <a href="https://ops.fresatitan.com/alertas" style="display: inline-block; background: #d09a40; color: #0f0f0f; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">Ver en el panel</a>
      </p>
    </div>
  `
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload = (await req.json()) as WebhookPayload

    // Caso 1: máquina pasa a avería
    if (payload.table === 'maquinas' && payload.type === 'UPDATE') {
      const nuevo = payload.record as MaquinaRow
      const viejo = payload.old_record as MaquinaRow | undefined
      if (nuevo.estado_actual === 'avería' && viejo?.estado_actual !== 'avería') {
        await sendEmail(
          `⚠ Avería en ${nuevo.codigo} — ${nuevo.nombre}`,
          renderAveriaHtml(nuevo)
        )
      }
    }

    // Caso 2: uso cerrado con KO
    if (payload.table === 'usos_equipo' && payload.type === 'UPDATE') {
      const nuevo = payload.record as UsoRow
      const viejo = payload.old_record as UsoRow | undefined
      if (nuevo.resultado === 'ko' && viejo?.resultado !== 'ko') {
        await sendEmail(
          `⚠ Uso cerrado con incidencia — ${nuevo.fecha}`,
          renderKoHtml(nuevo)
        )
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notify-alerta] error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
