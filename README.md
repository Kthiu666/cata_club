# Product Admin Backend
Backend del **Sistema Integral de Administración para Cata Club**, desarrollado en Python utilizando una arquitectura por capas.
## Tecnologías utilizadas
- Python 3.13
- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic Settings
- PyJWT
- Passlib
- uv
---
# Requisitos
Antes de comenzar, verificar la instalación de:
- Python 3.13 o superior
- Git
- uv
Comprobar versiones:
```bash
python3 --version
git --version
uv --version
```
---
# Instalación
Clonar el repositorio:
```bash
git clone git@github.com:Kthiu666/product-admin-backend.git
```
Ingresar al proyecto:
```bash
cd product-admin-backend
```
Instalar las dependencias:
```bash
uv sync
```
Este comando crea automáticamente el entorno virtual (`.venv`) e instala todas las dependencias definidas en `pyproject.toml`.
---
# Variables de entorno
Crear un archivo `.env` tomando como referencia el archivo `.env.example`.
Ejemplo:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cataclub
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
SECRET_KEY=cataclub_secret_key
```
> El archivo `.env` contiene información sensible y **no debe subirse al repositorio**.
---
# Gestión de dependencias
Este proyecto utiliza **uv** como gestor de dependencias.
Instalar todas las dependencias:
```bash
uv sync
```
Agregar una nueva dependencia:
```bash
uv add nombre_paquete
```
Actualizar dependencias:
```bash
uv lock
uv sync
```
No utilizar:
```bash
pip install
```
ni
```bash
pip install -r requirements.txt
```
---
# Estructura del proyecto
```
product-admin-backend/
│
├── app/
│   ├── dominio/
│   │   ├── __init__.py
│   │   ├── entrenamiento.py
│   │   ├── enums.py
│   │   ├── membresia.py
│   │   ├── persona.py
│   │   ├── salud.py
│   │   ├── ubicacion.py
│   │   └── usuario.py
│   │
│   ├── infraestructura/
│   │   ├── alembic/
│   │   ├── db.py
│   │   └── repositorios/
│   │       ├── persona_repositorio.py
│   │       ├── asistencia_repositorio.py
│   │       ├── membresia_repositorio.py
│   │       └── ficha_medica_repositorio.py
│   │
│   ├── presentacion/
│   │   ├── dependencias.py
│   │   ├── routers/
│   │   │   ├── personas_router.py
│   │   │   ├── asistencias_router.py
│   │   │   ├── membresias_pagos_router.py
│   │   │   ├── ficha_medica_routher.py
│   │   │   └── auth_routher.py
│   │   └── schemas/
│   │       ├── persona_schemas.py
│   │       ├── asistencias_schemas.py
│   │       ├── membresia_pago_schemas.py
│   │       └── geografia_schemas.py
│   │
│   ├── seguridad/
│   │   └── gestor_auth.py
│   │
│   ├── servicios_negocio/
│   │   ├── gestor_permisos.py
│   │   ├── persona_service.py
│   │   ├── asistencia_service.py
│   │   ├── membresia_service.py
│   │   └── ficha_medica_service.py
│   │
│   └── soporte_transversal/
│       ├── config.py
│       └── logger.py
│
├── .env.example
├── main.py
├── alembic.ini
├── pyproject.toml
├── uv.lock
└── README.md
```
---
# Arquitectura por capas
El proyecto sigue el principio de **Arquitectura Limpia**, donde cada capa solo puede comunicarse con la inmediatamente inferior, evitando que capas externas (como Presentación) conozcan detalles de infraestructura (como SQLAlchemy).
Flujo de una petición:
```
Router (Presentación)
   ↓
Service (Servicios de Negocio)
   ↓
Repositorio (Infraestructura)
   ↓
Modelo ORM (Dominio)
```
- **`presentacion/routers/`**: define los endpoints HTTP, recibe y valida los DTOs de entrada y devuelve los DTOs de respuesta. No contiene lógica de negocio ni accede a la base de datos directamente.
- **`presentacion/schemas/`**: DTOs de entrada/salida definidos con Pydantic v2.
- **`presentacion/dependencias.py`**: centraliza la inyección de dependencias (arma cada `Service` con su `Repositorio` correspondiente) para que los routers no lo hagan manualmente.
- **`servicios_negocio/`**: contiene las reglas de negocio de cada entidad (validaciones, cambios de estado, restricciones), independientes de FastAPI y de SQLAlchemy.
- **`seguridad/`**: manejo de JWT (creación/decodificación de tokens) y hashing de contraseñas.
- **`infraestructura/repositorios/`**: encapsula el acceso a datos (`db.add`, `db.commit`, `db.query`, `db.get`). Es la única capa que conoce SQLAlchemy.
- **`dominio/`**: modelos ORM y reglas propias del dominio (enums, entidades).
---
# Autenticación y permisos
- La autenticación se maneja mediante **JWT** (`app/seguridad/gestor_auth.py`), generando un token de acceso en `POST /api/v1/auth/login`.
- El control de acceso por rol se implementa mediante la dependencia parametrizable `GestorPermisos` (`app/servicios_negocio/gestor_permisos.py`), utilizada así en los routers:
```python
dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))]
```
- Roles soportados: `ADMINISTRADOR`, `ENTRENADOR`, `ALUMNO`.
---
# Módulos de API REST implementados
| Router | Prefijo | Descripción |
|---|---|---|
| `personas_router.py` | `/api/v1/personas` | CRUD de personas, relación reflexiva representante–representados |
| `asistencias_router.py` | `/api/v1/asistencias` | Horarios de entrenamiento y registro de asistencia |
| `membresias_pagos_router.py` | `/api/v1/membresias` | Tipos de membresía, membresías, pagos y comprobantes de pago |
| `ficha_medica_routher.py` | `/api/v1/fichas-medicas` | Ficha médica y enfermedades asociadas a una persona |
| `auth_routher.py` | `/api/v1/auth` | Login y emisión de token JWT |
La documentación interactiva (Swagger) se genera automáticamente por FastAPI en `/docs`.
---
# Estado actual del proyecto
## Implementado
- Configuración inicial del proyecto.
- Gestión de dependencias mediante **uv**.
- Configuración centralizada mediante **Pydantic Settings**.
- Sistema de logging centralizado.
- Variables de entorno mediante archivos `.env`.
- Capa de **Servicios de Negocio** con las reglas de validación de cada entidad (Persona, Asistencia, Membresía/Pago, Ficha Médica).
- Capa de Dominio completamente modularizada (app/dominio/), incluyendo modelos ORM para Ubicación, Usuario/Roles, Persona/Institución, Membresías/Pagos, Entrenamiento/Asistencia y Salud.
- Configuración de Infraestructura de Base de Datos (app/infraestructura/db.py) y motor de migraciones con Alembic.
- API REST completa (capa de Presentación): routers, DTOs y documentación Swagger automática.
- Autenticación mediante JWT y hashing de contraseñas con Passlib.
- Sistema de permisos por rol (`GestorPermisos`).
- Refactorización de los routers para eliminar el acceso directo a la base de datos, respetando la Arquitectura Limpia.
## Pendiente
- Pruebas unitarias y de integración.
- Documentación de despliegue.
- Integración final con el frontend (Next.js).
---
# Convenciones del equipo
- Utilizar **uv** para administrar las dependencias.
- No subir el archivo `.env`.
- No subir la carpeta `.venv`.
- Mantener actualizado este README.
- Utilizar mensajes de commit siguiendo Conventional Commits (`feat`, `fix`, `docs`, `refactor`, etc.).
- Respetar el flujo de capas: los routers nunca acceden a la base de datos directamente; siempre pasan por un `Service`, y este por un `Repositorio`.