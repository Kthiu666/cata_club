# Auditoría: identidad del sistema de diseño en el panel de gestión

Fuente de verdad: `design/cata-club-design-system.pdf`. Auditoría realizada 2026-07-14, cubre **todas las vistas** del sistema (no solo `/login`).

## Resumen ejecutivo

La paleta de marca (`cata-red #D92128`, `cata-yellow #FFD600`, `cata-amber #F4B41A`, `cata-black #111111`, `cata-fuchsia #E5397D`) ya está correcta en `tailwind.config.ts` — eso no hay que tocarlo. El gap real es que **todo el panel de gestión sigue en tema oscuro** (`body` `#0A0A12`, cards `#141420`, texto blanco), mientras el PDF (sección 05) pide un **panel claro**: fondo `#F9FAFB`, superficies blancas, texto `#1F2937`, negro solo en el chrome/nav, rojo solo en acciones.

Faltan tokens: `bg #F9FAFB`, `surface #FFFFFF`, `text #1F2937`, `border #E5E7EB`, `state-ok #15803D`.

No existe librería de componentes UI (`src/components/ui/`); todo pasa por clases utilitarias compartidas en `globals.css` (`.card`, `.btn-primary/-secondary/-ghost`, `.input-field`, `.badge-*`) — buena noticia: son el punto de mayor apalancamiento, migrarlas cambia todas las vistas a la vez.

## Inventario completo de vistas

| Vista | Archivo | Líneas | Patrón actual | Trabajo específico |
|---|---|---|---|---|
| Login | `src/app/login/page.tsx` | 301 | `.card`/`.input-field`/`.btn-primary`, `cata-dark-elevated` | Chips de rol demo usan `blue-900`/`emerald-900`/`amber-900`/`violet-900` — colores fuera de familia, hay que remapear a la paleta de marca o a grises neutros |
| Registro | `src/app/register/page.tsx` | 490 | mismas clases compartidas + `cata-red` | Banner de error `border-red-500/30 bg-red-900/20` (mismo patrón que login) |
| Recuperar contraseña | `src/app/forgot-password/page.tsx` | 10 | stub, solo `text-white`/`text-white/65` heredado del shell | Trivial — se arregla solo al migrar el shell base (Fase 0) |
| Dashboard | `src/app/dashboard/page.tsx` | 242 | banda hero `bg-cata-navy`, 13 usos de `cata-red`, `cata-dark-elevated` | Hero band + stat cards |
| Socios | `src/app/members/page.tsx` | 468 | `cata-navy`, `cata-dark-surface`, 9 usos `cata-red` | Tabla + tarjetas de socio |
| Grupos | `src/app/groups/page.tsx` | 625 | `cata-navy`, `cata-dark-surface/-elevated`, 13+ usos `cata-red` | Además `groups-page-utils.ts`: badges de nivel ya usan patrón claro (`bg-green-50 text-green-700`, etc.) — solo hay que alinear el verde/ámbar/rojo a los tokens de marca, no cambiar de modo. Barras de capacidad (`bg-red-500/amber-500/emerald-500`) son agnósticas al tema, no tocar. |
| Pagos | `src/app/payments/page.tsx` | 754 | el archivo más grande, 20+ usos `cata-red`, `cata-dark-surface/-elevated` | Vista más pesada — acá se define el patrón definitivo de tabla + badges de estado (pagado/pendiente/vencido) que después se reutiliza en el resto |
| Asistencia | `src/app/attendance/page.tsx` | 369 | `cata-navy`, `cata-dark-surface/-elevated`, 12 usos `cata-red` | Comparte patrón de tabla con Pagos |
| Panel entrenador | `src/app/trainer/page.tsx` | 393 | `cata-navy`, `cata-dark-surface`, 14+ usos `cata-red` | Mismo patrón que dashboard/members, rol distinto |
| Asistencia entrenador | `src/app/trainer/attendance/page.tsx` | 624 | `cata-navy`, `cata-dark-surface/-elevated`, 14+ usos `cata-red` | Reusa patrón de Asistencia |
| Portal alumno | `src/app/student/page.tsx` | 964 | `cata-navy`, 30+ usos `cata-red` | Vista más grande del sistema |
| Pre-inscripción | `src/app/student/enroll/page.tsx` | 1034 | `cata-navy`, 35+ usos `cata-red` | La vista más grande y con más ocurrencias — dejarla para el final, cuando el patrón ya esté validado en vistas chicas |
| Productos (legacy) | `src/app/products/page.tsx` | 11 | solo `redirect("/payments")`, sin UI | No requiere trabajo |
| Landing | `src/app/landing/*` | — | ya migrada a v4 vibrante | Fuera de esta auditoría, sirve de referencia del patrón de tokens de 3 capas |

Nota transversal: en **ninguna** vista hay valores hex sueltos — todo pasa por clases `cata-*` centralizadas o por `.card`/`.btn-primary`/`.input-field`/`.badge-*`. Esto significa que el color en sí no requiere tocar 13 archivos; lo que sí requiere tocar cada archivo es el **modo** (oscuro → claro): bandas hero `bg-cata-navy` y superficies `cata-dark-surface`/`cata-dark-elevated`.

## Plan por fases

- [ ] **Fase 0 — Fundamentos** (`tailwind.config.ts`, `globals.css`, `layout.tsx`)
  Agregar tokens `bg`/`surface`/`text`/`border`/`state-ok`. Reescribir `.card`, `.btn-primary/-secondary/-ghost`, `.input-field`, `.badge-*` para superficie clara. Cambiar `body` de `bg-cata-dark text-white` a `bg-bg text-text`. Esta fase no toca ninguna vista puntual pero cambia el resultado visual de las 13 a la vez.

- [ ] **Fase 1 — Autenticación** (`login`, `register`, `forgot-password`)
  Punto de entrada del sistema, superficie chica (~800 líneas en total), ideal para validar los tokens nuevos de punta a punta antes de escalar. Incluye remapear los chips de rol demo del login a colores de marca.

- [ ] **Fase 2 — Núcleo operativo** (`dashboard`, `members`, `groups`)
  Vistas de uso diario del admin. Define el patrón de hero band clara + card clara que se reutiliza después. Incluye alinear los badges de nivel de `groups-page-utils.ts`.

- [ ] **Fase 3 — Pagos y asistencia** (`payments`, `attendance`)
  `payments` es el archivo más grande y el que fija el patrón definitivo de tabla + badges de estado (pagado/pendiente/vencido) según la sección 06 del PDF (accesibilidad — nunca solo color).

- [ ] **Fase 4 — Vistas de entrenador** (`trainer`, `trainer/attendance`)
  Mismos patrones que fases 2-3, ya validados, aplicados al rol de entrenador.

- [ ] **Fase 5 — Portal de alumno** (`student`, `student/enroll`)
  Las dos vistas más grandes del sistema (964 y 1034 líneas). Se dejan para el final a propósito: para cuando lleguen, el patrón claro ya está probado en vistas chicas y el riesgo de la migración más grande es menor.

- [ ] **Fase 6 — QA transversal**
  Contraste (amarillo solo con texto negro, fucsia nunca en texto chico), estados distinguibles por texto además de color, revisión visual en mobile/tablet/desktop. `forgot-password` y `products` no requieren trabajo propio, solo confirmar que heredan bien el shell de Fase 0.
