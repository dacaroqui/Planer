# Estado de las historias de usuario

Códigos y títulos oficiales de `HUs_Plataforma_Requerimientos.xlsx`. El PM hace el seguimiento con estos nombres. Fase 2 y Fase 3 no son parte del cierre del MVP; si algo de esas fases ya está en la mesa, queda marcado como adelantado.

| HU | Título | Estado | Notas |
| --- | --- | --- | --- |
| RQ-01 | Radicar un requerimiento desde el portal | Hecho | Primero se elige Desarrollo o Marketing; al enviar queda en Nuevo. La pantalla vuelve al detalle con el código, sin quedarse en «Enviando…», y no se puede enviar dos veces. |
| RQ-02 | Elegir el tipo de requerimiento según el área | Hecho | Tipos oficiales. Error pide pasos; Marketing que publica pide canal y fecha. |
| RQ-03 | Adjuntar archivos al requerimiento | Hecho | PDF, Office, imágenes, txt y csv. Tope 25 MB. No se admite zip ni exe. `UPLOAD_DIR` se resuelve desde la raíz del proyecto (o una ruta absoluta) y la carpeta se crea si falta. El dueño y el administrador descargan; quien no puede ver el caso recibe 404. |
| RQ-04 | Recibir número de radicado y confirmación | Hecho | Códigos DES-0001 y MKT-0001. Al radicar, un aviso muestra el código y abre el detalle. El correo sale después, sin frenar la pantalla. |
| RQ-05 | Consultar mis requerimientos y su estado | Hecho | Mis solicitudes, con filtro abiertos/cerrados sin recargar el listado. |
| RQ-06 | Advertir que no se incluyan datos personales | Hecho | Aviso visible, casilla obligatoria y advertencia si parece cédula o celular. |
| RQ-08 | Revisar y clasificar requerimientos nuevos | Hecho | Cola de entrada del líder, cambios de prioridad/tipo/marca con valor anterior y traslado de área. Guardar clasificación refresca el detalle en la misma página. |
| RQ-09 | Asignar un responsable al requerimiento | Hecho | Solo agentes o líderes del área. El responsable y el solicitante reciben aviso. |
| RQ-10 | Mover el requerimiento por los estados del flujo | Hecho | Botones según la hoja Flujos y el rol. La API rechaza una transición no permitida. |
| RQ-11 | Exigir datos obligatorios al cambiar de estado | Hecho | Motivo al rechazar o cancelar, entrega al validar. Si ya hay responsable y fecha, aprobar no los vuelve a pedir. Si faltan, el tablero abre un diálogo y muestra el error. |
| RQ-12 | Pedir información adicional al Solicitante | Hecho | La pregunta es obligatoria, la respuesta devuelve al estado anterior y el SLA queda en pausa. |
| RQ-13 | Aprobar o devolver la entrega | Hecho | Aprobar cierra con Resuelto. Arrastrar a Cerrado pide resolución y comentario, se puede cancelar y ofrece Deshacer. Devolver vuelve a desarrollo o producción. Tras 2 rondas se avisa al líder. |
| RQ-14 | Cerrar con una resolución | Hecho | Resuelto, No se hará, Duplicado y Cancelado por el solicitante. Cerrar desde el tablero pide resolución y comentario. Reabrir limpia la resolución. |
| RQ-17 | Comentar y responder en el requerimiento | Hecho | Texto con negrita, cursiva y listas. En un cerrado se avisa al líder y no se reabre. |
| RQ-20 | Asignar roles a los usuarios por área | Hecho | El primer ingreso queda en Solicitante. El cambio de rol queda en auditoría. |
| RQ-21 | Restringir lo que cada rol puede ver y hacer | Hecho | El solicitante ve lo propio y, en filtros, solo su nombre. Agente y líder ven su área. En Planner el agente no lista empresas ni responsables fuera de esa visibilidad. El observador no modifica. |
| RQ-22 | Notificar por correo los eventos clave | Hecho | Alta, asignación, estado y comentario. Quien actúa no se escribe a sí mismo. El correo solo lleva el enlace. |
| RQ-25 | Ver un tablero por área | Hecho | Las columnas usan el nombre del estado del flujo. Semáforo y filtros de marca, responsable y tipo. Arrastrar ejecuta la transición si el rol puede. |
| RQ-26 | Consultar una lista con filtros | Hecho | Ordena al hacer clic en la columna y filtra por tipo, solicitante, empresa, proyecto, estado, prioridad y fechas. |
| RQ-28 | Ver el historial de gestión del requerimiento | Hecho | Línea de tiempo con valores anterior y nuevo. No se edita. El solicitante no ve notas internas. |
| RQ-29 | Definir tiempos de respuesta (SLA) por área y prioridad | Hecho | Primera respuesta y solución en horario hábil. El cambio vale para los nuevos y no mueve los ya radicados. |
| RQ-30 | Ver el semáforo de SLA en cada requerimiento | Hecho | Verde si queda más del 25 % del plazo, amarillo desde el 75 % consumido, rojo vencido. La primera respuesta se detiene al aceptar o al primer comentario del equipo. |
| RQ-32 | Consultar un dashboard de gestión | Hecho | La pantalla se llama Panel de gestión. Abiertos por estado, creadas contra resueltas, cumplimiento y vencidos. El clic abre la lista. |
| RQ-35 | Configurar estados y transiciones por área | Hecho | Tabla en Flujos y SLA. Eliminar pide confirmación. Si el estado tiene casos, explica por qué no se borra. El tablero muestra esos mismos nombres. |
| RQ-36 | Administrar áreas, tipos, prioridades, marcas y campos | Hecho | Tipos nuevos aparecen en el formulario. Desactivar los oculta sin borrarlos de lo ya radicado. Marcas: CIFES, Luvania y Ambas/Transversal. |
| RQ-38 | Iniciar sesión con la cuenta de Microsoft 365 | Fase 2 | Sigue en Fase 2. Queda detrás de `AUTH_ENTRA_ENABLED`, desactivado por defecto. El ingreso de producción es correo y contraseña. |
| RQ-44 | Respaldar y restaurar la información | Hecho | `scripts/respaldo.sh` cifra base y adjuntos, guarda 30 diarios y 12 mensuales. `scripts/restaurar.sh` recupera. |
| RQ-46 | Gestionar empresas | Hecho | CIFES y Luvania son la semilla. Un líder o el administrador crea empresas y puede exigir proyecto al clasificar. La marca se conserva. |
| RQ-47 | Gestionar proyectos por empresa | Hecho | Nombre, descripción, responsable, fechas y estado. El proyecto es opcional al radicar y obligatorio al clasificar si la empresa lo exige. |
| RQ-48 | Ver % de avance del proyecto | Hecho | Promedio del % de tareas y del % de requerimientos cerrados, usando solo lo que exista. Con un requerimiento abierto no muestra 100 %. El texto de ayuda explica ese promedio mixto. La misma cifra en panel, proyectos, detalle y Planner. |
| RQ-49 | Gestionar tareas del requerimiento/proyecto | Hecho | Título, responsable, fecha límite y estado Pendiente, En curso o Hecha. El porcentaje del detalle sale de las mismas tareas y subtareas que Planner. |
| RQ-50 | Segmentar lista, tablero y dashboard por empresa y proyecto | Hecho | Los tres filtros existen. El dashboard muestra el avance de cada proyecto del corte. |
| RQ-51 | Gestionar subtareas en Planner | Hecho | Planner es un tablero Pendiente / En curso / Hecha, agrupado por proyecto. El % de la tarea sale de sus subtareas y es el mismo que muestra el detalle. |
| RQ-52 | Ingreso con correo y contraseña | Hecho | Contraseña con bcrypt, cookie httpOnly y SameSite. Secure solo si la petición es https. Sin sesión, la redirección a `/login` usa el host de la petición, no `AUTH_URL`. Tras 5 fallos la cuenta queda bloqueada 15 minutos. |
| RQ-53 | Crear usuarios y asignar roles manualmente | Hecho | El administrador crea nombre, correo, contraseña, empresas, áreas y rol. Puede activar, desactivar y aprobar. Queda en auditoría. |
| RQ-54 | Invitar por enlace | Hecho | Enlace de un solo uso, 7 días, rol preasignado. Se copia en pantalla y, si hay SMTP, también se envía. |
| RQ-55 | Registro propio con aprobación | Hecho | Página `/registro` apagada salvo `REGISTRO_PUBLICO=true`. El alta queda pendiente, con rol Solicitante, hasta que un administrador la apruebe. |
| RQ-56 | Recuperar contraseña | Hecho | Con SMTP el enlace sale por correo. Sin SMTP, el administrador lo genera para copiarlo. Vence a las 24 horas y es de un solo uso. |
| RQ-57 | Búsqueda global y atajos de teclado | Hecho | Buscar DES- o MKT- desde la barra. El icono ? y la tecla ? abren la lista de atajos, con enlace a la ayuda. `g` luego `i` abre Inicio. La miga de un proyecto muestra su nombre. `/admin` tiene índice. |
| RQ-58 | Acciones masivas y vistas guardadas | Hecho | Un líder o el administrador cambia la prioridad de varios casos de la lista. Cada persona guarda vistas de filtros en su navegador. |
| RQ-59 | Ayuda contextual por rol | Hecho | `/ayuda` distingue menú, permisos y tareas típicas de solicitante, observador, agente, líder y administrador. |
| RQ-60 | Autorización por recurso en API | Hecho | Un adjunto sin sesión responde 401 y, sin permiso sobre el requerimiento, 404. El detalle de proyecto y los filtros no exponen casos ajenos. |

## Adelantado (Fase 2)

| HU | Título | Estado | Notas |
| --- | --- | --- | --- |
| RQ-19 | Dejar notas internas del equipo | Hecho | Adelantado. El solicitante y el observador no las ven. |
| RQ-24 | Ver notificaciones dentro de la plataforma | Hecho | Adelantado. Hay campana, lista, marcar uno y marcar todos. |
| RQ-31 | Alertar cuando un SLA está por vencer o vencido | Hecho | Adelantado. Avisa una vez al 75 % y otra al vencer, al responsable y al líder. `POST /api/cron/sla` con `CRON_SECRET`, o `SLA_SCHEDULER=true`. |
| RQ-38 | Iniciar sesión con la cuenta de Microsoft 365 | Fase 2 | Oficialmente fuera del ingreso. El botón no aparece salvo `AUTH_ENTRA_ENABLED=true`. |
