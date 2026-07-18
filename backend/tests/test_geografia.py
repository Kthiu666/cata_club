"""
Tests del CRUD de geografía (Pais, Provincia, Canton).

Cubre:
  - Crear país (admin) -> 201.
  - Listar países no requiere rol específico -> 200.
  - Crear provincia con pais_id válido (admin) -> 201.
  - Listar provincias con filtro `pais_id` -> solo las de ese país.
  - Crear cantón con provincia_id válido (admin) -> 201.
  - Listar cantones con filtro `provincia_id` -> solo los de esa provincia.
  - Crear provincia/cantón sin rol ADMINISTRADOR -> 403.
  - Crear provincia con pais_id inexistente -> 404.
  - Obtener país por id inexistente -> 404.
"""


def test_crear_y_listar_paises(client):
    resp = client.post("/api/v1/geografia/paises", json={"nombre": "Ecuador"})
    assert resp.status_code == 201, resp.text
    assert resp.json()["nombre"] == "Ecuador"
    pais_id = resp.json()["id"]

    resp2 = client.post("/api/v1/geografia/paises", json={"nombre": "Perú"})
    assert resp2.status_code == 201
    assert resp2.json()["id"] != pais_id

    listar = client.get("/api/v1/geografia/paises")
    assert listar.status_code == 200
    nombres = [p["nombre"] for p in listar.json()]
    assert "Ecuador" in nombres
    assert "Perú" in nombres

    # Obtener por id:
    resp3 = client.get(f"/api/v1/geografia/paises/{pais_id}")
    assert resp3.status_code == 200
    assert resp3.json()["nombre"] == "Ecuador"


def test_obtener_pais_inexistente_da_404(client):
    resp = client.get("/api/v1/geografia/paises/9999")
    assert resp.status_code == 404


def test_crear_provincia_y_filtro_por_pais(client):
    pais = client.post("/api/v1/geografia/paises", json={"nombre": "Ecuador"}).json()
    otro_pais = client.post("/api/v1/geografia/paises", json={"nombre": "Colombia"}).json()

    resp = client.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "Pichincha", "pais_id": pais["id"]},
    )
    assert resp.status_code == 201, resp.text
    pid = resp.json()["id"]

    # Provincia de Colombia para verificar que el filtro excluye:
    client.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "Cundinamarca", "pais_id": otro_pais["id"]},
    )

    # Filtro por pais_id=Ecuador -> solo Pichincha:
    filtradas = client.get(f"/api/v1/geografia/provincias?pais_id={pais['id']}")
    assert filtradas.status_code == 200
    nombres = [p["nombre"] for p in filtradas.json()]
    assert "Pichincha" in nombres
    assert "Cundinamarca" not in nombres

    # Sin filtro -> todas:
    todas = client.get("/api/v1/geografia/provincias")
    assert todas.status_code == 200
    assert len(todas.json()) >= 2

    # Obtener por id:
    obt = client.get(f"/api/v1/geografia/provincias/{pid}")
    assert obt.status_code == 200
    assert obt.json()["nombre"] == "Pichincha"


def test_crear_provincia_con_pais_inexistente_da_404(client):
    resp = client.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "X", "pais_id": 9999},
    )
    assert resp.status_code == 404


def test_crear_canton_y_filtro_por_provincia(client):
    pais = client.post("/api/v1/geografia/paises", json={"nombre": "Ecuador"}).json()
    prov = client.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "Pichincha", "pais_id": pais["id"]},
    ).json()
    otra_prov = client.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "Guayas", "pais_id": pais["id"]},
    ).json()

    resp = client.post(
        "/api/v1/geografia/cantones",
        json={"nombre": "Quito", "provincia_id": prov["id"]},
    )
    assert resp.status_code == 201, resp.text
    cid = resp.json()["id"]

    # Cantón de Guayas para verificar exclusión en el filtro:
    client.post(
        "/api/v1/geografia/cantones",
        json={"nombre": "Guayaquil", "provincia_id": otra_prov["id"]},
    )

    filtrados = client.get(f"/api/v1/geografia/cantones?provincia_id={prov['id']}")
    assert filtrados.status_code == 200
    nombres = [c["nombre"] for c in filtrados.json()]
    assert "Quito" in nombres
    assert "Guayaquil" not in nombres

    # Obtener por id:
    obt = client.get(f"/api/v1/geografia/cantones/{cid}")
    assert obt.status_code == 200
    assert obt.json()["nombre"] == "Quito"


def test_crear_canton_con_provincia_inexistente_da_404(client):
    resp = client.post(
        "/api/v1/geografia/cantones",
        json={"nombre": "X", "provincia_id": 9999},
    )
    assert resp.status_code == 404


def test_crear_provincia_sin_rol_admin_da_403(client_sin_permisos):
    """El POST exige rol ADMINISTRADOR -> el conftest client_sin_permisos
    tiene rol ALUMNO y debe recibir 403."""
    # Necesitamos un país; lo creamos también como no-admin: también 403,
    # pero el test es sobre provincia; creamos el país directamente vía API
    # admin no es posible aquí, así que verificamos el 403 directo de provincia:
    resp = client_sin_permisos.post(
        "/api/v1/geografia/provincias",
        json={"nombre": "X", "pais_id": 1},
    )
    assert resp.status_code == 403


def test_crear_canton_sin_rol_admin_da_403(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/geografia/cantones",
        json={"nombre": "X", "provincia_id": 1},
    )
    assert resp.status_code == 403


def test_crear_pais_sin_rol_admin_da_403(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/geografia/paises",
        json={"nombre": "X"},
    )
    assert resp.status_code == 403


def test_listar_paises_no_requiere_rol_admin(client_sin_permisos):
    """GET es de lectura general; no requiere rol ADMINISTRADOR."""
    resp = client_sin_permisos.get("/api/v1/geografia/paises")
    assert resp.status_code == 200
