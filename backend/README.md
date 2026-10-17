# Sistema de Gestión Integral de Natillera — Backend API

Backend robusto, modular y escalable para la administración completa de una **Natillera** (Fondo comunitario de ahorro y crédito), desarrollado con **FastAPI**, **SQLAlchemy 2.0**, **Pydantic v2**, **PostgreSQL** y seguridad basada en **JWT** con **Bcrypt**.

---

## 🚀 Arquitectura y Stack Tecnológico

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+) con OpenAPI automático y Swagger UI.
- **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) con tipado estricto `Mapped` y `mapped_column`.
- **Validación y DTOs**: [Pydantic v2](https://docs.pydantic.dev/) con `ConfigDict(from_attributes=True)`.
- **Seguridad**: JSON Web Tokens (`python-jose` HS256) y cifrado de contraseñas con `bcrypt`.
- **Manejo Financiero Exacto**: Uso de `Numeric(12, 2)` / `Decimal` en todos los valores monetarios para evitar distorsiones de redondeo de punto flotante.
- **Base de Datos**: PostgreSQL, configurada mediante `DATABASE_URL` en `.env`.

---

## 📁 Estructura del Backend

```text
backend/
├── .env                              # Variables de entorno activas
├── .env.example                      # Plantilla de configuración PostgreSQL
├── requirements.txt                  # Dependencias de Python
├── migrate_sqlite_to_postgres.py     # Migración de datos desde la base SQLite anterior
├── seed.py                           # Semillero de datos iniciales
└── app/
    ├── __init__.py
    ├── main.py                       # Punto de entrada FastAPI, CORS y ciclo de vida
    ├── core/                         # Núcleo de la aplicación (config, database, security, deps)
    ├── models/                       # Modelos ORM Relacionales (SQLAlchemy)
    ├── schemas/                      # DTOs y Esquemas de validación (Pydantic v2)
    ├── services/                     # Servicios de negocio y agregaciones complejas
    └── routers/                      # Controladores RESTful (/auth, /socios, /prestamos, etc.)
```

---

## ⚙️ Instalación y Puesta en Marcha

### 1. Acceder al directorio del backend
```bash
cd backend
```

### 2. Crear y activar el entorno virtual
En Windows:
```powershell
python -m venv .venv
.venv\Scripts\activate
```
En Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Crear y configurar la base de datos

Crea la base de datos vacía `natillera_db` en PostgreSQL, copia `.env.example` a `.env` y configura `DATABASE_URL` con las credenciales de tu servidor. En Windows, desde `backend`, puedes copiar la plantilla con `Copy-Item .env.example .env`. La aplicación ya no admite SQLite ni MySQL.

### 5. Migrar los datos SQLite existentes (si aplica)

Si necesitas conservar los datos del archivo `natillera.db`, migra antes de iniciar el backend. El destino debe estar vacío:

```bash
python migrate_sqlite_to_postgres.py
```

El script verifica las tablas y columnas, copia los registros respetando las relaciones, reajusta las secuencias y conserva el archivo SQLite original como respaldo. No ejecutes `seed.py` si ya migraste datos.

### 6. Semillero de Datos (Opcional)
Para inicializar la base de datos con datos de prueba (usuario admin `admin / 12345678`, socios, préstamos, etc.):
```bash
python seed.py
```

### 7. Iniciar el servidor de desarrollo
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
La aplicación estará disponible en `http://localhost:8000`.

---

## 📖 Documentación Interactiva (Swagger / OpenAPI)

Una vez iniciado el servidor:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
