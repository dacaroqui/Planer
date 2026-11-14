# Criterios del MVP oficial

Fuente: `HUs_Plataforma_Requerimientos.xlsx`. Aquí queda solo el mapeo de las 27 historias cuyo Release es MVP. El detalle Dado/Cuando/Entonces está en el archivo. El estado de implementación está en `docs/HU_STATUS.md`.

| HU | Título | Release |
| --- | --- | --- |
| RQ-01 | Radicar un requerimiento desde el portal | MVP |
| RQ-02 | Elegir el tipo de requerimiento según el área | MVP |
| RQ-03 | Adjuntar archivos al requerimiento | MVP |
| RQ-04 | Recibir número de radicado y confirmación | MVP |
| RQ-05 | Consultar mis requerimientos y su estado | MVP |
| RQ-06 | Advertir que no se incluyan datos personales | MVP |
| RQ-08 | Revisar y clasificar requerimientos nuevos | MVP |
| RQ-09 | Asignar un responsable al requerimiento | MVP |
| RQ-10 | Mover el requerimiento por los estados del flujo | MVP |
| RQ-11 | Exigir datos obligatorios al cambiar de estado | MVP |
| RQ-12 | Pedir información adicional al Solicitante | MVP |
| RQ-13 | Aprobar o devolver la entrega | MVP |
| RQ-14 | Cerrar con una resolución | MVP |
| RQ-17 | Comentar y responder en el requerimiento | MVP |
| RQ-20 | Asignar roles a los usuarios por área | MVP |
| RQ-21 | Restringir lo que cada rol puede ver y hacer | MVP |
| RQ-22 | Notificar por correo los eventos clave | MVP |
| RQ-25 | Ver un tablero por área | MVP |
| RQ-26 | Consultar una lista con filtros | MVP |
| RQ-28 | Ver el historial de gestión del requerimiento | MVP |
| RQ-29 | Definir tiempos de respuesta (SLA) por área y prioridad | MVP |
| RQ-30 | Ver el semáforo de SLA en cada requerimiento | MVP |
| RQ-32 | Consultar un dashboard de gestión | MVP |
| RQ-35 | Configurar estados y transiciones por área | MVP |
| RQ-36 | Administrar áreas, tipos, prioridades, marcas y campos | MVP |
| RQ-38 | Iniciar sesión con la cuenta de Microsoft 365 | MVP |
| RQ-44 | Respaldar y restaurar la información | MVP |
| RQ-46 | Gestionar empresas | Pedido del dueño |
| RQ-47 | Gestionar proyectos por empresa | Pedido del dueño |
| RQ-48 | Ver % de avance del proyecto | Pedido del dueño |
| RQ-49 | Gestionar tareas del requerimiento/proyecto | Pedido del dueño |
| RQ-50 | Segmentar lista, tablero y dashboard por empresa y proyecto | Pedido del dueño |
| RQ-51 | Gestionar subtareas en Planner | Pedido del dueño |

## Criterios de RQ-46 a RQ-51

**RQ-46.** Dado un líder o administrador, cuando crea una empresa, entonces aparece en los filtros y en el formulario. Dado la semilla, cuando se abre el catálogo, entonces existen CIFES y Luvania. La marca del requerimiento se conserva.

**RQ-47.** Dado un líder, cuando crea un proyecto, entonces indica empresa, nombre, descripción, responsable, fecha de inicio, fecha objetivo y estado. Dado el formulario de radicación, cuando no elige proyecto, entonces el requerimiento se crea igual. Dado que la empresa exige proyecto al clasificar, cuando el líder aprueba sin proyecto, entonces la mesa no avanza.

**RQ-48.** Dado un proyecto con tareas, cuando se abre su tarjeta, entonces el porcentaje es el promedio del avance de sus tareas y se ve una barra. Dado un proyecto sin tareas, cuando se calcula el avance, entonces es requerimientos cerrados sobre el total.

**RQ-49.** Dado un agente del área, cuando crea una tarea en un requerimiento o proyecto, entonces guarda título, responsable, fecha límite y estado. Dado que la marca Hecha, cuando se guarda, entonces el avance del requerimiento y del proyecto cambia y queda una línea en el historial.

**RQ-50.** Dado la lista, el tablero y el dashboard, cuando filtro por empresa o proyecto, entonces solo queda ese corte. Dado el dashboard, cuando elijo una empresa, entonces veo el avance de cada proyecto.

**RQ-51.** Dado Planner, cuando lo abro, entonces veo columnas Pendiente, En curso y Hecha, agrupadas por proyecto, y puedo filtrar por empresa, proyecto y responsable. Dado una tarea, cuando agrego subtareas con responsable, fecha y estado, entonces el porcentaje de la tarea es subtareas hechas sobre el total.

RQ-07, RQ-15, RQ-16, RQ-18, RQ-19, RQ-23, RQ-24, RQ-27, RQ-31, RQ-33, RQ-34, RQ-37, RQ-39, RQ-40, RQ-41, RQ-42, RQ-43 y RQ-45 no son MVP.
