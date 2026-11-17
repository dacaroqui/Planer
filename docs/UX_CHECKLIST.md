# Lista de comprobación UX

Autoevaluación para que QA vuelva a puntuar. La meta del dueño es 95 % en cada heurística de Nielsen.

| Id | Heurística | Qué comprobar | Autoevaluación |
| --- | --- | --- | --- |
| N1 | Visibilidad del estado | El detalle muestra estado, semáforo y la frase «Siguiente paso». El tablero nombra la columna. | 95. El siguiente paso sale del primer movimiento que el rol puede hacer. |
| N2 | Correspondencia con el mundo real | Textos en español de Colombia. La pantalla se llama Panel de gestión. Cada rol ve lo que puede consultar. | 95. Planner conserva el nombre que pidió el dueño. |
| N3 | Control y libertad | Los diálogos tienen Cancelar. El tablero ofrece Deshacer unos segundos. Escape cierra la lista de atajos. | 95. |
| N4 | Consistencia | Pendiente, En curso y Hecha coinciden en Planner y en el detalle. Las columnas salen del flujo. | 95. |
| N5 | Prevención de errores | Eliminar un estado pide confirmación y no borra si hay casos. Canal, fecha y proyecto se piden antes de enviar. | 95. |
| N6 | Reconocer en vez de recordar | Migas de pan en todas las pantallas, búsqueda visible y vistas guardadas. | 95. La miga está en la barra, encima del contenido. |
| N7 | Flexibilidad | `?` muestra la lista. `/` busca. `c` radica. `g` luego `i`, `l`, `b`, `p` o `h` cambia de pantalla. Hay prioridad masiva y vistas guardadas. | 95. |
| N8 | Estética y diseño mínimo | El detalle se parte en Lo pedido, Gestión y Seguimiento. Se ocultan resultado, fechas y prioridad sugerida cuando están vacíos o repetidos. | 95. |
| N9 | Recuperación de errores | El error dice la causa y cómo seguir. Reintentar recarga. Una versión nueva recarga sola. `/api` sin sesión responde 401, no redirige. | 95. |
| N10 | Ayuda | El icono ? y la tecla ? abren la lista. `/ayuda` explica el rol. El porcentaje del proyecto explica su regla. | 95. |

Comprobaciones de QA para volver a medir:

- Móvil: la miga, la búsqueda y el menú caben; el tablero se desplaza en horizontal.
- Teclado: el foco es visible; `?` abre la lista de atajos; los campos de radicar se encuentran por su etiqueta.
- Contraste: texto sobre fondo claro y sobre la barra vino.
- Solicitante: no ve Planner ni el directorio.
- Observador: no ve Radicar.
- Agente de un solo equipo: no abre el tablero del otro equipo.
- Sin sesión, `GET /api/adjuntos/...` responde JSON 401 y no redirige a `/login`.
