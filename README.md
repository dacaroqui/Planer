# Mesa

Mesa interna de requerimientos de CIFES y Luvania. El personal radica pedidos a Desarrollo o a Marketing, sigue el estado y el historial, y conversa dentro del mismo requerimiento. La interfaz está en español de Colombia.

Es un reemplazo ligero de una mesa de servicio: cinco roles, un flujo por equipo, SLA en horas hábiles y correo por un proveedor intercambiable.

## Requisitos

- Node.js 22
- PostgreSQL 16
- npm 10

Docker es opcional y sirve para publicar la aplicación. En esta máquina de desarrollo también puede usar PostgreSQL instalado en el sistema.

## Puesta en marcha

```bash
cp .env.example .env
# Ajuste AUTH_SECRET. El resto de los valores de ejemplo alcanza para el entorno local.

createdb requerimientos 2>/dev/null || true
npm install
npm run db:setup
npm run dev
```

La mesa queda en [http://127.0.0.1:38471](http://127.0.0.1:38471).

`db:setup` aplica las migraciones. Los usuarios ficticios solo se cargan si `SEED_DEMO=true`. En desarrollo, con `DEV_AUTH_ENABLED=true`, la pantalla de ingreso también ofrece esos perfiles sin contraseña. En producción el ingreso es correo y contraseña.

| Correo | Rol |
| --- | --- |
| admin.ejemplo@cifes.edu.co | Administrador |
| helena.ejemplo@cifes.edu.co | Líder de Desarrollo |
| sara.ejemplo@cifes.edu.co | Líder de Marketing |
| valentina.ejemplo@cifes.edu.co | Agente de Desarrollo |
| ana.ejemplo@cifes.edu.co | Solicitante de Académico |
| gerencia.ejemplo@cifes.edu.co | Observador, solo lectura |

También están Julián (solicitante de Luvania), Camila (agente de Marketing), Mateo y Tomás. Ninguno corresponde a una persona real. La semilla trae CIFES y Luvania, cinco proyectos con distinto avance, veinte requerimientos y tareas con subtareas en Planner. Cada arranque de Docker vuelve a cargar esa semilla y reemplaza los datos de demostración. Para dejar de nuevo esa demostración en la base actual: `npm run seed:reset-demo`.

## Pruebas

Hace falta la base `requerimientos_test` en el mismo servidor.

```bash
createdb requerimientos_test 2>/dev/null || true
npm test
```

Cubren radicar, el consecutivo, la transición según el rol, el comentario, la nota interna, aprobar, devolver, el adjunto y el cálculo del SLA con festivos.

## Producción sin Docker

Hace falta un PostgreSQL accesible por `DATABASE_URL`. Detrás de un proxy o un túnel HTTPS, `APP_URL` y `AUTH_URL` deben ser la URL pública, con `https://`. La cookie de sesión sale `Secure` cuando esa URL es https. Auth.js confía en `X-Forwarded-Proto` y en el host (`trustHost`).

```bash
npm ci
npx prisma migrate deploy
npm run build
```

Variables mínimas antes de arrancar:

```bash
export DATABASE_URL=postgresql://usuario:clave@host:5432/requerimientos
export APP_URL=https://mesa.ejemplo.com
export AUTH_URL=https://mesa.ejemplo.com
export AUTH_SECRET=$(openssl rand -base64 32)
export ADMIN_EMAIL=admin@cifes.edu.co
export ADMIN_PASSWORD='una-clave-de-8-o-mas'
export DEV_AUTH_ENABLED=false
export AUTH_ENTRA_ENABLED=false
export SEED_DEMO=false
export REGISTRO_PUBLICO=false
export PORT=3000
```

```bash
npm start
```

Defina `APP_URL`, `AUTH_URL` y, si hace falta, `ALLOWED_ORIGINS` antes de `npm run build`. Next guarda esos hosts en el build y con ellos acepta las server actions cuando el túnel cambia el `Origin` respecto del host interno. `ALLOWED_ORIGINS` es una lista separada por comas y admite comodines, por ejemplo `*.trycloudflare.com`.

`npm start` copia `public` y `.next/static` al paquete standalone y arranca `node .next/standalone/server.js` en `0.0.0.0` y en el puerto `PORT` (3000 si no se define). Al arrancar crea el catálogo y, si `ADMIN_EMAIL` no existe todavía, el administrador inicial. También puede crearlo antes, con la base ya migrada:

```bash
ADMIN_EMAIL=admin@cifes.edu.co ADMIN_PASSWORD='una-clave-de-8-o-mas' npm run create-admin
```

El primer ingreso es ese administrador. En Usuarios genera una invitación, copia el enlace y se lo entrega a la persona. El enlace vence en 7 días y solo sirve una vez. Microsoft 365 queda apagado salvo `AUTH_ENTRA_ENABLED=true`. El registro en `/registro` queda apagado salvo `REGISTRO_PUBLICO=true`.

## Docker

```bash
docker compose up --build
```

Ese comando es la demostración: levanta PostgreSQL y la mesa en [http://127.0.0.1:3000](http://127.0.0.1:3000), aplica las migraciones y, porque Compose define `SEED_DEMO=true`, carga los datos ficticios. También deja `DEV_AUTH_ENABLED=true`. Cada arranque reemplaza esa demostración. El desarrollo con `npm run dev` sigue en el puerto 38471. Para una base limpia no use este Compose: siga «Producción sin Docker» y deje `SEED_DEMO` sin definir.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de PostgreSQL. |
| `APP_URL` y `AUTH_URL` | URL pública, la misma. Los enlaces salen de `APP_URL`. Si empieza por `https://`, la cookie de sesión es `Secure`. |
| `AUTH_SECRET` | Firma de la sesión. Cámbielo fuera de su máquina. |
| `ADMIN_EMAIL` y `ADMIN_PASSWORD` | Crean el primer administrador si ese correo no existe. |
| `AUTH_ENTRA_ENABLED` | `true` activa Microsoft 365. Por defecto queda apagado. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Id de aplicación en Entra ID. Solo si Entra está activo. |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Secreto de esa aplicación. |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Id de directorio. El issuer queda en `https://login.microsoftonline.com/<tenant>/v2.0`. |
| `AUTH_ALLOWED_EMAIL_DOMAIN` | Dominios permitidos, separados por coma. Por defecto `cifes.edu.co`. |
| `DEV_AUTH_ENABLED` | `true` solo en desarrollo. En producción déjelo en `false`. |
| `SEED_DEMO` | `true` borra la base y carga la demostración. |
| `REGISTRO_PUBLICO` | `true` abre `/registro`. Por defecto está apagado. |
| `PORT` | Puerto de `npm start`. Por defecto 3000. |
| `ALLOWED_ORIGINS` | Hosts extra, separados por coma, para las server actions detrás de un proxy. Admite comodines (`*.trycloudflare.com`). Se suma a los hosts de `APP_URL` y `AUTH_URL`. Defínalo antes de `npm run build`. |
| `EMAIL_PROVIDER` | `console` escribe el correo en la salida del proceso. `smtp` usa las variables SMTP. |
| `EMAIL_FROM` | Remitente. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Servidor de correo, solo si el proveedor es `smtp`. |
| `UPLOAD_DIR` | Carpeta de adjuntos. Use una ruta absoluta en el servidor. Si queda relativa, se resuelve desde la raíz del proyecto (no desde `.next/standalone`, que es el directorio de trabajo del proceso). La carpeta se crea al guardar o al descargar. |
| `BUSINESS_WINDOWS` | Franjas hábiles, hora de Colombia. Por defecto `08:00-12:00,14:00-18:00`. |
| `SLA_RISK_RATIO` | A partir de qué fracción del plazo el semáforo pasa a «en riesgo». Por defecto `0.75`. |
| `CRON_SECRET` | Protege `POST /api/cron/sla`. En producción es obligatorio. Envíe `Authorization: Bearer <secreto>`. El aviso sale al 75 % del plazo y al vencer, una vez cada uno. Si no hay un programador externo, `SLA_SCHEDULER=true` revisa cada hora dentro del proceso. |
| `AUTH_URL` en local | Si `APP_URL` apunta a un túnel, abra la mesa por ese túnel. En `http://localhost` la sesión no usa cookie `__Secure` y no redirige al túnel. `Secure` solo se añade cuando la petición llega por `https` (`X-Forwarded-Proto`). |

La URL de retorno de Microsoft, solo si `AUTH_ENTRA_ENABLED=true`, es `{AUTH_URL}/api/auth/callback/microsoft-entra-id`.

El administrador inicial entra con `ADMIN_EMAIL`. Las demás personas entran por una invitación. El registro propio y Microsoft 365 no se usan mientras sus flags estén apagados.

## SLA y festivos

El reloj cuenta solo minutos hábiles: lunes a viernes, dentro de las franjas, en `America/Bogota`. Resta los festivos nacionales, con la Ley Emiliani, y desde 2026 incluye el Día de Nuestra Señora del Rosario de Chiquinquirá. No incluye festivos municipales.

Hay dos relojes: primera respuesta y solución. La primera se detiene al pasar a análisis o revisión de brief, o con el primer comentario público del equipo. La solución se pausa en «En espera de información» y mientras el solicitante valida. El semáforo es verde si queda más de la mitad, amarillo si queda la mitad o menos, y rojo si venció.

Las metas se configuran por área y prioridad en Flujos y SLA. Un cambio no mueve los requerimientos ya radicados.

El respaldo diario es `BACKUP_PASSPHRASE=... npm run backup`. Restaura con `npm run restore -- respaldos/diario/mesa-XXXX.tar.enc`. Conserva 30 diarios y 12 mensuales.

En un servidor, programe el POST a `/api/cron/sla` con `Authorization: Bearer $CRON_SECRET`.

## Alcance

El MVP está en `docs/HU_STATUS.md`. No incluye base de conocimiento, encuestas, automatizaciones, portal externo ni lo que el backlog original hubiera dejado para la fase 2 o la fase 3.

## Supuestos que conviene confirmar

- La jornada real de CIFES y Luvania, y si el sábado cuenta para algún equipo.
- El líder que aprueba es el del área destino (Desarrollo o Marketing), como dice la hoja de flujos.
- Cada persona ve los requerimientos que radicó y, si tiene rol en un área, todos los de esa área.
- La ciudad, si quieren sumar los dos festivos municipales.
- El tenant, la aplicación de Entra ID y el servidor de correo de producción. El alojamiento todavía no está decidido: la imagen de Docker es el camino de despliegue.
