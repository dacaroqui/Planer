# Estado de las historias de usuario

Fuente prevista: `HUs_Plataforma_Requerimientos.xlsx`, hoja Backlog HUs. Esos archivos no estaban en el entorno de construcción (`/workspace/uploads` no existía). Las 27 historias de abajo reconstruyen el MVP descrito en el encargo: roles, flujos de Desarrollo y Marketing, campos del requerimiento, SLA en horas hábiles con festivos de Colombia, comentarios e historial. El orden es el de los sprints sugeridos para ese alcance. Si el código del Excel difiere, hay que reetiquetar; el comportamiento está en `docs/BACKLOG_MVP.md`.

Fase 2 y Fase 3 no se implementaron.

| HU | Título | Estado | Notas |
| --- | --- | --- | --- |
| RQ-01 | Ingreso con Microsoft Entra ID del tenant cifes.edu.co | Hecho | Issuer del tenant por variables de entorno. Sin credenciales reales el botón no aparece. |
| RQ-02 | Rechazo de cuentas fuera del dominio interno | Hecho | Solo `@cifes.edu.co`. Un usuario inactivo tampoco entra. |
| RQ-03 | Ingreso de prueba sin credenciales reales | Hecho | `DEV_AUTH_ENABLED=true`. Usuarios ficticios, sin contraseña. |
| RQ-04 | Cinco roles y sus permisos | Hecho | Solicitante, Agente, Líder de área, Administrador, Observador. |
| RQ-05 | Catálogo de áreas, equipos y tipos | Hecho | Desarrollo y Marketing, con SLA y si exige aprobación. |
| RQ-06 | Campos obligatorios del requerimiento | Hecho | Título, descripción, resultado esperado, equipo, tipo, prioridad y marca. |
| RQ-07 | Administración de usuarios y catálogos | Hecho | Solo el administrador. |
| RQ-08 | Radicar a Desarrollo o a Marketing | Hecho | Cualquier perfil excepto Observador. |
| RQ-09 | Consecutivo único visible | Hecho | `REQ-AAAA-0001`, con secuencia en base de datos. |
| RQ-10 | Adjuntar archivos | Hecho | Hasta 10 MB. Tipos de oficina e imagen. |
| RQ-11 | Listado con estado visible para la organización | Hecho | El historial público lo ve cualquier usuario interno. |
| RQ-12 | Filtros y búsqueda | Hecho | Texto, equipo, estado, prioridad, marca, míos y asignados. |
| RQ-13 | Detalle con historial de gestión | Hecho | Cada cambio queda con autor y fecha. |
| RQ-14 | Mis solicitudes y bandeja del equipo | Hecho | La bandeja es de Desarrollo, Marketing o de ambos si es administrador. |
| RQ-15 | Comentarios entre solicitante y equipo | Hecho | Quedan dentro del requerimiento. |
| RQ-16 | Notas internas ocultas al solicitante | Hecho | El observador de gerencia sí las lee. |
| RQ-17 | Flujo de Desarrollo | Hecho | Análisis, información, aprobación, desarrollo, pruebas, resuelto y cierre. |
| RQ-18 | Flujo de Marketing | Hecho | Revisión, brief, producción, aprobación de pieza, ajustes y entrega. |
| RQ-19 | Transiciones restringidas por rol | Hecho | Un solicitante no ejecuta; un agente no aprueba; otro equipo no toca la cola. |
| RQ-20 | Asignar y reasignar un ejecutor | Hecho | Agente, líder del equipo o administrador. |
| RQ-21 | Aprobar o devolver | Hecho | Lo hace el líder del equipo destino. Devolver exige comentario. |
| RQ-22 | SLA en horas hábiles y festivos de Colombia | Hecho | Jornada por defecto 08:00–12:00 y 14:00–18:00. Incluye Chiquinquirá desde 2026. |
| RQ-23 | Pausa del SLA mientras se espera al solicitante | Hecho | Pendiente de información o de brief. |
| RQ-24 | Semáforo de SLA | Hecho | A tiempo, en riesgo, vencido, en pausa, cumplido, incumplido. |
| RQ-25 | Correo con proveedor intercambiable | Hecho | `console` en desarrollo y `smtp` si se configura. También queda el aviso en la mesa. |
| RQ-26 | Vista de gerencia de solo lectura | Hecho | El observador no radica, no comenta y no cambia estados. |
| RQ-27 | Tablero operativo por equipo y estado | Hecho | Panel y gerencia, con vencidos, riesgo y resueltos de 7 días. |
