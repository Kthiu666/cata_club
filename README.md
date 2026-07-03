# Product Admin Backend

Backend del **Sistema Integral de Administración para Cata Club**, desarrollado en Python utilizando Pyramid y SQLAlchemy.

## Tecnologías

- Python 3.13
- Pyramid 2
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic Settings
- uv

---

# Requisitos

Antes de comenzar asegúrate de tener instalado:

- Python 3.13 o superior
- Git
- uv
- PostgreSQL (próximamente)

Verificar instalación:

```bash
python3 --version
uv --version
git --version
```

---

# Instalación

Clonar el repositorio

```bash
git clone git@github.com:Kthiu666/product-admin-backend.git
```

Entrar al proyecto

```bash
cd product-admin-backend
```

Instalar todas las dependencias

```bash
uv sync
```

Esto creará automáticamente el entorno virtual (`.venv`) e instalará todas las dependencias definidas en `pyproject.toml`.

---

# Variables de entorno

Crear un archivo `.env` utilizando como referencia el archivo `.env.example`.

Ejemplo:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cataclub
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
SECRET_KEY=cataclub_secret_key
```

> **Importante:** El archivo `.env` contiene información sensible y **no debe subirse al repositorio**.

---

# Gestión de dependencias

Este proyecto utiliza **uv** como gestor de dependencias.

Para agregar una nueva dependencia:

```bash
uv add nombre_paquete
```

Para sincronizar dependencias:

```bash
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
│   ├── infraestructura/
│   ├── presentacion/
│   ├── seguridad/
│   ├── servicios_negocio/
│   └── soporte_transversal/
│
├── pyproject.toml
├── uv.lock
├── .env.example
└── README.md
```

---

# Estado actual del proyecto

Actualmente se encuentra implementado:

- Configuración del proyecto mediante **uv**.
- Configuración centralizada utilizando **Pydantic Settings**.
- Gestión de variables de entorno mediante archivos `.env`.
- Estructura inicial del backend.

Pendiente de implementación:

- Sistema de Logging.
- Configuración de PostgreSQL.
- Alembic.
- Modelos ORM.
- API REST.

---

# Convenciones del equipo

- Utilizar **uv** para administrar dependencias.
- No subir el archivo `.env`.
- No subir la carpeta `.venv`.
- Mantener actualizado este README cuando se agreguen nuevas funcionalidades.
- Realizar commits utilizando Conventional Commits (`feat`, `fix`, `docs`, `refactor`, etc.).
