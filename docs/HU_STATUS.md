# Estado de las historias de usuario

Códigos y títulos oficiales de `HUs_Plataforma_Requerimientos.xlsx`. El PM hace el seguimiento con estos nombres. Fase 2 y Fase 3 no son parte del cierre del MVP; si algo de esas fases ya está en la mesa, queda marcado como adelantado.

| HU | Título | Estado | Notas |
| --- | --- | --- | --- |
| RQ-01 | Radicar un requerimiento desde el portal | Hecho | Primero se elige Desarrollo o Marketing; al enviar queda en Nuevo. |
| RQ-02 | Elegir el tipo de requerimiento según el área | Hecho | Tipos oficiales. Error pide pasos; Marketing que publica pide canal y fecha. |
| RQ-03 | Adjuntar archivos al requerimiento | Hecho | Imágenes, PDF, Office y video. Tope 25 MB. El .exe se rechaza. Queda en el historial. |
| RQ-04 | Recibir número de radicado y confirmación | Hecho | Códigos DES-0001 y MKT-0001, pantalla de confirmación y correo con el enlace. |
| RQ-05 | Consultar mis requerimientos y su estado | Hecho | Mis solicitudes, con filtro abiertos/cerrados sin recargar el listado. |
| RQ-06 | Advertir que no se incluyan datos personales | Hecho | Aviso visible, casilla obligatoria y advertencia si parece cédula o celular. |
| RQ-08 | Revisar y clasificar requerimientos nuevos | Hecho | Cola de entrada del líder, cambios de prioridad/tipo/marca con valor anterior y traslado de área. |
| RQ-09 | Asignar un responsable al requerimiento | Hecho | Solo agentes o líderes del área. El responsable y el solicitante reciben aviso. |
| RQ-10 | Mover el requerimiento por los estados del flujo | Hecho | Botones según la hoja Flujos y el rol. La API rechaza una transición no permitida. |
| RQ-11 | Exigir datos obligatorios al cambiar de estado | Hecho | Motivo al rechazar o cancelar, entrega al validar, responsable y fecha al aprobar. |
| RQ-12 | Pedir información adicional al Solicitante | Hecho | La pregunta es obligatoria, la respuesta devuelve al estado anterior y el SLA queda en pausa. |
| RQ-13 | Aprobar o devolver la entrega | Hecho | Aprobar cierra con Resuelto. Devolver vuelve a desarrollo o producción. Tras 2 rondas se avisa al líder. |
| RQ-14 | Cerrar con una resolución | Hecho | Resuelto, No se hará y Cancelado por el solicitante salen de las transiciones. Reabrir limpia la resolución. |
| RQ-17 | Comentar y responder en el requerimiento | Hecho | Texto con negrita, cursiva y listas. En un cerrado se avisa al líder y no se reabre. |
| RQ-20 | Asignar roles a los usuarios por área | Hecho | El primer ingreso queda en Solicitante. El cambio de rol queda en auditoría. |
| RQ-21 | Restringir lo que cada rol puede ver y hacer | Hecho | El solicitante ve lo propio. Agente y líder ven su área. El observador no modifica. |
| RQ-22 | Notificar por correo los eventos clave | Hecho | Alta, asignación, estado y comentario. Quien actúa no se escribe a sí mismo. El correo solo lleva el enlace. |
| RQ-25 | Ver un tablero por área | Hecho | Columnas del flujo, semáforo y filtros de marca, responsable y tipo. Arrastrar ejecuta la transición si el rol puede. |
| RQ-26 | Consultar una lista con filtros | Parcial | Filtra área, marca, estado, prioridad, fechas y texto, y pagina de a 50. Falta ordenar con un clic en la columna y filtrar por tipo o solicitante en la pantalla. |
| RQ-28 | Ver el historial de gestión del requerimiento | Hecho | Línea de tiempo con valores anterior y nuevo. No se edita. El solicitante no ve notas internas. |
| RQ-29 | Definir tiempos de respuesta (SLA) por área y prioridad | Hecho | Primera respuesta y solución en horario hábil. El cambio vale para los nuevos y no mueve los ya radicados. |
| RQ-30 | Ver el semáforo de SLA en cada requerimiento | Hecho | Verde por encima del 50 %, amarillo hasta el 50 %, rojo vencido. La primera respuesta se detiene al aceptar o al primer comentario del equipo. |
| RQ-32 | Consultar un dashboard de gestión | Hecho | Abiertos por estado, creadas contra resueltas, cumplimiento y vencidos. El clic abre la lista. |
| RQ-35 | Configurar estados y transiciones por área | Hecho | Tabla en Flujos y SLA. Borrar un estado con casos exige moverlos antes. |
| RQ-36 | Administrar áreas, tipos, prioridades, marcas y campos | Hecho | Tipos nuevos aparecen en el formulario. Desactivar los oculta sin borrarlos de lo ya radicado. Marcas: CIFES, Luvania y Ambas/Transversal. |
| RQ-38 | Iniciar sesión con la cuenta de Microsoft 365 | Hecho | Entra ID del tenant y rechazo de otro dominio. Una cuenta deshabilitada en Microsoft no obtiene token. |
| RQ-44 | Respaldar y restaurar la información | Hecho | `scripts/respaldo.sh` cifra base y adjuntos, guarda 30 diarios y 12 mensuales. `scripts/restaurar.sh` recupera. |

## Adelantado (Fase 2)

| HU | Título | Estado | Notas |
| --- | --- | --- | --- |
| RQ-19 | Dejar notas internas del equipo | Hecho | Adelantado. El solicitante y el observador no las ven. |
| RQ-24 | Ver notificaciones dentro de la plataforma | Parcial | Adelantado. Hay campana y lista. Falta marcar una sola como leída al abrirla. |
| RQ-31 | Alertar cuando un SLA está por vencer o vencido | Parcial | Adelantado. El vencimiento avisa una vez al responsable y al líder. Falta el aviso al 75 %. |
