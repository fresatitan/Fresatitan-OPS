# CLAUDE.md — FRESATITAN OPS

## Contexto del proyecto

**FRESATITAN OPS** es una aplicación web para **FRESATITAN, S.L.** — empresa del sector dental especializada en CAD-CAM (fresado, sinterizado e impresión 3D de prótesis dentales). La plataforma controla y monitoriza los procesos del laboratorio dental: estado de las máquinas, registro de trabajos por operario, medición de eficiencia y generación de informes.

La app tiene **dos experiencias diferenciadas**:
- **Panel de Planta** (`/panel`): interfaz táctil para tablets en el laboratorio, donde los trabajadores fichan, seleccionan máquina y registran su trabajo con cronómetro en vivo.
- **Dashboard Admin** (`/`): panel de gestión para el propietario con KPIs, estado de máquinas, gestión de trabajadores y máquinas.

---

## Stack tecnológico

- **Frontend**: React 19 + TypeScript + Vite 8
- **Estilos**: Tailwind CSS v4
- **Backend / DB**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Estado global**: Zustand
- **Formularios**: React Hook Form + Zod
- **Routing**: React Router v6
- **Fechas**: date-fns
- **Exportación**: xlsx (Excel) / jsPDF (PDF)
- **Gráficas**: Recharts
- **Notificaciones**: Supabase Realtime + react-hot-toast
- **Deploy**: Vercel

---

## Diseño: Industrial Premium

Estética oscura, densa y orientada a datos. Referentes: Grafana, Linear, Vercel Dashboard.

- **Fondo**: `#0A0A0A` / `#0F0F0F` (sistema de superficies surface-0 a surface-4)
- **Primario**: `#D09A40` (dorado/ocre — acento dominante de marca)
- **Texto**: `#F0F0F0` (primary), `#888` (secondary), `#555` (tertiary)
- **Tipografía**: DM Mono para datos/métricas, Inter para UI general
- **Bordes sutiles**, sin sombras blandas — estética panel de control
- **Estados de máquina** (colores semánticos saturados sobre oscuro):
  - Activa: `#22C55E` (verde)
  - Parada: `#F59E0B` (ámbar)
  - Avería: `#EF4444` (rojo)
  - Mantenimiento: `#3B82F6` (azul)
  - Inactiva: `#6B7280` (gris)
- **Microanimaciones**: solo en cambios de estado (parpadeo en avería, transición suave al actualizar)
- **Noise overlay** para profundidad
- **Scrollbar custom** minimalista

---

## Roles de usuario

| Rol | Descripción |
|---|---|
| `operario` | Registra inicio/fin de procesos, reporta incidencias en su máquina |
| `supervisor` | Visión de todas las máquinas, valida registros, gestiona alertas |
| `tecnico` | Registra intervenciones de mantenimiento, cambia estado de máquinas |
| `admin` | Acceso total: gestión de usuarios, máquinas, configuración, informes |

Los roles se gestionan con Supabase Auth + tabla `profiles` con campo `role`.

---

## Arquitectura: Dos experiencias

### Panel de Planta (`/panel`) — Tablet

Interfaz tipo kiosk para la tablet de planta. Sin sidebar, botones grandes, táctil.

**Flujo del trabajador:**
1. Se identifica (se recuerda en `localStorage`)
2. Ve el **panel de planta** con todas las máquinas: disponibles, en uso (quién y qué), avería, inactivas
3. KPIs rápidos: disponibles, en uso, avería, inactivas
4. Toca una máquina disponible → elige **Procesos** o **Mantenimiento**
5. Rellena datos mínimos (tipo, referencia, turno / tipo mant., descripción)
6. **Cronómetro circular grande** en vivo con datos del trabajo
7. Finaliza → introduce piezas → card generada para el admin
8. Vuelve al panel de planta

### Dashboard Admin (`/`) — Desktop

Panel de gestión con sidebar completa.

**Secciones:**
- **Dashboard** (`/`): KPIs (activas, averías, mantenimiento, procesos activos), grid de máquinas con estado + último trabajador + tiempos, barra de distribución de estados, últimos trabajos completados
- **Máquinas** (`/maquinas`): grid filtrable por estado, crear/editar máquinas, dropdowns de Procesos/Mantenimiento por máquina, vista Actividad con cards de trabajos completados
- **Trabajadores** (`/trabajadores`): tabla con nombre, apellidos, rol, estado activo/inactivo, crear/editar/eliminar, filtro por rol, KPIs por rol
- **Panel Planta** (`/panel`): acceso admin al panel de planta
- **Alertas** (`/alertas`): pendiente
- **Informes** (`/informes`): pendiente

---

## Módulos implementados

### 1. Control de estado de máquinas
- Estados: `activa`, `parada`, `avería`, `mantenimiento`, `inactiva`
- Cambio automático de estado al iniciar/finalizar procesos o mantenimiento
- Cards con estado actual, último proceso, trabajador, tiempos inicio/fin
- Badge de estado con colores semánticos y animación de parpadeo en avería

### 2. Registro de procesos / producción
- Tipos: `fresado`, `torneado`, `rectificado`, `taladrado`, `otro`
- Campos: referencia pieza, cantidad, turno (mañana/tarde/noche), observaciones
- Cronómetro en vivo durante el proceso
- Al finalizar: registro de duración y piezas completadas
- Card de trabajo completado con todos los detalles

### 3. Registro de mantenimiento
- Tipos: `preventivo`, `correctivo`, `predictivo`
- Campos: descripción del trabajo
- Cronómetro en vivo durante la intervención
- Card de mantenimiento completado con técnico, tipo, duración

### 4. Gestión de trabajadores
- Alta/edición/eliminación de trabajadores
- Roles: operario, técnico, supervisor, admin
- Toggle activo/inactivo
- Selector de trabajadores en modales (no texto libre)
- Resolución de nombres en todas las cards y barras de trabajo activo

### 5. Gestión de máquinas
- Alta/edición de máquinas (código, nombre, ubicación, descripción)
- Cada máquina tiene dropdown de Procesos y Mantenimiento

### 6. Panel de Planta (Tablet)
- Selección de trabajador con memoria localStorage
- Vista de planta con todas las máquinas y su estado
- Muestra quién está en cada máquina en uso
- Flujo completo: selección → tipo trabajo → datos → cronómetro → finalizar

---

## Estructura de base de datos

```sql
-- Perfiles de usuario
profiles (id, user_id, nombre, apellidos, role, activo, created_at)

-- Máquinas
maquinas (id, codigo, nombre, descripcion, ubicacion, estado_actual, created_at)

-- Historial de estados de máquinas
maquina_estados (id, maquina_id, estado, motivo, usuario_id, timestamp)

-- Procesos de producción
procesos (id, maquina_id, operario_id, tipo_proceso, referencia_pieza, cantidad, turno, inicio, fin, duracion, observaciones, estado)

-- Alertas
alertas (id, maquina_id, tipo, mensaje, leida, destinatario_role, created_at)

-- Intervenciones de mantenimiento
mantenimientos (id, maquina_id, tecnico_id, tipo, descripcion, inicio, fin, duracion, created_at)
```

Row Level Security (RLS) activado en todas las tablas. Políticas por rol.

---

## Estructura de carpetas

```
src/
├── components/
│   ├── ui/              # Badge, Layout, Modal, Sidebar, MobileNav, TopBar, StatCard
│   ├── maquinas/        # MaquinaWorkCard, MaquinaFormModal, CompletedWorkCard, StartProcesoModal, StartMantenimientoModal
│   └── panel/           # PanelActiveWork, PanelStartWork
├── pages/
│   ├── Dashboard.tsx    # KPIs + grid máquinas + últimos trabajos
│   ├── Maquinas.tsx     # Grid filtrable + crear/editar + actividad
│   ├── Trabajadores.tsx # Tabla + CRUD + filtros por rol
│   └── Panel.tsx        # Panel de planta para tablets
├── hooks/
│   └── useElapsedTime.ts # Cronómetro en vivo + formatDuration
├── lib/
│   ├── supabase.ts      # Cliente Supabase tipado
│   └── utils.ts
├── store/
│   ├── workflowStore.ts      # Máquinas, procesos, mantenimientos
│   └── trabajadoresStore.ts  # Trabajadores CRUD
├── types/
│   └── database.ts      # Tipos TS: Maquina, Proceso, Mantenimiento, etc.
└── constants/
    └── estados.ts       # Mapas de estados, roles, turnos
```

---

## Convenciones de código

- Componentes: PascalCase, un componente por archivo
- Hooks: `use` prefix, camelCase
- Tipos: sufijo `Type` o `Interface` solo si hay ambigüedad; preferir tipos explícitos
- Siempre tipar los retornos de funciones async que llamen a Supabase
- No usar `any`; si es necesario, justificarlo con comentario
- Mensajes de error y UI siempre en **español**
- Variables y funciones internas en inglés; labels y textos UI en español
- Zustand: seleccionar datos primitivos o arrays estables, nunca funciones que retornen nuevos objetos (causa bucles infinitos)

---

## Comportamiento esperado de Claude Code

- Generar **código completo y funcional**, nunca fragmentos sin contexto
- Aplicar **RLS policies** siempre que se creen tablas nuevas
- Usar **tipos TypeScript estrictos** derivados del schema de Supabase
- Si hay lógica de negocio compleja (ej. cálculo OEE, solapamiento de procesos), encapsularla en hooks o utils testeables
- Mantener la estética **Industrial Premium** oscura con el dorado `#D09A40` como acento
- No usar otros colores de acento que compitan con el dorado corporativo
- Responsive: la app debe funcionar en tablet (operarios en planta usan tablets)
- Priorizar **Supabase Realtime** para actualizaciones de estado de máquinas en lugar de polling
- El Panel (`/panel`) debe ser **touch-first**: botones grandes, mínima fricción, sin sidebar

---

## Lo que NO hacer

- No usar librerías de componentes pesadas (MUI, Ant Design) — solo Tailwind + componentes propios
- No hardcodear IDs ni credenciales
- No omitir manejo de errores en llamadas a Supabase
- No crear lógica de negocio directamente en componentes; extraer a hooks
- No inventar campos de base de datos que no estén en este documento sin consultarlo primero
- No usar selectores de Zustand que retornen nuevos objetos/arrays (usar datos estables para evitar re-renders infinitos)

---

## Variables de entorno

```env
VITE_SUPABASE_URL=           # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY=      # Anon key (frontend, con RLS)
SUPABASE_SERVICE_ROLE_KEY=   # Solo scripts admin, NUNCA en frontend (sin prefijo VITE_)
```

---

## Skills globales instaladas

Disponibles en `~/.claude/skills/`:
- `frontend-design` — diseño UI production-grade
- `senior-frontend` — patrones React, Next.js, optimización
- `react-best-practices` — 40+ reglas de rendimiento React
- `senior-backend` — API design, seguridad, DB optimization
- `senior-architect` — arquitectura, system design, decisiones técnicas
- `code-reviewer` — code review, security scanning, checklist
- `skill-creator` — crear/mejorar skills + evals

---

## Cliente

**FRESATITAN, S.L.** — empresa del sector dental especializada en CAD-CAM (Computer-Aided Design / Computer-Aided Manufacturing). Servicios: fresado dental (zirconio, PMMA, disilicato, CoCr, titanio), sinterizado (SLM láser), sinterofresado (remecanizado), impresión 3D (modelos, guías quirúrgicas), férulas de descarga, sistema Blender (sobredentadura zirconio + estructura metálica), y otros materiales (PEEK, feldespática, composites, grafeno).

El sistema es de uso interno. Los operarios no son usuarios técnicos, por lo que la UI debe ser clara, directa y con el mínimo de fricción posible.
La app se llama **FRESATITAN OPS**.

### Máquinas del laboratorio (demo, pendiente de datos reales del cliente)

| Código | Tipo |
|---|---|
| FRS-01/02/03 | Fresadoras dentales (5 y 4 ejes) |
| SIN-01 | Sinterizadora láser (SLM) |
| SIN-02 | Horno de sinterizado |
| IMP-01/02 | Impresoras 3D dentales |
| ESC-01 | Escáner de laboratorio |

### Tipos de proceso

`fresado` · `sinterizado` · `sinterofresado` · `impresion3d` · `ferulas` · `blender` · `otro`
