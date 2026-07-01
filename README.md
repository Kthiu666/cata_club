# Cata Club Admin

**Frontend admin shell** para la gestión del club de tenis de mesa — seguimiento de membresías, validación de pagos (CU012), horarios y asistencia.

> **Estado actual:** Demo frontend con datos mock locales. Incluye pantallas complementarias de autenticación (Inicio de Sesión, Registro, Recuperación de Contraseña) como demostraciones de IU. Listo para la integración con la API del backend.

## Inicio Rápido

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). La aplicación funciona en **modo demo** — no requiere backend.

## Modo Demo

Por defecto, la aplicación sirve todos los datos desde mocks locales en memoria:

- Las llamadas a la API utilizan Route Handlers en `src/app/api/`
- Los datos compartidos se siembran en `src/services/mockStore.ts` y se reinician al reiniciar el servidor; los datos embebidos en componentes cliente (entrenador, estudiante) se reinician al recargar la página
- Una insignia **Demo** aparece en el encabezado
- No se necesita archivo `.env.local`

Para conectar un backend real, cree `.env.local` a partir de la plantilla:

```bash
cp .env.local.example .env.local
```

Luego establezca `NEXT_PUBLIC_USE_MOCKS=false` y apunte `NEXT_PUBLIC_API_URL` a su backend.

## Stack Tecnológico

| Capa | Elección |
|------|----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS 3 |
| Iconos | lucide-react |
| Testing | Vitest |
| Linting | ESLint (next/core-web-vitals) |
| Gestor de paquetes | pnpm |

## Estructura del Repositorio

```
.
├── public/                  # Archivos estáticos y recursos de marca de Cata Club
├── src/
│   ├── app/                 # Páginas de Next.js App Router + rutas API mock
│   │   ├── api/payments/    # Endpoints mock de validación de pagos (CU012)
│   │   ├── api/products/    # Endpoints mock legacy de productos
│   │   ├── dashboard/       # Panel de administración general
│   │   ├── forgot-password/ # IU de recuperación de contraseña (placeholder demo)
│   │   ├── login/           # IU de autenticación (placeholder demo)
│   │   ├── register/        # IU de registro (placeholder demo)
│   │   ├── payments/        # Cola de validación de pagos y detalle (CU012)
│   │   ├── products/        # Redirige a /payments (legacy)
│   │   ├── trainer/         # Panel del entrenador — sesiones, lista, asistencia, alertas de salud (demo)
│   │   └── student/         # Portal del estudiante — membresía, pagos, horario (demo)
│   ├── components/          # Componentes reutilizables (Header)
│   ├── controllers/         # Documentación/contratos para controllers
│   └── services/            # Cliente API, store mock y tests
├── .env.local.example       # Plantilla de configuración de entorno
└── package.json
```

## CU012 — Flujo de Validación de Pagos

El módulo **Membresías y Pagos** implementa el caso de uso CU012 ("Validar o rechazar comprobante de pago"):

1. **Vista de cola** — lista todas las solicitudes de comprobantes de pago con filtros (Todas / Pendientes / Aprobadas / Rechazadas)
2. **Panel de detalle** — muestra el estado de la membresía, información del pago y vista previa del comprobante
3. **Aprobar** — marca el pago como válido; la membresía pasa a activa
4. **Rechazar** — requiere un motivo; la membresía vuelve a estado pendiente de pago

El flujo es completamente funcional en modo demo. El store mock valida las transiciones: solo las solicitudes pendientes pueden ser aprobadas o rechazadas.

## Pantallas de Demostración por Rol

### Panel del Entrenador (`/trainer`)

Vista demo para el rol de Entrenador. Todos los datos son locales y se reinician al reiniciar el servidor:

- **Sesiones del día** — tarjetas expandibles que muestran grupo, horario, cancha y nivel
- **Lista con estados de asistencia** — cada estudiante marcado como Presente / Ausente / Tardanza / Justificado
- **Alertas de salud y seguridad** — notas médicas de alto nivel (demo, respetando privacidad)
- **Barra de horario semanal** — vistazo rápido a la semana de entrenamiento

### Portal del Estudiante (`/student`)

Vista demo para el rol de Alumno:

- **Tarjeta de membresía** — tipo, período, fechas, cuota y estado actual
- **Tarjeta de pago** — método, fecha, estado del comprobante y carga de comprobante (demo)
- **Próximas sesiones** — próximas fechas de entrenamiento con grupo y cancha

Ambas pantallas muestran una insignia "Demo" y un pie de página de transparencia indicando que no se almacenan datos reales.

## Contratos de API

### Pagos de Membresía (CU012)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/payments` | GET | Listar todas las solicitudes de validación de pago |
| `/api/payments/:id` | PUT | Aprobar o rechazar una solicitud |

**Aprobar:** `{ "action": "approved" }`
**Rechazar:** `{ "action": "rejected", "rejectionReason": "..." }`

El cliente API (`src/services/api.ts`) cambia automáticamente entre los manejadores mock y el backend real según `NEXT_PUBLIC_USE_MOCKS`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Iniciar servidor de desarrollo |
| `pnpm build` | Compilar para producción |
| `pnpm start` | Iniciar servidor de producción |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm type-check` | Verificación de tipos TypeScript |
| `pnpm test` | Ejecutar pruebas Vitest |
| `pnpm test:watch` | Pruebas en modo watch |

## Hoja de Ruta

- [x] Demo frontend con datos mock
- [x] Cola de validación de pagos y detalle (CU012)
- [x] Panel del entrenador — sesiones, lista, asistencia, alertas de salud (demo)
- [x] Portal del estudiante — membresía, pagos, horario (demo)
- [x] Diseño responsivo con navegación móvil
- [ ] Servicio backend API (Python / FastAPI)
- [ ] Autenticación y sesiones de usuario
- [ ] CRUD real de gestión de membresías
- [ ] Horario de entrenamiento y registro de asistencia
- [ ] Despliegue full-stack en Hetzner VPS
