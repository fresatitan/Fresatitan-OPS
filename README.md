# FRESATITAN OPS

Sistema interno de control operativo del laboratorio dental **FRESATITAN, S.L.** — especializado en CAD-CAM (fresado, sinterizado e impresión 3D de prótesis dentales).

La plataforma monitoriza las máquinas del taller en tiempo real, registra cada uso de equipo por técnico y genera el histórico que el cliente llevaba hasta ahora manualmente en hojas Excel.

## Arquitectura

Aplicación con dos experiencias diferenciadas sobre el mismo backend:

- **Panel de Planta** (`/panel`, **público, sin login**) — interfaz táctil para las tablets del taller. Los técnicos tocan una máquina, eligen quién prepara/lanza/cierra el trabajo, y la app registra el uso en tiempo real. Cero fricción, sin cuentas, sin contraseñas.
- **Dashboard Admin** (`/`, **protegido por Supabase Auth**) — panel para la gerencia (Toni y Roser) con KPIs, estado de planta en vivo, gestión de máquinas y trabajadores, histórico de usos e incidencias.

### Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Estado cliente**: Zustand
- **Backend + DB**: Supabase (Auth + PostgreSQL con RLS + Realtime)
- **Routing**: React Router v7
- **Formularios**: React Hook Form + Zod
- **Deploy**: Vercel (subdominio `ops.fresatitan.com`)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Rellenar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY desde
# Supabase Dashboard → Project Settings → API

# 3. Arrancar en desarrollo
npm run dev
```

Ver [docs/setup-supabase-auth.md](docs/setup-supabase-auth.md) para la configuración completa de Supabase (migraciones, creación de usuarios admin, RLS).

## Scripts

- `npm run dev` — servidor de desarrollo Vite
- `npm run build` — build de producción (`dist/`)
- `npm run preview` — sirve el build localmente para verificar
- `npm run lint` — ESLint

## Estructura

```
src/
├── components/         # Componentes reutilizables (ui, auth, maquinas)
├── pages/              # Rutas principales (Dashboard, Panel, Login, etc.)
├── store/              # Zustand stores (auth, workflow, trabajadores)
├── lib/                # Cliente Supabase, helpers
├── hooks/              # Custom hooks (useElapsedTime...)
├── types/              # Tipos TypeScript compartidos
└── constants/          # Mapas de estados, roles

supabase/
└── migrations/         # Schema versionado (ejecutar en orden en SQL Editor)
```

## Datos reales del cliente

El sistema controla **12 máquinas reales** de FRESATITAN (7 fresadoras + 5 sinterizadoras) y **8 perfiles reales** (Toni y Roser como admins, Gerard/Pol/Oscar/Albert/Andrea/Rosalia como técnicos). Los datos iniciales están en [supabase/migrations/0002_seed_fresatitan.sql](supabase/migrations/0002_seed_fresatitan.sql).

## Licencia

Software propietario · © FRESATITAN, S.L.
