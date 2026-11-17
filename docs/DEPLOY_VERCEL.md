# Publicar Mesa en Vercel o Netlify

La mesa queda en una URL fija. La base es Postgres en Neon. Los adjuntos no se guardan en el disco del servidor: en Vercel van a Blob y en Netlify a Blobs. Quien descarga un archivo pasa por `/api/adjuntos` y solo lo recibe si puede ver el requerimiento. Esa ruta responde 401 sin sesión y 404 sin permiso. No entrega la URL del almacén.

`npm run build` genera el cliente de Prisma y compila. No abre la base. En el hosting el comando es `npm run vercel-build`: ejecuta `prisma migrate deploy` y después el build. Ese comando aplica migraciones pendientes. No borra tablas ni carga la demostración.

## 1. Neon

Cree un proyecto en Neon y copie las dos cadenas.

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena del **pooler** (el host lleva `-pooler`). Añada `?sslmode=require&pgbouncer=true` si no vienen. |
| `DIRECT_URL` | Cadena **directa**, sin `-pooler`. Solo la usa `prisma migrate deploy`. |

En la máquina local, para desarrollo, las dos pueden ser la misma URL de PostgreSQL.

## 2. Vercel

1. Importe el repositorio en Vercel. Framework: Next.js.
2. En Settings → Build, deje el comando de build en blanco o póngalo en `npm run vercel-build`. Si existe el script `vercel-build`, Vercel lo usa solo.
3. Node.js 22.
4. Cree un store de Blob en el proyecto y conéctelo. Vercel define `BLOB_READ_WRITE_TOKEN`.
5. Pegue las variables de la lista de abajo.
6. Publique.
7. En la máquina, con `DATABASE_URL` y `DIRECT_URL` apuntando a Neon, ejecute una sola vez:

```bash
npm run seed:inicial
```

Eso crea los catálogos (empresas, tipos, flujos y SLA) y el administrador de `ADMIN_EMAIL` y `ADMIN_PASSWORD`. No carga casos de demostración. `SEED_DEMO` no debe estar en `true`.

El cron está en `vercel.json`. Llama a `GET /api/cron/sla` a las 08:00, hora de Colombia (`0 13 * * *` en UTC). El plan gratuito de Vercel solo admite una ejecución al día. Si el plan permite más, cambie el horario a `0 * * * *`. Vercel envía `Authorization: Bearer` con `CRON_SECRET`. No active `SLA_SCHEDULER`: en Vercel el proceso no se queda vivo y el `setInterval` no arranca.

`output: "standalone"` se usa en Docker y en `npm start`. En Vercel el build lo omite, porque `VERCEL=1`.

## 3. Variables

Obligatorias en Vercel:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Pooler de Neon, con `pgbouncer=true`. |
| `DIRECT_URL` | Conexión directa de Neon. |
| `AUTH_SECRET` | `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | `true`. La sesión usa el host de la petición. |
| `ADMIN_EMAIL` | Correo del primer administrador. |
| `ADMIN_PASSWORD` | Contraseña de 8 o más caracteres, distinta del correo. |
| `CRON_SECRET` | Otro secreto largo. Protege `/api/cron/sla`. |
| `STORAGE_DRIVER` | `vercel-blob`. |
| `BLOB_READ_WRITE_TOKEN` | Lo inyecta el store de Blob. No lo publique. |
| `AUTH_ENTRA_ENABLED` | `false`. |
| `DEV_AUTH_ENABLED` | `false`. |
| `REGISTRO_PUBLICO` | `false`. |

No defina `SEED_DEMO`. No defina `SLA_SCHEDULER`.

Opcionales:

| Variable | Valor |
| --- | --- |
| `APP_URL` | Dominio fijo, por ejemplo `https://mesa.cifes.edu.co`. Si lo omite, los enlaces usan `VERCEL_PROJECT_PRODUCTION_URL` y, si no existe, `VERCEL_URL`. |
| `AUTH_URL` | La misma que `APP_URL`, si la define. Si no, Auth.js confía en el host porque `AUTH_TRUST_HOST=true`. |
| `ALLOWED_ORIGINS` | Solo si hay un host extra. El dominio de producción y `VERCEL_URL` ya entran solos. Admite comodines, separados por coma. |
| `AUTH_ALLOWED_EMAIL_DOMAIN` | Por defecto `cifes.edu.co`. |
| `EMAIL_PROVIDER` | `console` hasta tener SMTP. Luego `smtp` y las variables `SMTP_*`. |
| `EMAIL_FROM` | Remitente. |
| `BUSINESS_WINDOWS` | Por defecto `08:00-12:00,14:00-18:00`. |
| `SLA_RISK_RATIO` | Por defecto `0.75`. |

El dominio fijo se agrega en Vercel → Settings → Domains. No hace falta escribir `VERCEL_URL` a mano: Vercel la define en cada despliegue y la mesa la suma a los orígenes permitidos.

## 4. Adjuntos

`STORAGE_DRIVER` elige el almacén:

| Valor | Dónde guarda | Cuándo |
| --- | --- | --- |
| `local` | Carpeta `UPLOAD_DIR` (por defecto `./uploads`) | Desarrollo, Docker y un servidor propio. |
| `vercel-blob` | Store privado de Vercel Blob | Vercel. |
| `netlify-blobs` | Store `adjuntos` de Netlify Blobs | Netlify. |

El archivo se guarda con un nombre interno. La ficha del caso no muestra ese nombre ni una URL del proveedor. `put` de Vercel Blob se llama con `access: "private"`. La respuesta del SDK puede traer una URL; la mesa la descarta. Leer también pide acceso privado. Netlify Blobs no publica el objeto.

## 5. Netlify

1. Cree un sitio desde el mismo repositorio.
2. Build command: `npm run vercel-build`.
3. El archivo `netlify.toml` deja la función programada `sla` a las 08:00, hora de Colombia. Esa función hace `POST /api/cron/sla` con `CRON_SECRET` contra `URL` (Netlify la define).
4. Variables: las mismas de la tabla, con estos cambios.

| Variable | Valor en Netlify |
| --- | --- |
| `STORAGE_DRIVER` | `netlify-blobs`. |
| `NETLIFY` | Netlify la define como `true`. Con eso no arranca el `setInterval` del SLA. |

No hace falta `BLOB_READ_WRITE_TOKEN`. Netlify inyecta el contexto de Blobs en la función. El store se llama `adjuntos` y no es público.

`URL` es el dominio del sitio. Si además define `APP_URL`, los enlaces de correo usan esa. `DEPLOY_PRIME_URL` entra en los orígenes de las vistas previas.

Después del primer despliegue, ejecute `npm run seed:inicial` contra Neon, igual que en Vercel.

## 6. Comandos

```bash
npm run build
npm run vercel-build
npm run seed:inicial
SEED_DEMO=true npm run seed:reset-demo
```

`seed:inicial` y `prisma db seed` hacen lo mismo: catálogos y administrador. Con `SEED_DEMO=true` borran la base y cargan la demostración. No use esa variante en Neon de producción.

`npm test` sigue usando la base local `requerimientos_test` y define `DIRECT_URL` igual a esa URL.
