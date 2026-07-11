# CLAUDE.md — FRESATITAN OPS

## Contexto del proyecto

**FRESATITAN OPS** es la plataforma de control de planta de **FRESATITAN, S.L.** — laboratorio dental CAD-CAM (fresado, sinterizado e impresión 3D de prótesis). Controla el estado de las máquinas, el registro de trabajos por operario, averías, mantenimientos e informes. **En producción y en uso real** (julio 2026).

Tres experiencias:
- **Panel de Planta** (`/panel`): táctil para tablets del taller. Los operarios eligen máquina por su **etiqueta física** (F 1, Zr 2, SINT 4, TI 1…), registran preparación/producción/mantenimiento con cronómetro y cierran con OK/KO.
- **Dashboard Admin** (`/`): gestión para Toni y Roser (login Supabase Auth). KPIs, máquinas por familia/sub-familia, trabajadores, alertas, auditoría e informes.
- **Panel TV** (`/tv`): "panel de aeropuerto" de solo lectura con auto-scroll para el televisor del taller. Paleta oscura FIJA (hex hardcodeados a propósito, no sigue al tema).

**Distribución**: web en Vercel (deploy automático al hacer push a `main`) + dos APKs Android vía Capacitor: operario (`com.fresatitan.ops`, arranca en `/panel`) y TV (`com.fresatitan.ops.tv`, arranca en `/tv`, se genera con `scripts/build-apk-tv.sh <version>`). Versión Android actual: 1.14. Salida en `builds/apk*/NNN/` y `~/Downloads`.

---

## Stack tecnológico

- **Frontend**: React 19 + TypeScript + Vite 8 (rolldown)
- **Estilos**: Tailwind CSS v4 (tokens en `@theme` de `src/index.css`)
- **Backend / DB**: Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions)
- **Estado global**: Zustand (`workflowStore`, `trabajadoresStore`, `authStore`, `themeStore`)
- **Routing**: React Router v7 (`react-router-dom` ^7)
- **Nativo**: Capacitor 8 (Android; StatusBar/SplashScreen)
- **Exportación**: xlsx (Excel) / jsPDF (PDF) · **Gráficas**: Recharts · **Toasts**: react-hot-toast
- **Emails de alerta**: Edge Function `notify-alerta` (Resend) → Roser + Toni
- **Deploy**: Vercel (integración Git; push a `main` = deploy a producción)

---

## Diseño: clínico-técnico (rediseño julio 2026)

Dos temas gobernados por tokens CSS (`[data-theme='light']` en `index.css`):

- **Claro "clínico-técnico"** — por defecto en `/panel`: página hueso cálido `#F6F5F1`, cards blancas, tinta cálida de 3 niveles, estados desaturados. El dorado como tinta usa `--color-primary-ink` (bronce AA `#8A6520` en claro).
- **Oscuro industrial** — por defecto en el resto: superficies `#0A0A0A`–`#222`.

Reglas del lenguaje visual:
- **Dorado `#D09A40` como ÚNICO acento** de marca (placas, CTA); no añadir otros acentos que compitan.
- **Tipografía**: Archivo (grotesk de señalética, UI) + DM Mono (códigos, cronómetros, métricas).
- **Iconos**: set SVG propio en `src/components/ui/icons.tsx` (trazo 1.7). **Prohibido usar emojis como iconos** (renderizan distinto por dispositivo y delatan la UI como generada).
- **Cards**: superficie neutra + borde 1px + `shadow-card`; el estado se comunica con **barra lateral de 3px + chip punto-y-texto**, nunca tiñendo toda la card. Sin glows, sin `animate-ping` (solo `dot-breathe` en el punto cuando hay avería).
- **EtiquetaTag** (`ui/EtiquetaTag.tsx`): placa dorada que replica el cartel físico de cada máquina — es EL identificador del operario, domina sobre código REF y nombre.
- Botones táctiles: `.btn-touch` + `.btn-touch-primary` / `.btn-touch-danger`; selección con anillo dorado (`ring-1 ring-primary`).
- Estados de máquina (recalibrados por tema): activa/libre verde · en uso ámbar · avería roja · mantenimiento azul · inactiva gris.
- **Login**: pantalla partida — panel de marca oscuro fijo con vídeo de fresado en bucle (`public/login-bg.mp4`) bajo tinte gradiente de legibilidad + formulario sobre tokens.

---

## Roles y acceso

| Rol | Acceso |
|---|---|
| Operarios | Sin cuenta — usan la tablet (`/panel`); se identifican tocando su avatar en cada acción |
| `admin` (Toni, Roser) | Login Supabase Auth → Dashboard completo |

La tabla `profiles` guarda trabajadores (nombre, rol, `activo`, `puede_operar`). En el panel se eligen por avatar; no hay texto libre.

---

## Máquinas reales (producción)

El subtipo diferencia catálogos de procesos, averías y mantenimiento.

| Etiqueta | Código | Máquina | Tipo · subtipo | Lanzamiento |
|---|---|---|---|---|
| F 1-3 | REF-039/040/066 | Fresadoras FANUC 1-3 | fresadora · metal | no |
| Zr 1-3 | REF-030/057/064 | Fresadoras UP3D/P53 | fresadora · seco | no |
| Ds 1-2 | REF-042/062 | Biomill / UP3D P42 | fresadora · humedo | no |
| SINT 1-5 | REF-045…049 | TRUMPF ×3 + SISMA ×2 | sinterizadora · cr_co (N₂) | **sí** |
| TI 1 | REF-TITANIO | ZONELAB CREATE | sinterizadora · titanio (Ar) | **sí** |
| Imp 1-2 | REF-063/067 | PROZEN / MIICRAFT | impresora_3d | no |
| — | REF-041 | CM Lilian | retirada (`activa=false`) | — |

- `requiere_lanzamiento` (¿quién pulsa START?) **solo en sinterizadoras** (acuerdo cliente julio 2026).
- `requiere_preparacion` solo en sinterizadoras: ciclo estricto preparación → producción → cierre.

### Procesos por sub-familia (`PROCESOS_POR_SUBFAMILIA`)
metal: titanio, cr_co · seco: circonio, pmma, otro · humedo: disilicato, composite · sinterizadora: cr_co_rigido, cr_co_flexible, titanio · impresora_3d: otro. (Valores antiguos —fresado, sinterizado…— se conservan en el enum solo para históricos.)

### Averías habituales por sub-familia (`TIPOS_INCIDENCIA_POR_SUBFAMILIA`)
Lista oficial del cliente (julio 2026). El texto libre al cerrar en KO es **opcional salvo en «Otros»**. La lista de titanio es PROVISIONAL hasta confirmación de Roser.

### Mantenimiento por sub-familia (`constants/mantenimiento.ts`)
Acciones oficiales por catálogo (metal incluye "Cambio de herramienta" 1-21; seco 1-6; húmedo 1-12; Cr-Co con PIAB; titanio con Filtro 1/2/3 sin PIAB) + plantillas de planes de revisión con auto-vinculación por nombre.

---

## Flujos clave

1. **Uso (producción)**: tocar máquina libre → ¿quién? → (¿quién lanza? solo sinterizadoras) → proceso → confirmar → cronómetro → cerrar: ¿quién cierra? → OK / KO → si KO: tipo de avería (desplegable oficial) + texto (opcional salvo «Otros»). Un cierre KO **crea automáticamente una avería pendiente de revisar** (leve propuesta) + email a admins.
2. **Averías**: el operario **propone** severidad (crítica/leve) — reportar NUNCA bloquea la máquina; el **admin decide** en `/alertas` (confirmar crítica = bloquear). Resolución con seguimiento cronológico (`averia_pasos`) y documentos (`averia_documentos`, Storage).
3. **Preparación**: obligatoria en sinterizadoras tras cada cierre; badge "Lista para producir / Necesita preparación".
4. **Mantenimiento**: checklist de acciones del catálogo por sub-familia + einas numeradas; puede vincularse a un plan de revisión (resetea su contador vía trigger).

---

## Estructura de base de datos (tablas reales)

```
profiles              — trabajadores + rol + activo + puede_operar
maquinas              — codigo, etiqueta, nombre, tipo, subtipo, numero_serie,
                        estado_actual, requiere_preparacion, requiere_lanzamiento, activa
usos_equipo           — fecha, hora_preparacion/acabado, tecnico_preparacion/lanzamiento/acabado,
                        tipo_proceso, resultado (pendiente/ok/ko), observaciones
incidencias           — uso_id, tipo (categoría oficial), descripcion
maquina_estados       — historial de estados; en averías: severidad, severidad_confirmada_por_admin,
                        cerrada_en/por, resolucion, tecnico/fecha_intervencion
mantenimientos        — maquina, tecnico, tipo, descripcion (acciones serializadas), plan_id
mantenimiento_planes  — planes de revisión (cada N días/semanas/meses/usos)
preparaciones         — fecha, hora, trabajador, observaciones
alertas               — notificaciones internas
averia_documentos     — adjuntos de averías (Storage)
averia_pasos          — seguimiento cronológico de una avería
```

RLS activado; el panel usa la anon key con políticas públicas específicas; las operaciones sensibles van por RPCs SECURITY DEFINER (`report_maquina_averia`, `confirmar_severidad_averia`, …).

**Migraciones** (`supabase/migrations/`, 0001-0027): se aplican **a mano en el SQL Editor** del proyecto (`jcvandpyyrhbklmbysjw`) — el proyecto Supabase NO está en la cuenta CLI. Los enums nuevos y su backfill van en ejecuciones separadas (limitación de Postgres).

---

## Estructura de carpetas

```
src/
├── components/
│   ├── ui/          # icons.tsx, EtiquetaTag, Modal, Sidebar, TopBar, Badge, ThemeToggle, TrabajadorAvatar…
│   ├── maquinas/    # MaquinaWorkCard, NuevoUso/CerrarUso, mantenimientos, averías (historial/resolver/documentos)
│   └── panel/       # SeleccionTipoTrabajo, StartMantenimiento, StartPreparacion
├── pages/           # Panel, Dashboard, Maquinas, Trabajadores, Alertas, Auditoria, Informes, Login, TvPanel
├── hooks/           # useElapsedTime, useAlertasRealtime, useNotifications
├── lib/             # supabase, utils (todayLocalDate/toLocalDateString/toIsoDateTime), capacitor, pdfExport, averiaDocumentos
├── store/           # workflowStore, trabajadoresStore, authStore, themeStore
├── types/database.ts
└── constants/       # estados.ts (catálogos), mantenimiento.ts (acciones + plantillas)
scripts/build-apk-tv.sh · android/ (Capacitor) · builds/ (APKs, gitignored)
```

---

## Convenciones de código

- Componentes PascalCase; hooks con prefijo `use`; sin `any`.
- UI siempre en **español**; variables/funciones internas en inglés.
- **Fechas: NUNCA `new Date().toISOString().slice(0,10)`** (es UTC; de madrugada es "ayer") → usar `todayLocalDate()` / `toLocalDateString()` de `lib/utils`.
- Zustand: seleccionar primitivos/arrays estables, nunca selectores que creen objetos nuevos.
- Realtime para estados de máquina (no polling); optimistic updates con rollback en el store.
- Los ids de catálogos (acciones, tipos) son estables e independientes del idioma de la UI.
- Manejo de errores en toda llamada a Supabase; RLS en tablas nuevas.

## Lo que NO hacer

- No usar librerías de componentes (MUI, Ant) — Tailwind + componentes propios.
- No usar emojis como iconos ni `animate-ping`/glows (ver sección Diseño).
- No hardcodear IDs ni credenciales (`.env`; service role sin prefijo VITE_).
- No inventar campos de BD que no estén en las migraciones sin consultar.
- No tocar el TvPanel para que siga al tema: su paleta oscura fija es deliberada.

---

## Variables de entorno

```env
VITE_SUPABASE_URL=           # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY=      # Anon key (frontend, con RLS)
SUPABASE_SERVICE_ROLE_KEY=   # Solo scripts admin, NUNCA en frontend
```

Sin variables (o vaciándolas: `VITE_SUPABASE_URL= npm run dev`), la app entra en **modo demo**: datos seed en memoria y login de desarrollo (botones Toni/Roser) — útil para probar sin tocar producción.

## Skills

**Dedicada de mundo:** `fresatitan-feature` — `.claude/skills/fresatitan-feature/`. Globales en `~/.claude/skills/` (frontend-design, senior-frontend, react-best-practices, senior-backend, senior-architect, code-reviewer, skill-creator).

---

## Cliente

**FRESATITAN, S.L.** — laboratorio dental CAD-CAM: fresado (zirconio, PMMA, disilicato, CoCr, titanio), sinterizado SLM (Cr-Co con N₂, titanio con Ar), impresión 3D, férulas, Blender. Uso interno; los operarios no son técnicos → mínima fricción. Contactos admin: **Toni y Roser** (reciben los emails de alerta).

### Pendiente de Roser (julio 2026)
- Lista definitiva de fallos de la sinterizadora de titanio (hay provisional del PDF).
- Feedback del rediseño; decidir si las sub-causas de avería de sinterizadoras se muestran aplanadas (actual) o anidadas (literal PDF).

---

## Mundo del universo «Alex 1.0»

Este proyecto es un **mundo** del universo (motor en `../CLAUDE.md`).

### Cadencia — Fase 2 (revisión previa)
Producto de cliente **en producción**. Implementar features y fixes con autonomía, pero **pedir confirmación explícita antes de cualquier push a `main`** (= deploy automático a Vercel) **o cambio en Supabase** (migraciones las ejecuta Alex en el SQL Editor).

### Git
Repo `fresatitan/Fresatitan-OPS`. Identidad **por repo** en la cuenta `fresatitan` (el git global es personal/Sekees). Antes de push, `gh auth switch --user fresatitan` si hiciera falta.
