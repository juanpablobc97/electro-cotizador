# Guía rápida: Railway + GitHub

Sigue estos pasos para publicar la app en internet.

## Paso 1 — Subir a GitHub

1. Crea un repositorio vacío en https://github.com/new (sin README ni .gitignore).
2. En la terminal, desde la carpeta del proyecto:

```bash
git remote add origin https://github.com/TU_USUARIO/electro-cotizador.git
git branch -M main
git push -u origin main
```

> Si tu rama actual es `cursor/offline-first-pwa-sync-fixes`, puedes renombrarla a `main` antes del push.

## Paso 2 — Crear proyecto en Railway

1. Entra a https://railway.app y conecta tu cuenta de GitHub.
2. **New Project → Deploy from GitHub repo** → selecciona `electro-cotizador`.
3. Railway detectará Next.js automáticamente.

## Paso 3 — Volumen persistente (IMPORTANTE)

Sin esto, los datos se pierden en cada deploy.

1. En el **lienzo del proyecto** (vista con las cajas del servicio), crea el volumen:
   - `Cmd+K` (Mac) o `Ctrl+K` (Windows) → busca **New Volume**, o
   - clic derecho en espacio vacío del lienzo → **New Volume**
2. Conecta el volumen al servicio de la app.
3. **Mount Path:** `/data`

## Paso 4 — Variables de entorno

En **Variables** del servicio, agrega:

```
AUTH_SECRET=genera-una-cadena-aleatoria-de-al-menos-32-caracteres
AUTH_USERNAME=tu_usuario
AUTH_PASSWORD=tu_contraseña_segura
DATABASE_DIR=/data
RAILWAY_RUN_UID=0
NODE_ENV=production
```

`RAILWAY_RUN_UID=0` evita que el deploy falle al escribir en el volumen (permisos en `/data`).

Para generar AUTH_SECRET en Mac:
```bash
openssl rand -hex 32
```

## Paso 5 — Dominio público

1. **Settings → Networking → Generate Domain**
2. Obtendrás algo como: `https://electro-cotizador-production.up.railway.app`
3. Abre esa URL e inicia sesión.

## Paso 6 — Migrar datos locales (opcional)

Si ya tienes clientes en tu Mac:

**Opción A (recomendada):** Abre la app en Railway desde Safari en la Mac (con datos locales en IndexedDB). La primera sincronización subirá todo automáticamente.

**Opción B:** Si tienes el archivo `data/electro-cotizador.db` en tu Mac, puedes subirlo al volumen `/data` de Railway usando Railway CLI:

```bash
npm i -g @railway/cli
railway login
railway link
railway run -- ls /data
# Copiar el archivo .db al volumen según documentación de Railway
```

## Paso 7 — Configurar iPad

1. En Safari del iPad, abre la URL de Railway (ej. `https://tu-app.up.railway.app`).
2. Inicia sesión con usuario y contraseña.
3. **Compartir → Agregar a pantalla de inicio** para instalar la PWA.
4. Borra el acceso directo viejo que apuntaba a la IP local.

## Verificación post-deploy

- [ ] Login con usuario/contraseña funciona
- [ ] Crear un cliente nuevo se guarda
- [ ] Indicador de sync muestra "Sincronizado" (verde)
- [ ] iPad ve los mismos clientes que la Mac
- [ ] PDF de cotización se genera correctamente

## Costo estimado

Railway: ~5 USD/mes de crédito incluido. Esta app consume poco (1 servicio + 1 volumen pequeño).
