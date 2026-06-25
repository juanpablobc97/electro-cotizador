# Electro Cotizador — Bernal Instalaciones Eléctricas

App para gestionar clientes, levantamientos, cotizaciones y hojas de servicio.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Edita .env.local con AUTH_SECRET, AUTH_USERNAME y AUTH_PASSWORD
npm run dev:lan
```

Abre http://localhost:3000 e inicia sesión.

En desarrollo, si no configuras credenciales, el acceso por defecto es `admin` / `admin`.

## Producción local

```bash
npm run serve
```

## Despliegue en Railway

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/electro-cotizador.git
git push -u origin main
```

### 2. Crear proyecto en Railway

1. Entra a [railway.app](https://railway.app) y crea un proyecto nuevo.
2. **New → GitHub Repo** y selecciona este repositorio.
3. Railway detectará Next.js y usará `railway.json`.

### 3. Volumen persistente (base de datos)

1. En el servicio, ve a **Volumes**.
2. **Add Volume** montado en la ruta `/data`.
3. Asocia el volumen al servicio de la app.

### 4. Variables de entorno

En **Variables** del servicio, agrega:

| Variable | Valor |
|----------|-------|
| `AUTH_SECRET` | Cadena aleatoria larga (mín. 32 caracteres) |
| `AUTH_USERNAME` | Tu usuario |
| `AUTH_PASSWORD` | Tu contraseña |
| `DATABASE_DIR` | `/data` |
| `NODE_ENV` | `production` |

### 5. Dominio público

1. En **Settings → Networking**, genera un dominio `*.up.railway.app`.
2. Abre la URL en el navegador e inicia sesión.

### 6. Migrar datos locales (opcional)

Si ya tienes datos en tu Mac (`data/electro-cotizador.db`):

**Opción A — Fusión automática:** Abre la app en Railway desde la Mac (con datos locales en IndexedDB). La primera sincronización subirá los datos locales al servidor.

**Opción B — Subir archivo:** Copia `data/electro-cotizador.db` al volumen de Railway vía CLI o panel (si está disponible).

### 7. iPad / PWA

1. En Safari del iPad, abre la URL de Railway (`https://tu-app.up.railway.app`).
2. Inicia sesión con usuario y contraseña.
3. **Compartir → Agregar a pantalla de inicio** para instalar la PWA.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev:lan` | Desarrollo accesible en red local |
| `npm run build` | Compilar para producción |
| `npm run start` | Servidor de producción (usa `$PORT`) |
| `npm run serve` | Build + servidor con auto-reinicio |
