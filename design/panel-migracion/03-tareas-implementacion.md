# Tareas — Migración del panel de gestión al Sistema de Diseño v1

Para: implementación en entorno gentle-ai.
Fuentes de verdad (no negociable — no inventar colores fuera de esta familia):

1. `01-cata-club-design-system.pdf` — paleta, tipografía, reglas de uso y accesibilidad.
2. `02-migracion-panel-pitch.pdf` — diagnóstico, inventario de las 13 vistas y hoja de ruta.
3. Detalle línea por línea de cada vista: `design/admin-design-system-audit.md` (en la raíz de `design/`).

## Enfoque en cada fase

Ninguna fase es "solo cambiar el hex". En cada una se revisan tres ejes:

- **Paleta** — tokens correctos, sin colores nuevos fuera de la familia de marca (regla del PDF #1).
- **Usabilidad** — contraste, legibilidad, estados distinguibles por texto *además* de color, sin patrones ad-hoc duplicados.
- **Bugs conocidos** — la lista de abajo, resueltos en la fase donde corresponde su archivo.

### Bugs conocidos a resolver (ya detectados, con ubicación)

| # | Bug | Dónde | Fase donde se resuelve |
|---|---|---|---|
| B1 | Chips de rol demo en login usan colores sueltos (`blue-900`, `emerald-900`, `amber-900`, `violet-900`) fuera de la familia de marca | `src/app/login/page.tsx:23-27` | Fase 1 |
| B2 | Banner de error duplicado a mano (`border-red-500/30 bg-red-900/20`) en vez de un componente compartido | `src/app/login/page.tsx:221`, `src/app/register/page.tsx:127` | Fase 1 |
| B3 | Badges de nivel de grupo (`bg-green-50`/`amber-50`/`red-50`) ya en modo claro pero no usan los tokens de marca | `src/app/groups/groups-page-utils.ts:59-63` | Fase 2 |
| B4 | Badges de estado (pagado/pendiente/vencido) en verde/ámbar/rojo genéricos, no en `state-ok #15803D` del PDF | `src/app/globals.css:103-129` | Fase 3 |
| B5 | Hover de nav en fucsia sobre blanco da ≈4.03:1 de contraste, por debajo de WCAG AA 4.5 para texto chico (PDF sección 06: "fucsia con texto blanco pasa justo, reservalo para íconos y hover") | `src/app/landing/landing.css:57` | Fase 6 (QA transversal, verificar que el admin no repita el mismo error al adoptar fucsia) |

---

## Fase 0 — Fundamentos
`tailwind.config.ts` · `src/app/globals.css` · `src/app/layout.tsx`

No toca ninguna vista todavía, pero el resultado visual cambia en las 13 a la vez.

- [ ] Agregar tokens `bg #F9FAFB`, `surface #FFFFFF`, `text #1F2937`, `border #E5E7EB`, `state-ok #15803D` a `tailwind.config.ts` (mantener el namespace `cata-*` ya existente, no renombrar a `brand-*`).
- [ ] `layout.tsx`: `body` pasa de `bg-cata-dark text-white` a `bg-bg text-text`.
- [ ] `globals.css`: reescribir `.card`, `.card-hover`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input-field` para superficie clara (blanco, bordes `#E5E7EB`, texto `#1F2937`). El rojo del botón primario no cambia.
- [ ] `globals.css`: reescribir `.badge-success/-warning/-error/-neutral` usando `state-ok` y los tokens claros (resuelve **B4**).
- [ ] Verificar `tsc` limpio y `next build` sin errores antes de pasar a Fase 1.

**Criterio de aceptación:** cualquier vista renderizada hoy mismo (sin tocarla) ya debería verse en modo claro, aunque las bandas hero y superficies oscuras específicas de cada página todavía no se hayan migrado.

## Fase 1 — Autenticación
`login` · `register` · `forgot-password`

- [ ] Migrar `login/page.tsx` y `register/page.tsx` a los tokens claros (heredan la mayoría del cambio de Fase 0, revisar clases sueltas restantes).
- [ ] **B1** — remapear los chips de rol demo del login a colores de la familia de marca (rojo/ámbar/negro/fucsia puntual), no `blue-900`/`violet-900`/etc.
- [ ] **B2** — extraer el banner de error repetido en login y register a una clase compartida (p. ej. `.alert-error` en `globals.css`, reusando el patrón de `.badge-error`).
- [ ] `forgot-password/page.tsx` es un stub de 10 líneas — confirmar que hereda bien del shell de Fase 0, sin cambios propios.

**Criterio de aceptación:** las 3 pantallas de auth se ven en panel claro, ningún color fuera de la paleta del PDF #1.

## Fase 2 — Núcleo operativo
`dashboard` · `members` · `groups`

- [ ] Reemplazar bandas hero `bg-cata-navy` y superficies `cata-dark-surface`/`cata-dark-elevated` por los tokens claros de Fase 0.
- [ ] **B3** — alinear los badges de nivel de `groups-page-utils.ts` a los tokens de marca (mantener las barras de capacidad `bg-red-500/amber-500/emerald-500` tal como están, son agnósticas al tema).

**Criterio de aceptación:** dashboard/members/groups comparten el mismo patrón de hero clara + card clara — este patrón se reutiliza en las fases siguientes.

## Fase 3 — Pagos y asistencia
`payments` · `attendance`

- [ ] Migrar la vista más grande del set (`payments`, 754 líneas) — define el patrón definitivo de tabla + badges de estado.
- [ ] Confirmar que pagado/pendiente/vencido se distinguen por texto además de color (regla de accesibilidad del PDF, sección 06).
- [ ] Aplicar el mismo patrón de tabla a `attendance`.

## Fase 4 — Vistas de entrenador
`trainer` · `trainer/attendance`

- [ ] Aplicar los patrones ya validados en fases 2-3 al rol de entrenador. Sin bugs propios detectados en la auditoría inicial.

## Fase 5 — Portal de alumno
`student` · `student/enroll`

- [ ] Las dos vistas más grandes del sistema (964 y 1034 líneas). Migrar al final, cuando el patrón ya esté probado en vistas chicas.

## Fase 6 — QA transversal

- [ ] Contraste: amarillo siempre con texto negro, rojo siempre con texto blanco, fucsia nunca en texto chico.
- [ ] **B5** — revisar que el admin, al adoptar fucsia en hovers, no repita el contraste insuficiente ya detectado en `landing.css:57`.
- [ ] Estados (pagado/pendiente/vencido/inactivo, nivel de grupo) distinguibles por texto + color, no solo color.
- [ ] Revisión visual en mobile/tablet/desktop de las 13 vistas.
- [ ] `products/page.tsx` no requiere trabajo (solo redirect).

## Opcional / recomendado (no bloqueante)

- [ ] Extraer `Button`, `Card`, `Badge`, `Input` como componentes React reales (hoy no existen — todo pasa por clases utilitarias en `globals.css`). Reduciría la repetición de clases `cata-red`/`cata-navy` en cada página y evita que la próxima actualización de marca vuelva a tocar 13 archivos.
