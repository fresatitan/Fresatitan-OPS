# FRESATITAN OPS — Plataforma de Control y Monitorización para Laboratorio Dental CAD-CAM

---

## Resumen Ejecutivo

**FRESATITAN OPS** es una aplicación web desarrollada a medida para **FRESATITAN, S.L.**, empresa pionera en tecnología dental CAD-CAM. La plataforma digitaliza por completo el control del laboratorio dental: monitoriza en tiempo real el estado de cada máquina (fresadoras, sinterizadoras, impresoras 3D, escáneres), registra la actividad de cada operario, mide la eficiencia productiva y genera informes exportables para la toma de decisiones.

El sistema está diseñado para dos perfiles de usuario radicalmente distintos: los operarios que trabajan en el laboratorio con tablets y el propietario/dirección que supervisa desde escritorio. Cada uno accede a una experiencia optimizada para su contexto de uso.

---

## 1. Contexto de la Empresa

### FRESATITAN, S.L. — CAD-CAM Pioneers

FRESATITAN es una empresa del sector dental especializada en fabricación digital de prótesis dentales mediante tecnología CAD-CAM (Computer-Aided Design / Computer-Aided Manufacturing). Opera con múltiples máquinas de alta precisión en su laboratorio y ofrece los siguientes servicios:

- **Fresado dental**: técnica sustractiva CAM para mecanizar discos o bloques de zirconio, disilicato, CoCr, titanio o PMMA con precisión por debajo de la centésima.
- **Sinterizado (SLM)**: técnica aditiva por láser que funde capas de polvo metálico (titanio, cobalto-cromo) para crear estructuras de geometría compleja.
- **Sinterofresado (remecanizado)**: combinación de fresado en la conexión del implante y sinterizado en el resto de la pieza, uniendo las ventajas de ambas técnicas.
- **Sistema Blender®**: sobredentadura de zirconio integrada sobre estructura metálica, optimizando funcionalidad y estética.
- **Férulas de descarga**: dispositivos removibles en acrílico para prevención de daños dentales y tratamiento de disfunciones mandibulares.
- **Impresión 3D**: fabricación de modelos dentales a partir de escáneos intraorales o modelos digitales, con resinas de alta precisión.
- **Otros materiales**: PMMA, PEEK, disilicatos, cerámicas feldespáticas, composites, grafeno, entre otros.

### Necesidad del Proyecto

Antes de FRESATITAN OPS, el seguimiento de la producción en el laboratorio se realizaba de forma manual o con herramientas genéricas. Esto generaba:

- Falta de visibilidad sobre qué máquinas estaban activas, paradas o en avería.
- Imposibilidad de medir con precisión la productividad de cada operario.
- Dificultad para calcular tiempos reales de cada proceso (fresado, sinterizado, impresión).
- Informes tardíos y poco fiables para la toma de decisiones.
- Pérdida de eficiencia por falta de datos en tiempo real.

---

## 2. Problema que Resuelve

FRESATITAN OPS aborda directamente los siguientes retos operativos:

| Problema | Solución FRESATITAN OPS |
|---|---|
| No se sabe qué operario usó qué máquina | Registro automático de cada sesión de trabajo con identificación del operario |
| No se conoce el tipo de proceso realizado | Cada proceso queda registrado con su tipo (fresado, sinterizado, sinterofresado, impresión 3D, férulas, blender) |
| No se miden los tiempos reales | Temporizador en vivo desde el inicio hasta la finalización del proceso |
| No se mide la eficiencia de las máquinas | Cálculo de tiempo activo vs. tiempo inactivo por máquina |
| No se mide la productividad del operario | Registro de piezas producidas, duración y tipo de trabajo por operario |
| No hay visibilidad en tiempo real | Dashboard en vivo con el estado de todo el laboratorio |
| Los informes son manuales y tardíos | Exportación automática a Excel y PDF con KPIs calculados |

---

## 3. Experiencias de Usuario

FRESATITAN OPS ofrece **dos experiencias completamente diferenciadas**, cada una optimizada para su contexto de uso.

### 3.1. Panel del Operario (Tablet en Laboratorio — Ruta `/panel`)

Esta es la interfaz que los operarios utilizan directamente en el laboratorio, desde tablets.

#### Principios de diseño

- **Cero fricción**: los operarios no son usuarios técnicos. La interfaz debe ser inmediata e intuitiva.
- **Optimizada para táctil**: botones grandes, áreas de toque amplias, sin interacciones complejas.
- **Mínimos pasos**: del inicio al registro del trabajo en el menor número de toques posible.
- **Memoria del trabajador**: el sistema recuerda al último operario (localStorage), evitando identificarse cada vez.

#### Flujo del operario

1. **Identificación**: El operario se identifica al entrar. Su identidad se recuerda automáticamente para futuros usos.

2. **Vista general del laboratorio (Panel de Planta)**: Ve todas las máquinas de un vistazo con KPIs rápidos (disponibles, en uso, avería, inactivas). Cada máquina muestra su estado:
   - **Verde** — Disponible
   - **Ámbar** — Parada
   - **Rojo** — Avería
   - **Azul** — En mantenimiento
   - **Gris** — Inactiva

3. **Máquinas en uso**: Las máquinas ocupadas muestran quién está trabajando en ellas y qué proceso se está realizando.

4. **Inicio de trabajo**: El operario toca una máquina disponible y elige entre:
   - **Procesos**: fresado, sinterizado, sinterofresado, impresión 3D, férulas, sistema Blender, otro material. Introduce referencia de pieza y turno.
   - **Mantenimiento**: preventivo, correctivo o predictivo. Introduce descripción de la intervención.

5. **Temporizador en vivo**: Un cronómetro circular grande muestra el tiempo transcurrido. El estado de la máquina cambia automáticamente a "activa" o "en mantenimiento".

6. **Finalización**: Cuando termina, el operario toca "Finalizar" e introduce el número de piezas producidas (si es un proceso).

7. **Tarjeta de registro**: Se genera automáticamente una tarjeta con todos los datos del trabajo: operario, máquina, tipo de proceso, duración, hora de inicio y fin, y piezas producidas.

### 3.2. Dashboard del Administrador (Escritorio — Ruta `/`)

Interfaz para el propietario y administradores. Diseñada para escritorio con visión completa y en tiempo real.

#### Componentes principales

- **KPIs en tiempo real**: máquinas activas, en avería, en mantenimiento, procesos activos.
- **Tarjetas de máquina**: cada máquina muestra estado actual, último operario, último proceso con tiempos inicio/fin y piezas.
- **Barra de distribución de estados**: visualización de la proporción de máquinas en cada estado.
- **Gestión de trabajadores**: alta, edición, activación/desactivación, asignación de roles.
- **Gestión de máquinas**: alta y edición de máquinas del laboratorio.
- **Panel de Planta**: el admin también puede ver el panel de planta desde su interfaz.
- **Navegación completa**: sidebar con Dashboard, Máquinas, Trabajadores, Panel Planta, Alertas, Informes.

---

## 4. Máquinas del Laboratorio

El laboratorio de FRESATITAN opera con los siguientes tipos de equipos:

| Código | Tipo de máquina | Función |
|---|---|---|
| FRS-01/02/03 | Fresadoras dentales (5 y 4 ejes) | Mecanizado de zirconio, PMMA, disilicato, CoCr, titanio, cera |
| SIN-01 | Sinterizadora láser (SLM) | Sinterizado selectivo por láser de titanio y CoCr |
| SIN-02 | Horno de sinterizado | Sinterizado de zirconio |
| IMP-01/02 | Impresoras 3D dentales | Impresión de modelos, guías quirúrgicas, férulas, provisionales |
| ESC-01 | Escáner de laboratorio | Digitalización de modelos e impresiones |

*Nota: los códigos y modelos exactos se confirmarán con el cliente.*

---

## 5. Servicios y Tipos de Proceso

| Tipo de proceso | Descripción |
|---|---|
| **Fresado** | Técnica sustractiva CAM. Mecanizado de discos/bloques de zirconio, disilicato, CoCr, titanio o PMMA con precisión por debajo de la centésima |
| **Sinterizado** | Técnica aditiva SLM. Fusión de capas de polvo metálico (titanio, CoCr) por láser para crear estructuras complejas |
| **Sinterofresado** | Combinación de fresado (conexión implante) + sinterizado (resto de pieza). Ajuste perfecto + anatomía exacta |
| **Sistema Blender®** | Sobredentadura de zirconio sobre estructura metálica. Optimiza funcionalidad y estética |
| **Férulas** | Dispositivos removibles en acrílico para protección dental y tratamiento de disfunciones mandibulares |
| **Impresión 3D** | Modelos dentales a partir de escáneos intraorales. Resinas de alta precisión para máxima fidelidad |
| **Otro material** | PMMA, PEEK, disilicatos, cerámicas feldespáticas, composites, grafeno y otros |

---

## 6. Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite 8 | Interfaz de usuario tipada, rápida y modular |
| **Estilos** | Tailwind CSS v4 | Diseño utility-first, responsive y consistente |
| **Backend / Base de datos** | Supabase | Autenticación, PostgreSQL, Realtime, almacenamiento |
| **Estado global** | Zustand | Gestión de estado ligera y performante |
| **Formularios** | React Hook Form + Zod | Formularios con validación declarativa y tipada |
| **Enrutamiento** | React Router v6 | Navegación SPA con rutas protegidas por rol |
| **Gráficas** | Recharts | Visualización de datos y KPIs |
| **Exportación** | xlsx + jsPDF | Generación de informes en Excel y PDF |
| **Notificaciones** | Supabase Realtime + react-hot-toast | Alertas en tiempo real con toasts visuales |
| **Deploy** | Vercel | Despliegue continuo en producción |

### Ventajas del stack

- **Supabase** proporciona PostgreSQL completa con autenticación, suscripciones en tiempo real y Row Level Security (RLS) sin backend tradicional.
- **React + TypeScript** garantiza código mantenible con detección temprana de errores.
- **Vite** ofrece tiempos de compilación ultrarrápidos.
- **Tailwind CSS** permite interfaces consistentes sin CSS personalizado.
- **Zustand** es más ligero y simple que Redux, ideal para esta aplicación.

---

## 7. Diseño Visual

### Estética "Industrial Premium"

FRESATITAN OPS adopta un lenguaje visual que transmite precisión, tecnología y profesionalidad, acorde con el sector dental CAD-CAM.

- **Fondo oscuro**: `#0F0F0F` — reduce fatiga visual y aporta aspecto profesional de panel de control.
- **Color de marca (acento)**: `#D09A40` (dorado) — identidad visual de FRESATITAN en botones principales, estados activos y highlights.
- **Tipografía para datos**: DM Mono — fuente monoespaciada para métricas, temporizadores y datos numéricos.
- **Tipografía para interfaz**: Inter — fuente sans-serif limpia y legible.
- **Noise overlay** para profundidad visual.
- **Bordes sutiles** sin sombras blandas — estética de panel de control.

### Colores semánticos para estados de máquina

| Estado | Color | Significado |
|---|---|---|
| Activa | Verde `#22C55E` | La máquina está operando |
| Parada | Ámbar `#F59E0B` | Máquina detenida pero funcional |
| Avería | Rojo `#EF4444` | Requiere atención inmediata (parpadeo animado) |
| Mantenimiento | Azul `#3B82F6` | Intervención en curso |
| Inactiva | Gris `#6B7280` | Fuera de servicio |

### Inspiración de diseño

**Grafana** (dashboards industriales), **Linear** (densidad + elegancia), **Vercel Dashboard** (dark + tipografía limpia). Layout denso y orientado a datos donde la información es protagonista.

### Responsive

Completamente responsive. El panel del operario está optimizado para tablets, dispositivo principal en el laboratorio.

---

## 8. Roles de Usuario

| Rol | Acceso | Funciones |
|---|---|---|
| **Operario** | Panel de planta (`/panel`) | Inicia/finaliza procesos, reporta incidencias |
| **Técnico** | Panel de planta (`/panel`) | Intervenciones de mantenimiento, cambia estado de máquinas |
| **Supervisor** | Dashboard + Panel | Supervisa máquinas y operarios, valida registros, gestiona alertas |
| **Admin** | Acceso total | Gestión de usuarios, máquinas, configuración, informes, todo |

### Seguridad

Todas las tablas protegidas con **Row Level Security (RLS)** de Supabase. Cada rol tiene políticas específicas a nivel de base de datos, independientes del frontend.

---

## 9. Esquema de Base de Datos

| Tabla | Contenido |
|---|---|
| `profiles` | Trabajadores: nombre, apellidos, rol, estado activo/inactivo |
| `maquinas` | Máquinas del laboratorio: código, nombre, descripción, ubicación, estado |
| `maquina_estados` | Historial de cambios de estado con timestamps |
| `procesos` | Cada proceso: máquina, operario, tipo, referencia pieza, cantidad, turno, inicio, fin, duración |
| `alertas` | Alertas automáticas por avería o condición anómala |
| `mantenimientos` | Intervenciones: máquina, técnico, tipo, descripción, inicio, fin, duración |

---

## 10. Flujo de Trabajo Completo

### Perspectiva del operario (tablet)

1. Abre la app en la tablet → se identifica (o el sistema le recuerda)
2. Ve el panel de planta con todas las máquinas y sus estados
3. Toca una máquina disponible
4. Elige: **Procesos** o **Mantenimiento**
5. Rellena datos mínimos (tipo proceso, referencia pieza, turno)
6. El cronómetro arranca — la máquina cambia a "activa"
7. Cuando termina → "Finalizar" → introduce piezas producidas
8. Se genera la tarjeta de registro → vuelve al panel de planta

### Perspectiva del admin (desktop)

1. Abre el Dashboard → ve KPIs actualizados en tiempo real
2. Cada máquina muestra su estado, quién la está usando y qué proceso hace
3. Al finalizar un trabajo, la tarjeta aparece en "Últimos trabajos"
4. Puede consultar Máquinas, Trabajadores, historial de actividad
5. Genera informes exportables a Excel/PDF

---

## 11. Ventajas Competitivas

### Frente a soluciones genéricas (ERP, hojas de cálculo)

| Aspecto | Solución genérica | FRESATITAN OPS |
|---|---|---|
| Adaptación | Requiere configuración compleja | Diseñado para el flujo dental CAD-CAM |
| Experiencia del operario | Interfaces complejas | Interfaz táctil, 3-4 toques |
| Tiempo real | Datos diferidos | Actualización instantánea |
| Coste | Licencias elevadas | Infraestructura mínima |
| Mantenimiento | Dependencia externa | Control total del código |

### Frente a no tener sistema

- **Eliminación del error humano** en registro de tiempos y procesos.
- **Datos objetivos** para decisiones, no estimaciones.
- **Visibilidad instantánea** del laboratorio sin recorrerlo físicamente.
- **Historial completo y auditable** de toda la actividad.
- **Ahorro de tiempo administrativo** en generación de informes.

### Diferenciadores clave

1. **Doble interfaz especializada**: tablet para operarios + dashboard para dirección.
2. **Adaptado al sector dental CAD-CAM**: tipos de proceso específicos (fresado, sinterizado, sinterofresado, blender, férulas, impresión 3D).
3. **Tiempo real nativo**: cambios instantáneos vía Supabase Realtime.
4. **Seguridad a nivel de base de datos**: RLS por rol.
5. **Diseño premium**: estética profesional que transmite confianza.

---

## 12. Retorno de la Inversión (ROI)

### Ahorro de tiempo directo

- **Operarios**: eliminación del registro manual. Ahorro de 5-10 minutos por operario y turno.
- **Administración**: informes automáticos que antes requerían horas. Ahorro de 2-4 horas semanales.
- **Supervisión**: visibilidad inmediata sin recorrer el laboratorio.

### Mejora de eficiencia

- **Reducción de tiempos muertos**: identificación rápida de máquinas paradas sin justificación.
- **Optimización de planificación**: datos históricos fiables para planificar cargas de trabajo.
- **Mantenimiento preventivo**: registro sistemático para anticiparse a averías.

### Estimación conservadora

En un laboratorio con 5-10 máquinas y 5-10 operarios:

- Ahorro administrativo: **+100 horas/año**
- Mejora en tiempo productivo: **3-5%**
- Reducción de averías imprevistas: **10-20%**
- Amortización del desarrollo: **6-12 meses**

---

## 13. Funcionalidades Futuras

- **Autenticación con Supabase Auth**: login + enrutamiento automático por rol.
- **Actualizaciones en tiempo real completas**: Supabase Realtime en todos los módulos.
- **Cálculos de OEE avanzados**: Disponibilidad × Rendimiento × Calidad por máquina.
- **Umbrales de alerta configurables**: alertas automáticas por tiempo de parada excesivo.
- **Informes históricos con gráficas**: tendencias, comparativas, estacionalidad.
- **PWA para tablet**: instalación como app nativa en la tablet del laboratorio.

---

## 14. Conclusión

FRESATITAN OPS transforma la gestión del laboratorio dental de FRESATITAN, S.L. de un proceso manual y opaco a un sistema digital, transparente y en tiempo real. La aplicación registra cada proceso de fresado, sinterizado o impresión 3D, mide la eficiencia de cada máquina y operario, y pone toda esa información al alcance del propietario en un dashboard claro y accionable.

Con una interfaz diseñada para que cualquier operario pueda usarla sin formación en una tablet, y un dashboard que ofrece visibilidad total al equipo de dirección, FRESATITAN OPS une el laboratorio con la oficina en una sola fuente de verdad.

---

*Documento preparado para FRESATITAN, S.L. — Abril 2026*
*App en producción: https://fresatitan-ops.vercel.app*
