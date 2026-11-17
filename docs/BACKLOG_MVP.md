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
| RQ-38 | Iniciar sesión con la cuenta de Microsoft 365 | Fase 2 |
| RQ-44 | Respaldar y restaurar la información | MVP |
| RQ-46 | Gestionar empresas | Pedido del dueño |
| RQ-47 | Gestionar proyectos por empresa | Pedido del dueño |
| RQ-48 | Ver % de avance del proyecto | Pedido del dueño |
| RQ-49 | Gestionar tareas del requerimiento/proyecto | Pedido del dueño |
| RQ-50 | Segmentar lista, tablero y dashboard por empresa y proyecto | Pedido del dueño |
| RQ-51 | Gestionar subtareas en Planner | Pedido del dueño |
| RQ-52 | Ingreso con correo y contraseña | Pedido del dueño |
| RQ-53 | Crear usuarios y asignar roles manualmente | Pedido del dueño |
| RQ-54 | Invitar por enlace | Pedido del dueño |
| RQ-55 | Registro propio con aprobación | Pedido del dueño |
| RQ-56 | Recuperar contraseña | Pedido del dueño |
| RQ-57 | Búsqueda global y atajos de teclado | Pedido del dueño |
| RQ-58 | Acciones masivas y vistas guardadas | Pedido del dueño |
| RQ-59 | Ayuda contextual por rol | Pedido del dueño |
| RQ-60 | Autorización por recurso en API | Pedido del dueño |

## Criterios de RQ-46 a RQ-51

**RQ-46.** Dado un líder o administrador, cuando crea una empresa, entonces aparece en los filtros y en el formulario. Dado la semilla, cuando se abre el catálogo, entonces existen CIFES y Luvania. La marca del requerimiento se conserva.

**RQ-47.** Dado un líder, cuando crea un proyecto, entonces indica empresa, nombre, descripción, responsable, fecha de inicio, fecha objetivo y estado. Dado el formulario de radicación, cuando no elige proyecto, entonces el requerimiento se crea igual. Dado que la empresa exige proyecto al clasificar, cuando el líder aprueba sin proyecto, entonces la mesa no avanza.

**RQ-48.** Dado un proyecto con tareas, cuando se abre su tarjeta, entonces el porcentaje es el promedio del avance de sus tareas y se ve una barra. Dado un proyecto sin tareas, cuando se calcula el avance, entonces es requerimientos cerrados sobre el total.

**RQ-49.** Dado un agente del área, cuando crea una tarea en un requerimiento o proyecto, entonces guarda título, responsable, fecha límite y estado. Dado que la marca Hecha, cuando se guarda, entonces el avance del requerimiento y del proyecto cambia y queda una línea en el historial.

**RQ-50.** Dado la lista, el tablero y el dashboard, cuando filtro por empresa o proyecto, entonces solo queda ese corte. Dado el dashboard, cuando elijo una empresa, entonces veo el avance de cada proyecto.

**RQ-51.** Dado Planner, cuando lo abro, entonces veo columnas Pendiente, En curso y Hecha, agrupadas por proyecto, y puedo filtrar por empresa, proyecto y responsable. Dado una tarea, cuando agrego subtareas con responsable, fecha y estado, entonces el porcentaje de la tarea es subtareas hechas sobre el total.

## Criterios de RQ-52 a RQ-56

**RQ-52.** Dado un usuario activo con contraseña, cuando escribe correo y contraseña correctos, entonces entra y la cookie de sesión es httpOnly. Dado cinco contraseñas incorrectas, cuando intenta de nuevo, entonces la cuenta queda bloqueada 15 minutos. Dado que cierra sesión, cuando vuelve, entonces debe identificarse otra vez.

**RQ-53.** Dado el administrador, cuando crea un usuario, entonces indica nombre, correo, empresas, áreas y rol, y el cambio queda en auditoría. Dado que lo desactiva, cuando esa persona intenta entrar, entonces la mesa no abre la sesión.

**RQ-54.** Dado el administrador, cuando invita, entonces recibe un enlace para copiar, de un solo uso y con vencimiento a los 7 días, con el rol ya elegido. Dado el invitado, cuando abre el enlace y define nombre y contraseña, entonces la cuenta queda activa con ese rol. Si SMTP está configurado, el mismo enlace también sale por correo.

**RQ-55.** Dado que `REGISTRO_PUBLICO` no es `true`, cuando alguien abre `/registro`, entonces no puede crear una cuenta. Dado que el flag está activo y el dominio está permitido, cuando se registra, entonces queda pendiente de aprobación con rol Solicitante hasta que un administrador lo apruebe.

**RQ-56.** Dado SMTP configurado, cuando la persona pide recuperar la contraseña, entonces recibe un enlace. Dado que no hay SMTP, cuando el administrador genera el restablecimiento, entonces puede copiar el enlace. El enlace vence a las 24 horas y no sirve una segunda vez.

**RQ-57.** Dado que estoy en la mesa, cuando presiono `/`, entonces el foco va a la búsqueda. Cuando escribo un código DES- o MKT-, entonces la lista se filtra. `c` abre radicar, `g` luego `b` el tablero, `g` luego `l` la lista y `?` la ayuda.

**RQ-58.** Dado un líder, cuando marca varios requerimientos y elige una prioridad, entonces esos casos cambian y los demás no. Dado un filtro, cuando guardo la vista, entonces puedo volver a abrirla en este navegador.

**RQ-59.** Dado cualquier rol, cuando abre `/ayuda`, entonces ve los atajos y qué puede hacer ese rol.

**RQ-60.** Dado un adjunto, cuando no hay sesión, entonces la respuesta es 401. Cuando la sesión no puede ver el requerimiento, entonces es 404 y no aparece el nombre interno del archivo. El dueño, el equipo del área y el administrador sí lo reciben.

RQ-07, RQ-15, RQ-16, RQ-18, RQ-19, RQ-23, RQ-24, RQ-27, RQ-31, RQ-33, RQ-34, RQ-37, RQ-39, RQ-40, RQ-41, RQ-42, RQ-43 y RQ-45 no son MVP.
