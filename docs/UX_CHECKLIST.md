# Lista de comprobación UX

Autoevaluación después de los hallazgos de QA. No es la medición de QA: sirve para que vuelvan a puntuar. La meta del dueño es 95 % en cada heurística de Nielsen.

| Id | Heurística | Qué comprobar | Autoevaluación |
| --- | --- | --- | --- |
| N1 | Visibilidad del estado | El detalle muestra estado, semáforo y el siguiente paso en los botones de gestión. El tablero nombra la columna. | 78. Falta un texto fijo de «siguiente paso» en todos los estados. |
| N2 | Correspondencia con el mundo real | Textos en español de Colombia. La pantalla de gestión se llama Panel de gestión. Cada rol ve una descripción de lo que puede consultar. | 82. Quedan nombres internos como Planner, que el dueño pidió así. |
| N3 | Control y libertad | Los diálogos de mover, entregar y reabrir tienen Cancelar. El tablero ofrece Deshacer unos segundos. | 80. No hay deshacer fuera del tablero. |
| N4 | Consistencia | Pendiente, En curso y Hecha se usan igual en Planner y en el detalle. Las columnas del tablero salen del flujo. | 76. La lista y el tablero no comparten todavía el mismo grupo de filtros. |
| N5 | Prevención de errores | Eliminar un estado pide confirmación y no borra si hay casos. Canal, fecha y proyecto se piden antes de enviar. Las acciones no permitidas no se ofrecen. | 84. |
| N6 | Reconocer en vez de recordar | Búsqueda visible, vistas guardadas en el navegador y ayuda con atajos. | 74. Las migas de pan solo están en Ayuda. |
| N7 | Flexibilidad | Atajos `c`, `/`, `g b`, `g l`, `?`. Búsqueda por código. Prioridad masiva para líder y administrador. | 72. No hay el conjunto completo de atajos de un tablero tipo Jira. |
| N8 | Estética y diseño mínimo | Se oculta el resultado esperado vacío. Las tarjetas del tablero muestran código, estado y semáforo. | 74. El detalle sigue siendo denso en pantallas chicas. |
| N9 | Recuperación de errores | El error dice la causa (motivo, enlace, proyecto, permiso). Reintentar vuelve a cargar. Si la versión cambió, la página se recarga. | 80. |
| N10 | Ayuda | Icono ? en la barra y página `/ayuda` según el rol. El porcentaje del proyecto explica su regla. | 78. No hay un texto de ayuda dentro de cada pantalla. |

Comprobaciones de QA para volver a medir:

- Móvil: la barra de búsqueda y el menú caben; el tablero se desplaza en horizontal; los botones no quedan cortados.
- Teclado: el foco del botón y del enlace es visible; los campos de radicar se encuentran por su etiqueta.
- Contraste: texto sobre fondo claro y sobre la barra vino se lee sin forzar la vista.
- Solicitante: no ve Planner ni el directorio de personas.
- Observador: no ve Radicar y el mensaje dice solo lectura.
- Agente de un solo equipo: no abre el tablero del otro equipo ni sus casos.
