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

`db:setup` aplica las migraciones y carga usuarios ficticios. No hay contraseñas: en la pantalla de ingreso elija un perfil de ejemplo.

| Correo | Rol |
| --- | --- |
| admin.ejemplo@cifes.edu.co | Administrador |
| helena.ejemplo@cifes.edu.co | Líder de Desarrollo |
| sara.ejemplo@cifes.edu.co | Líder de Marketing |
| valentina.ejemplo@cifes.edu.co | Agente de Desarrollo |
| ana.ejemplo@cifes.edu.co | Solicitante de Académico |
| gerencia.ejemplo@cifes.edu.co | Observador, solo lectura |

También están Julián (solicitante de Luvania), Camila (agente de Marketing), Mateo y Tomás. Ninguno corresponde a una persona real. La semilla trae CIFES y Luvania, cinco proyectos con distinto avance, veinte requerimientos y tareas con subtareas en Planner. Cada arranque de Docker vuelve a cargar esa semilla y reemplaza los datos de demostración.

## Pruebas

Hace falta la base `requerimientos_test` en el mismo servidor.

```bash
createdb requerimientos_test 2>/dev/null || true
npm test
```

Cubren radicar, el consecutivo, la transición según el rol, el comentario, la nota interna, aprobar, devolver, el adjunto y el cálculo del SLA con festivos.

## Docker

```bash
docker compose up --build
```

Ese único comando levanta PostgreSQL y la mesa en [http://127.0.0.1:3000](http://127.0.0.1:3000), aplica las migraciones y carga la semilla. No hace falta un archivo `.env`: Compose define `DEV_AUTH_ENABLED=true` y un secreto de demostración. Cambie `AUTH_SECRET` antes de salir de la máquina local. El desarrollo con `npm run dev` sigue en el puerto 38471.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión de PostgreSQL. |
| `APP_URL` y `AUTH_URL` | Dirección pública. Los correos arman el enlace con `APP_URL`. |
| `AUTH_SECRET` | Firma de la sesión. Cámbielo fuera de su máquina. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Id de aplicación (cliente) en Entra ID. |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Secreto de esa aplicación. |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Id de directorio del tenant cifes.edu.co. El issuer queda en `https://login.microsoftonline.com/<tenant>/v2.0` y no acepta otras organizaciones. |
| `AUTH_ALLOWED_EMAIL_DOMAIN` | Dominio permitido. Por defecto `cifes.edu.co`. |
| `DEV_AUTH_ENABLED` | `true` solo en desarrollo. Habilita el ingreso sin contraseña. En producción déjelo en `false`. |
| `EMAIL_PROVIDER` | `console` escribe el correo en la salida del proceso. `smtp` usa las variables SMTP. |
| `EMAIL_FROM` | Remitente. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Servidor de correo, solo si el proveedor es `smtp`. |
| `UPLOAD_DIR` | Carpeta de adjuntos. |
| `BUSINESS_WINDOWS` | Franjas hábiles, hora de Colombia. Por defecto `08:00-12:00,14:00-18:00`. |
| `SLA_RISK_RATIO` | A partir de qué fracción del plazo el semáforo pasa a «en riesgo». Por defecto `0.75`. |
| `CRON_SECRET` | Protege `POST /api/cron/sla`. En producción es obligatorio. Envíe `Authorization: Bearer <secreto>`. |

La URL de retorno de Microsoft es `{AUTH_URL}/api/auth/callback/microsoft-entra-id`.

Quien entra por primera vez con una cuenta válida del dominio queda como solicitante, en el área Académico si existe. El administrador cambia el rol después.

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
