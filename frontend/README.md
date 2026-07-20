# Cata Club Admin

**Frontend admin shell** para la gestión del club de tenis de mesa — seguimiento de membresías, validación de pagos (CU012), horarios y asistencia.

> **Estado actual:** Demo frontend con datos mock locales, autenticación simulada y control de acceso basado en roles (RBAC) del lado del cliente. Incluye pantallas complementarias (Registro, Recuperación de Contraseña) como demostraciones de IU. Listo para la integración con la API del backend.

## Inicio Rápido

```bash
pnpm install
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000). La aplicación funciona en **modo demo** — no requiere backend.

## Modo Demo

Por defecto, la aplicación funciona completamente en modo demo — no requiere backend:

- **API mock**: Las llamadas a la API utilizan Route Handlers en `src/app/api/`
- **Mock store**: Los datos compartidos se siembran en `src/services/mockStore.ts` y se reinician al reiniciar el servidor; los datos embebidos en componentes cliente (entrenador, cuenta) se reinician al recargar la página
- **Autenticación mock**: El inicio de sesión utiliza cuentas de demostración predefinidas (`src/services/auth.ts`). La sesión se persiste en `localStorage`
- **RBAC cliente**: Las páginas protegidas redirigen al login si el usuario no está autenticado o no tiene el rol adecuado
- Una insignia **Demo** aparece en el encabezado
- No se necesita archivo `.env.local`

Para conectar un backend real, cree `.env.local` a partir de la plantilla:

```bash
cp .env.local.example .env.local
```

Luego establezca `NEXT_PUBLIC_USE_MOCKS=false` y apunte `NEXT_PUBLIC_API_URL` a su backend.

## Autenticación Mock y RBAC

La aplicación incluye un sistema de autenticación simulado del lado del cliente (sin backend):

### Cuentas de Demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@cataclub.com` | `admin123` |
| Entrenador | `entrenador@cataclub.com` | `trainer123` |
| Responsable de pago (representante) | `representante@cataclub.com` | `rep123` |
| Responsable de pago (autogestionado) | `autogestionado@cataclub.com` | `self123` |

### Páginas Protegidas por Rol

| Ruta | Rol Requerido | Descripción |
|------|---------------|-------------|
| `/dashboard` | admin | Panel de administración |
| `/payments` | admin | Validación de pagos (CU012) |
| `/trainer` | trainer | Panel del entrenador |
| `/student` | responsable_pago | Portal de cuenta |

Las páginas públicas (`/`, `/login`, `/register`, `/forgot-password`) son accesibles sin autenticación.

### Navegación Adaptativa

El menú de navegación (`Header`) se adapta al rol activo:
- **Sin sesión**: solo muestra Inicio e Iniciar Sesión
- **Administrador**: Administración y Membresías y Pagos
- **Entrenador**: Panel del Entrenador
- **Responsable de pago**: Mi Cuenta

### ⚠️ Limitaciones del RBAC Cliente

El control de acceso se implementa del lado del cliente (`ProtectedRoute`). Esto previene el acceso casual pero no es seguro contra manipulaciones intencionales. Para producción, debe reemplazarse con:

1. **Next.js Middleware** — validación de sesión en el servidor antes de servir la página
2. **Backend session validation** — verificación de token JWT en cada llamada API

### Cómo Funciona

1. El usuario ingresa credenciales en `/login`
2. `MockAuthService` busca la cuenta en `DEMO_PERSONAS` (hardcoded)
3. Si coincide, crea un `AuthSession` y lo persiste en `localStorage`
4. `AuthContext` hidrata la sesión desde `localStorage` al cargar la página
5. `ProtectedRoute` verifica el rol antes de renderizar contenido protegido
6. `Header` muestra navegación según el rol activo

Archivos clave:
- `src/types/domain.ts` — tipos del dominio (Usuario, Rol, ResponsablePago, etc.)
- `src/services/auth.ts` — servicio de autenticación mock + personas demo
- `src/contexts/AuthContext.tsx` — contexto React para el estado de sesión
- `src/components/ProtectedRoute.tsx` — guardia de ruta por rol
- `src/lib/auth-utils.ts` — funciones puras de autorización

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
│   │   ├── dashboard/       # Panel de administración general (protegido: admin)
│   │   ├── forgot-password/ # IU de recuperación de contraseña (placeholder demo)
│   │   ├── login/           # Autenticación mock con cuentas demo
│   │   ├── register/        # IU de registro (placeholder demo)
│   │   ├── payments/        # Cola de validación de pagos y detalle (CU012, protegido: admin)
│   │   ├── products/        # Redirige a /payments (legacy)
│   │   ├── trainer/         # Panel del entrenador (protegido: trainer)
│   │   └── student/         # Portal de cuenta (protegido: responsable_pago)
│   ├── components/          # Componentes reutilizables
│   │   ├── Header.tsx       # Navegación adaptativa por rol
│   │   └── ProtectedRoute.tsx # Guardia de ruta RBAC cliente
│   ├── contexts/            # Contextos React
│   │   └── AuthContext.tsx  # Estado de sesión y autenticación
│   ├── controllers/         # Documentación/contratos para controllers
│   ├── lib/                 # Utilidades puras
│   │   ├── auth-utils.ts    # Funciones de autorización (canAccess, getDefaultRoute)
│   │   └── __tests__/       # Tests de utilidades de auth
│   ├── services/            # Cliente API, autenticación mock y store mock
│   │   ├── auth.ts          # MockAuthService + personas demo
│   │   ├── api.ts           # Cliente HTTP
│   │   ├── mockStore.ts     # Store mock en memoria
│   │   └── __tests__/       # Tests de servicios
│   └── types/               # Tipos compartidos
│       └── domain.ts        # Tipos del dominio Cata Club
├── .env.local.example       # Plantilla de configuración de entorno
└── package.json
```

## Modelo de Dominio: Corrección de Conceptos

### Cuenta / Titular / Responsable de Pago vs. Alumno

A partir de julio 2026, el modelo de dominio separa explícitamente al **titular de la cuenta** (quien paga y gestiona) del **alumno** (quien entrena). Esta corrección responde a casos reales del club:

#### Motivación

- **Caso 1 — Representante con múltiples hijos:** Un padre/madre (representante) puede pagar y gestionar las membresías de varios hijos que entrenan en el club. Cada hijo es un `Alumno` distinto asociado al mismo `ResponsablePago`.
- **Caso 2 — Alumno adulto autogestionado:** Un estudiante mayor de edad puede ser su propio responsable de pago. No necesita un representante externo. La misma persona es el `ResponsablePago` (tipo `autogestionado`) y el `Alumno`.

#### Cambios en el modelo

| Concepto anterior (incorrecto) | Concepto actual (correcto) |
|-------------------------------|---------------------------|
| `UserRole: "student"` | `UserRole: "responsable_pago"` — el login identifica a un titular de cuenta |
| `UserRole: "representative"` | (eliminado — fusionado en `responsable_pago`) |
| `Alumno.representanteId` | `Alumno.responsablePagoId` — el responsable de pago asociado |
| `Representante` como único tipo de cuenta | `ResponsablePago.tipo: "representante" \| "autogestionado"` |

El tipo `Representante` se mantiene como interfaz para compatibilidad con datos mock existentes, pero el tipo principal es `ResponsablePago` con su campo `tipo`.

#### Implicaciones en la UI

- El antiguo "Portal del Estudiante" ahora es el **Portal de Cuenta** (`/student`).
- Un responsable de pago tipo **representante** ve un selector de alumnos y puede gestionar las membresías de todos sus hijos.
- Un responsable de pago tipo **autogestionado** ve solo su propia información (comportamiento de un solo alumno).
- Payments (`/payments`) ahora referencia a `responsablePagoName` — el nombre del responsable de pago que realizó el pago.

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

### Portal de Cuenta (`/student`)

Vista demo para el rol de Responsable de Pago:

- **Selector de alumno** (solo para representantes multi-alumno): permite elegir qué alumno gestionar
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
- [x] Panel del entrenador — sesiones, lista, asistencia (demo)
- [x] Portal de cuenta — membresía, pagos, horario (demo)
- [x] Diseño responsivo con navegación móvil
- [x] Tipos de dominio compartidos (Usuario, Rol, ResponsablePago, Membresía, Pago, Horario, Asistencia)
- [x] Autenticación mock con personas demo y sesión en localStorage
- [x] RBAC cliente — páginas protegidas por rol, navegación adaptativa
- [x] Corrección de dominio: separación Cuenta/Titular/ResponsablePago vs. Alumno
- [ ] Servicio backend API (Python / FastAPI)
- [ ] Autenticación real con JWT y Next.js Middleware
- [ ] CRUD real de gestión de membresías
- [ ] Horario de entrenamiento y registro de asistencia
- [ ] Despliegue full-stack en Hetzner VPS
