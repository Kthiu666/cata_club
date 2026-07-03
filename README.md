# Product Admin Backend

Backend del **Sistema Integral de Administración para Cata Club**, desarrollado en Python utilizando una arquitectura por capas.

## Tecnologías utilizadas

- Python 3.13
- Pyramid 2
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic Settings
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
│   ├── infraestructura/
│   ├── presentacion/
│   ├── seguridad/
│   ├── servicios_negocio/
│   └── soporte_transversal/
│       ├── config.py
│       └── logger.py
│
├── .env.example
├── alembic.ini
├── pyproject.toml
├── uv.lock
└── README.md
```

---

# Estado actual del proyecto

## Implementado

- Configuración inicial del proyecto.
- Gestión de dependencias mediante **uv**.
- Configuración centralizada mediante **Pydantic Settings**.
- Sistema de logging centralizado.
- Variables de entorno mediante archivos `.env`.

## Pendiente

- Configuración de PostgreSQL.
- SQLAlchemy.
- Alembic.
- Modelos ORM.
- API REST.

---

# Convenciones del equipo

- Utilizar **uv** para administrar las dependencias.
- No subir el archivo `.env`.
- No subir la carpeta `.venv`.
- Mantener actualizado este README.
- Utilizar mensajes de commit siguiendo Conventional Commits (`feat`, `fix`, `docs`, `refactor`, etc.).