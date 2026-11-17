# Lista de comprobación UX

Para que QA vuelva a medir. La meta del dueño sigue siendo 95 en cada heurística. Esta lista no asigna ese puntaje.

| Id | Heurística | Qué comprobar |
| --- | --- | --- |
| N1 | Visibilidad del estado | El detalle muestra estado, semáforo y «Siguiente paso». Al radicar, un aviso muestra el código y abre el detalle. Guardar clasificación no deja la pantalla en blanco. |
| N2 | Correspondencia con el mundo real | Textos en español de Colombia. El menú dice Inicio en `/panel` y Panel de gestión en `/gerencia`. Prioridad y marca se leen «Media» y «Luvania». Las columnas del tablero usan el nombre del flujo. |
| N3 | Control y libertad | Arrastrar a Cerrado pide resolución y comentario. Cancelar deja la tarjeta donde estaba. El aviso ofrece Deshacer. |
| N4 | Consistencia | El porcentaje de tareas del detalle y el de Planner salen de la misma cuenta, incluidas las subtareas. Inicio y Panel de gestión no comparten nombre. |
| N5 | Prevención de errores | Eliminar un estado pide confirmación. Si tiene casos, explica por qué no se borra. Radicar no se envía dos veces. Si falta el responsable, el diálogo lo pide antes de aprobar. |
| N6 | Reconocer en vez de recordar | La miga de un proyecto muestra el nombre. Administración abre un índice. La búsqueda sigue en la barra. |
| N7 | Flexibilidad | El icono ? abre la lista de atajos y, dentro, el enlace a la ayuda. `/` busca. `c` radica. `g` luego `i`, `l`, `b`, `p` o `h` cambia de pantalla. |
| N8 | Estética y diseño mínimo | El detalle se parte en Lo pedido, Gestión y Seguimiento. No se muestran claves internas de prioridad, marca o resolución. |
| N9 | Recuperación de errores | Un error de movimiento queda visible, en el aviso y en la página. Borrar un estado con casos no responde 500. Sin sesión, `/api` responde 401 y una página redirige al `/login` del mismo host. |
| N10 | Ayuda | `/ayuda` cambia según el rol: menú, permisos y tareas típicas. El texto del avance del proyecto explica el promedio mixto. |

Comprobaciones para medir de nuevo:

- Dueño o administrador descarga un adjunto. Un usuario ajeno recibe 404.
- Radicar redirige al detalle con el código en el aviso, en menos de 3 s, y el botón no se puede pulsar dos veces.
- Arrastrar de En análisis a Aprobado no pide responsable si ya hay uno. Si falta, el diálogo lo pide y el error se ve.
- Arrastrar a Cerrado pide resolución y comentario, se puede cancelar y ofrece Deshacer.
- Eliminar un estado en Flujos y SLA confirma. Con casos, explica el motivo. Sin casos, lo borra.
- Un proyecto con requerimientos y tareas no dice «Aún no hay trabajo asociado».
- El solicitante no ve otros nombres en Solicitantes. El agente, en Planner, no ve empresas ni responsables fuera de su visibilidad.
- Sin sesión, abrir localhost no redirige al túnel configurado en `AUTH_URL`.
- RQ-38 sigue documentada como Fase 2.
