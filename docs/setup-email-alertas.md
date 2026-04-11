# Setup de email automático para alertas — FRESATITAN OPS

Esta guía configura el envío de emails a Toni y Roser cuando ocurre un evento
crítico en el taller:

- Alguien reporta una **avería** en una máquina desde el panel
- Un uso se cierra con resultado **KO**

La infraestructura usa **Supabase Edge Functions** + **Resend** para el envío.
Es gratis hasta 3.000 emails/mes, más que suficiente.

---

## 1. Crear cuenta en Resend

1. Ve a https://resend.com y regístrate (puedes usar GitHub)
2. En **API Keys** → **Create API Key** → nombre `fresatitan-ops` → permisos `Sending access` → Create
3. **Copia la API key** (solo se muestra una vez). Tiene este formato: `re_xxxxxxxxxxxxxxxxxx`

## 2. Verificar dominio (recomendado pero opcional)

**Opción A — Sin dominio verificado (sandbox)**

Puedes empezar enviando desde `onboarding@resend.dev`, pero:
- Solo puedes mandar emails **al email con el que te registraste en Resend**
- No suenan profesionales

Esta opción es suficiente para probar.

**Opción B — Con dominio `fresatitan.com` verificado**

Para enviar desde `alertas@ops.fresatitan.com` (pinta pro):
1. En Resend → **Domains** → **Add Domain** → escribe `ops.fresatitan.com`
2. Resend te da una lista de registros DNS (SPF, DKIM, DMARC) para añadir en cdmon
3. Añade esos registros en el panel de cdmon (zona DNS de `fresatitan.com`)
4. Espera 10-30 min y pulsa **Verify** en Resend
5. Cuando diga "Verified", puedes enviar desde cualquier email en ese subdominio

Lo dejamos opcional porque la Opción A es suficiente para empezar.

---

## 3. Instalar Supabase CLI (si no lo tienes)

```bash
# Windows (PowerShell, scoop)
scoop install supabase

# O con npm (multiplataforma)
npm install -g supabase
```

Verifica:

```bash
supabase --version
```

## 4. Vincular tu proyecto local a Supabase

En la raíz del repo:

```bash
supabase login                          # abre el navegador para autenticar
supabase link --project-ref jcvandpyyrhbklmbysjw
```

(Si te pide la contraseña de DB, la configuraste al crear el proyecto en Supabase).

## 5. Añadir los secretos a la Edge Function

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
supabase secrets set RESEND_FROM="FRESATITAN OPS <onboarding@resend.dev>"
supabase secrets set NOTIFY_TO_EMAILS="toni@fresatitan.com,roser@fresatitan.com"
```

> Si verificaste un dominio en el paso 2, sustituye `RESEND_FROM` por algo como
> `"FRESATITAN OPS <alertas@ops.fresatitan.com>"`.

## 6. Deployar la Edge Function

```bash
supabase functions deploy notify-alerta
```

Esto sube el código de [supabase/functions/notify-alerta/index.ts](../supabase/functions/notify-alerta/index.ts)
a Supabase y la deja lista para recibir invocaciones.

## 7. Configurar Database Webhooks en Supabase

En el Dashboard de Supabase:

### Webhook 1 — Avería reportada

1. **Database → Webhooks** → **Create a new webhook**
2. **Name**: `notify_averia`
3. **Table**: `maquinas`
4. **Events**: marca solo **Update**
5. **Type**: **Supabase Edge Functions**
6. **Edge Function**: `notify-alerta`
7. **HTTP Method**: `POST`
8. **HTTP Headers**: deja los default
9. Crear

### Webhook 2 — Uso cerrado con KO

1. **Database → Webhooks** → **Create a new webhook**
2. **Name**: `notify_uso_ko`
3. **Table**: `usos_equipo`
4. **Events**: marca solo **Update**
5. **Type**: **Supabase Edge Functions**
6. **Edge Function**: `notify-alerta`
7. **HTTP Method**: `POST`
8. Crear

La Edge Function internamente filtra por el tipo de cambio (solo reacciona
cuando `estado_actual` pasa a `'avería'` o `resultado` pasa a `'ko'`), así que
aunque se dispare en cada update, solo envía email en los casos relevantes.

---

## 8. Probar

1. Ve a `https://ops.fresatitan.com/panel`
2. Toca una máquina → "⚠ Reportar avería" → confirma
3. Debería llegar un email a `NOTIFY_TO_EMAILS` en 10-30 segundos
4. Revisa también los logs en Supabase → **Edge Functions → notify-alerta → Logs**

---

## Troubleshooting

- **No llega el email**:
  - Mira los logs de la Edge Function en Supabase (errores de Resend)
  - Revisa la carpeta de spam del destinatario
  - Verifica que `RESEND_API_KEY` está bien configurada: `supabase secrets list`
  - Si usas sandbox `onboarding@resend.dev`, solo llega al email con el que te registraste en Resend
- **El webhook no dispara**:
  - En Supabase → Webhooks → ve al webhook → pestaña `Recent Runs` para ver si se disparó y qué respondió
  - Si hay errores 5xx, revisa los logs de la Edge Function
- **Cambiar destinatarios**:
  - `supabase secrets set NOTIFY_TO_EMAILS="nuevo@email.com,otro@email.com"`
  - No hace falta redeployar la función, los secretos se recargan dinámicamente

---

## Coste

- **Resend**: gratis hasta 3.000 emails/mes. A partir de ahí, 20$/mes por 50k emails.
- **Supabase Edge Functions**: gratis hasta 500k invocaciones/mes en el plan free. Cada evento dispara 1 invocación.
- **Webhooks**: incluidos en el plan free de Supabase.

Para el volumen de alertas de FRESATITAN (unas pocas al día en el peor caso),
todo esto cabe holgadamente en los planes gratuitos.
