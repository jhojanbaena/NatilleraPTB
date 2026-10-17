# Sistema de Gestión Integral de Natillera 2.0

Proyecto modular full-stack para la administración completa de una **Natillera** (Fondo comunitario de ahorro y crédito), estructurado en **Backend** (FastAPI) y **Frontend** (React + Vite).

---

## 🏗️ Estructura del Repositorio

```text
natillera_2.0/
├── backend/                  # API REST con FastAPI, SQLAlchemy 2.0, Pydantic v2 y PostgreSQL
│   ├── app/                  # Código fuente de la aplicación Python
│   ├── .env                  # Configuración y variables de entorno del backend
│   ├── requirements.txt      # Dependencias de Python
│   ├── seed.py               # Script para poblar la base de datos con información inicial
│   └── README.md             # Guía detallada del backend
├── frontend/                 # Interfaz de Usuario con React, Vite y Tailwind CSS
│   ├── src/                  # Componentes, vistas, router y cliente API HTTP
│   ├── package.json          # Dependencias y scripts de Node.js
│   ├── vite.config.js        # Configuración de Vite y proxy /api
│   └── README.md             # Guía detallada del frontend
├── .gitignore                # Reglas globales de exclusión para Git
└── README.md                 # Documentación general del repositorio
```

---

## 🚀 Guía de Inicio Rápido

### 1. Servidor Backend (FastAPI)

```bash
cd backend

# Crear y activar entorno virtual (opcional si ya existe .venv)
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
# source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar backend/.env a partir de .env.example con los datos de PostgreSQL
# y crear previamente la base de datos natillera_db en PostgreSQL.

# Migrar los datos del archivo SQLite existente (solo una vez, destino vacío):
python migrate_sqlite_to_postgres.py

# Poblar base de datos inicial (opcional)
# Solo para una base nueva y vacía; si migraste los datos, omite este paso.
python seed.py

# Iniciar servidor backend
uvicorn app.main:app --reload --port 8000
```

El backend estará disponible en `http://localhost:8000` y la documentación Swagger en `http://localhost:8000/docs`.

### 2. Cliente Frontend (React + Vite)

En otra terminal:

```bash
cd frontend

# Instalar dependencias de Node
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

---

## ☁️ Despliegue en producción con Cloudflare Pages

Cloudflare Pages puede alojar el frontend estático de React/Vite. El backend de este proyecto usa FastAPI y Python, por lo que debe desplegarse por separado en un servicio compatible con Python (o migrarse a Cloudflare Workers); Pages no ejecuta directamente `uvicorn`. La base de datos también debe ser un servicio persistente accesible desde ese backend.

### 1. Preparar y desplegar el backend

Despliega la carpeta `backend` en un proveedor que ejecute aplicaciones Python. Configura el comando de inicio para escuchar en el puerto proporcionado por el proveedor, por ejemplo:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

En Windows local, `$PORT` no aplica; usa el puerto que indique el proveedor o su comando de inicio recomendado. Configura estas variables de entorno en el proveedor del backend:

| Variable | Valor recomendado |
| --- | --- |
| `SECRET_KEY` | Secreto aleatorio y privado de al menos 32 caracteres. No reutilices el valor de desarrollo. |
| `DEBUG` | `False` |
| `DATABASE_URL` | URL de una base de datos PostgreSQL persistente. |
| `BACKEND_CORS_ORIGINS` | Origen(es) exacto(s) del sitio Pages, separados por coma. Ejemplo: `https://mi-natillera.pages.dev` |
| `API_V1_STR` | `/api/v1` |

La aplicación solo admite PostgreSQL. El archivo SQLite existente se conserva como respaldo y como origen opcional del script de migración; no incluyas secretos en el repositorio ni en variables del frontend.

### 2. Crear el proyecto de Cloudflare Pages

1. Sube el repositorio a GitHub y, en el panel de Cloudflare, ve a **Workers & Pages → Create application → Pages → Connect to Git**.
2. Selecciona el repositorio y configura:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. En **Environment variables**, agrega `VITE_API_URL` con la URL pública de la API y el prefijo `/api/v1`. Por ejemplo:

   ```text
   https://api.mi-dominio.com/api/v1
   ```

   Esta variable se incorpora al compilar el frontend: después de cambiarla, vuelve a desplegar el proyecto.
4. Guarda la configuración y despliega. Pages instalará las dependencias y publicará el contenido de `frontend/dist`.

### Si estás desplegando como Worker (no como Pages)

La pantalla de configuración con **Deploy command: `npx wrangler deploy`** corresponde a un Worker. Ya que el directorio raíz está en `frontend`, el archivo `frontend/wrangler.jsonc` configura Wrangler para publicar `./dist`, que Vite genera con `npm run build`, y redirige las rutas de la aplicación React al `index.html`.

En los ajustes del Worker, conserva:

- **Root directory**: `frontend`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

Confirma que `wrangler.jsonc` esté incluido en el repositorio y que el último despliegue ejecute ambos comandos sin errores. Si el proyecto es Pages, en cambio, configura **Build output directory** como `dist`; Pages no usa el comando de despliegue de Wrangler.

### Si aparece `Expected a JavaScript-or-Wasm module script` con MIME `text/jsx`

Ese mensaje significa que el navegador está recibiendo un archivo JSX sin compilar, normalmente porque Pages está publicando `frontend` (el código fuente) en lugar de la salida de Vite. En **Settings → Builds & deployments → Build configurations**, deja estos valores:

| Ajuste | Valor |
| --- | --- |
| **Root directory (advanced)** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

La carpeta raíz se define relativa al repositorio. Como Pages ya entra a `frontend`, el directorio de salida es `dist`, no `frontend/dist`. Guarda los cambios y usa **Retry deployment** para generar una nueva compilación; si sigue publicándose la versión anterior, crea un despliegue nuevo después de confirmar que el último build terminó correctamente.

Para comprobarlo, abre el registro del build de Pages: debe ejecutar `npm run build` y Vite debe completar la generación de `dist`. En el navegador, la página debe cargar JavaScript desde una ruta compilada como `/assets/index-<hash>.js`; si la pestaña **Network** muestra una solicitud a `/src/main.jsx` con respuesta `text/jsx`, la configuración de build o el directorio publicado todavía es incorrecto. No se corrige cambiando el MIME type manualmente.

### 3. Conectar dominio y validar

Si conectas un dominio propio, añádelo en **Custom domains** de Pages. Actualiza `BACKEND_CORS_ORIGINS` en el backend para incluir exactamente el origen del sitio, por ejemplo `https://natillera.mi-dominio.com` (sin ruta ni barra final), y vuelve a desplegar o reiniciar el backend.

Comprueba que:

- `https://<tu-api>/` responde con el estado de la API.
- `https://<tu-api>/docs` muestra Swagger; desactiva o restringe esta documentación si tu política de producción lo requiere.
- El login y las rutas internas funcionan desde el dominio de Pages.
- El backend utiliza PostgreSQL persistente y HTTPS.

No ejecutes `python seed.py` en producción: agrega datos de demostración y crea el usuario inicial con una contraseña conocida. Configura una contraseña de administrador única y segura antes de habilitar el sistema.




## 🚀 Desplegar el backend FastAPI en Vercel

Vercel puede ejecutar este backend como una función Python. No necesita un comando `uvicorn` ni un archivo `api/index.py`: al seleccionar `backend` como directorio raíz, Vercel detecta la aplicación FastAPI `app` definida en `app/main.py` e instala las dependencias de `requirements.txt`.

### 1. Importar el backend

1. Sube el repositorio a GitHub y crea un proyecto en [Vercel](https://vercel.com/new) importando ese repositorio.
2. En la configuración del proyecto, establece **Root Directory** en `backend`.
3. Deja que Vercel detecte la configuración de Python y despliega. No agregues un comando de inicio de servidor; Vercel servirá la función.

### 2. Configurar las variables de entorno

En **Project Settings → Environment Variables**, crea estas variables para **Production** (y también para Preview si vas a probar despliegues de vista previa):

| Variable | Valor |
| --- | --- |
| `SECRET_KEY` | Secreto aleatorio, privado y de al menos 32 caracteres. |
| `DEBUG` | `False` |
| `DATABASE_URL` | URL de una base PostgreSQL persistente, accesible desde Vercel. |
| `BACKEND_CORS_ORIGINS` | Orígenes exactos permitidos, separados por coma. Por ejemplo: `https://mi-natillera.pages.dev,https://natillera.mi-dominio.com` |
| `API_V1_STR` | `/api/v1` |

Guarda las variables y vuelve a desplegar para que apliquen. Usa el formato de conexión SQLAlchemy que corresponda al proveedor de PostgreSQL. Si el proveedor ofrece un pooler/conexiones agrupadas, prefiérelo para evitar agotar conexiones en un entorno serverless.

No uses la base SQLite incluida en el repositorio: las funciones de Vercel no comparten un archivo local persistente. No publiques secretos en Git ni los incluyas en `VITE_API_URL`. Tampoco ejecutes `python seed.py` en producción; crea datos de demostración y una cuenta con contraseña conocida.

### 3. Conectar el frontend y validar

Cuando el despliegue termine, copia el dominio asignado a la API, por ejemplo `https://natillera-api.vercel.app`. En las variables de entorno del proyecto Cloudflare Pages, configura `VITE_API_URL` con ese dominio más el prefijo de la API:

```text
https://natillera-api.vercel.app/api/v1
```

Vuelve a desplegar Pages después de modificar `VITE_API_URL`. Confirma que `https://natillera-api.vercel.app/` responde con el estado de la API, que `/docs` carga Swagger y que puedes iniciar sesión desde el dominio del frontend. Si usas un dominio propio o cambias el dominio de Pages, actualiza `BACKEND_CORS_ORIGINS` en Vercel y vuelve a desplegar el backend.

Para más detalles sobre la detección y el despliegue de FastAPI, consulta la [guía oficial de Vercel](https://vercel.com/docs/frameworks/backend/fastapi).
