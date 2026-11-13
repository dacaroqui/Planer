# Criterios de aceptación del MVP reconstruido

Cada historia usa el esquema Dado / Cuando / Entonces. No reemplazan el Excel si el archivo original aparece: sirven para saber contra qué se probó esta versión.

## Sprint 1

**RQ-01.** Dado un usuario del tenant configurado en `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`, cuando ingresa con Microsoft, entonces entra a la mesa. El issuer no usa `/common`.

**RQ-02.** Dado un correo que no termina en el dominio permitido, cuando intenta ingresar, entonces la mesa lo rechaza. Un usuario marcado inactivo tampoco entra.

**RQ-03.** Dado `DEV_AUTH_ENABLED=true` y un usuario de la semilla, cuando lo elige en el ingreso, entonces entra sin contraseña. Con la variable en false ese camino no existe.

**RQ-04.** Dado los cinco roles, cuando cada uno abre un requerimiento, entonces solo ve las acciones de su matriz: el observador ninguna, el agente las de su equipo, el líder además aprueba, el administrador todas, el solicitante las suyas.

**RQ-05.** Dado el catálogo, cuando se radica, entonces solo se ofrecen tipos activos del equipo elegido, con su SLA y si exigen aprobación.

**RQ-06.** Dado el formulario, cuando faltan título, descripción, resultado esperado, equipo, tipo, prioridad o marca, entonces no se crea el requerimiento.

**RQ-07.** Dado un administrador, cuando edita un usuario o un tipo, entonces cambia rol, equipo, área, SLA y si sigue activo. Otro rol no entra a esas pantallas.

## Sprint 2

**RQ-08.** Dado un solicitante, cuando envía el formulario a Desarrollo o a Marketing, entonces el requerimiento queda en Radicado y el líder del equipo recibe aviso.

**RQ-09.** Dado dos radicaciones del mismo año, cuando se crean, entonces reciben `REQ-AAAA-0001` y `REQ-AAAA-0002` sin repetirse.

**RQ-10.** Dado un archivo permitido de hasta 10 MB, cuando se adjunta, entonces queda ligado al requerimiento y solo lo descarga alguien con sesión. Un ejecutable se rechaza.

**RQ-11.** Dado cualquier usuario interno, cuando abre el listado, entonces ve el estado de los requerimientos de la organización.

**RQ-12.** Dado el listado, cuando filtra por texto, equipo, estado, prioridad o marca, entonces la lista se reduce a esas coincidencias.

**RQ-13.** Dado un requerimiento con cambios, cuando se abre el detalle, entonces el historial muestra quién hizo cada paso y cuándo.

**RQ-14.** Dado un agente, cuando abre la bandeja, entonces ve lo abierto de su equipo. «Solo los míos» deja los que la persona radicó.

## Sprint 3

**RQ-15.** Dado el solicitante y alguien del equipo, cuando comentan, entonces el texto queda en el requerimiento y la otra parte puede leerlo.

**RQ-16.** Dado una nota interna del equipo, cuando el solicitante abre el detalle, entonces no ve esa nota ni su rastro. Gerencia sí.

**RQ-17.** Dado un requerimiento de Desarrollo, cuando el equipo lo mueve, entonces solo recorre análisis, información, aprobación si aplica, desarrollo, pruebas, resuelto y cierre.

**RQ-18.** Dado un requerimiento de Marketing, cuando el equipo lo mueve, entonces recorre revisión, brief, producción, aprobación de pieza, ajustes y entrega. No puede pasar a desarrollo.

**RQ-19.** Dado un solicitante, cuando intenta pasar un caso a desarrollo, entonces la mesa lo impide. Un agente de Marketing no toma un caso de Desarrollo. Un agente no aprueba.

**RQ-20.** Dado un líder del equipo, cuando asigna un agente activo de ese equipo, entonces el requerimiento queda a su nombre y esa persona recibe aviso.

**RQ-21.** Dado un caso pendiente de aprobación, cuando el líder del equipo destino aprueba, entonces pasa a Aprobado. Cuando lo devuelve, debe escribir el motivo y el solicitante lo ve.

## Sprint 4

**RQ-22.** Dado la jornada hábil y el calendario nacional, cuando se suma un plazo, entonces no cuentan almuerzo, fines de semana ni festivos. El viernes 13 de noviembre de 2026 a las 17:00 más 3 horas hábiles vence el martes 17 a las 10:00, porque el lunes 16 es festivo.

**RQ-23.** Dado un caso en pendiente de información o de brief, cuando corre el reloj, entonces esas horas no consumen el SLA. Al responder, el reloj sigue.

**RQ-24.** Dado el consumo del plazo, cuando se muestra el semáforo, entonces distingue a tiempo, en riesgo (desde el 75 %), vencido, en pausa, cumplido e incumplido.

**RQ-25.** Dado un proveedor de correo, cuando ocurre radicación, comentario, cambio de estado o alerta de SLA, entonces se envía por ese proveedor. En desarrollo el proveedor escribe en la consola.

**RQ-26.** Dado el observador, cuando entra a gerencia o a un requerimiento, entonces ve cifras, estados e historial, incluidas las notas internas, y no puede modificar nada.

**RQ-27.** Dado el panel, cuando se abre, entonces muestra abiertos, vencidos y el corte por Desarrollo y Marketing, además de lo resuelto en siete días.
