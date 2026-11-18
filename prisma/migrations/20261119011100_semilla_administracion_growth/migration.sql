-- Catálogo, flujo estándar, tipos y líder de Administración.
-- Idempotente: no pisa filas que ya existen y no falla si el usuario aún no está.

INSERT INTO "CatalogItem" ("id", "kind", "key", "name", "description", "icon", "color", "active", "sortOrder")
VALUES
  ('equipo_administracion', 'EQUIPO', 'ADMINISTRACION', 'Administración', 'Compras, documentos y trámites internos de la casa.', 'edificio', 'ambar', true, 5),
  ('equipo_growth', 'EQUIPO', 'GROWTH', 'Growth', 'Experimentos, adquisición y conversión.', 'crecimiento', 'lima', true, 6)
ON CONFLICT ("kind", "key") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "icon" = EXCLUDED."icon",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder";

INSERT INTO "WorkflowState" ("id", "team", "key", "name", "category", "sortOrder", "boardColumn", "hiddenOnBoard", "active")
SELECT v.id, v.team::"Team", v.key, v.name, v.category, v.sort_order, v.board_column, v.hidden, true
FROM (VALUES
  ('ws_adm_nuevo', 'ADMINISTRACION', 'NUEVO', 'Nuevo', 'POR_HACER', 10, 'Nuevo', false),
  ('ws_adm_analisis', 'ADMINISTRACION', 'EN_ANALISIS', 'En análisis', 'EN_CURSO', 20, 'En análisis', false),
  ('ws_adm_espera', 'ADMINISTRACION', 'EN_ESPERA', 'En espera de información', 'EN_CURSO', 30, 'En espera', false),
  ('ws_adm_curso', 'ADMINISTRACION', 'EN_CURSO', 'En curso', 'EN_CURSO', 40, 'En curso', false),
  ('ws_adm_revision', 'ADMINISTRACION', 'EN_REVISION', 'En revisión', 'EN_CURSO', 50, 'En revisión', false),
  ('ws_adm_hecho', 'ADMINISTRACION', 'HECHO', 'Hecho', 'TERMINADO', 60, 'Hecho', false),
  ('ws_adm_cancelado', 'ADMINISTRACION', 'CANCELADO', 'Cancelado', 'TERMINADO', 70, 'Cancelado', true),
  ('ws_gro_nuevo', 'GROWTH', 'NUEVO', 'Nuevo', 'POR_HACER', 10, 'Nuevo', false),
  ('ws_gro_analisis', 'GROWTH', 'EN_ANALISIS', 'En análisis', 'EN_CURSO', 20, 'En análisis', false),
  ('ws_gro_espera', 'GROWTH', 'EN_ESPERA', 'En espera de información', 'EN_CURSO', 30, 'En espera', false),
  ('ws_gro_curso', 'GROWTH', 'EN_CURSO', 'En curso', 'EN_CURSO', 40, 'En curso', false),
  ('ws_gro_revision', 'GROWTH', 'EN_REVISION', 'En revisión', 'EN_CURSO', 50, 'En revisión', false),
  ('ws_gro_hecho', 'GROWTH', 'HECHO', 'Hecho', 'TERMINADO', 60, 'Hecho', false),
  ('ws_gro_cancelado', 'GROWTH', 'CANCELADO', 'Cancelado', 'TERMINADO', 70, 'Cancelado', true)
) AS v(id, team, key, name, category, sort_order, board_column, hidden)
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkflowState" s WHERE s."team"::text = v.team AND s."key" = v.key
);

INSERT INTO "WorkflowTransition" ("id", "team", "name", "fromKeys", "toKey", "allowedRoles", "requiresComment", "requiresAssignee", "slaEffect", "resolution", "clearResolution", "toPrevious", "reopenWithinDays", "active")
SELECT v.id, v.team::"Team", v.name, v.from_keys, v.to_key, v.roles, v.needs_comment, v.needs_assignee, v.sla, v.resolution, v.clear_resolution, v.to_previous, v.reopen_days, true
FROM (VALUES
  ('wt_adm_analisis', 'ADMINISTRACION', 'Iniciar análisis', 'NUEVO', 'EN_ANALISIS', 'LIDER', false, false, 'STOP_FIRST', '', false, false, 0),
  ('wt_adm_info', 'ADMINISTRACION', 'Pedir información', 'EN_ANALISIS,EN_CURSO,EN_REVISION', 'EN_ESPERA', 'RESPONSABLE,LIDER', true, false, 'PAUSE', '', false, false, 0),
  ('wt_adm_respuesta', 'ADMINISTRACION', 'Responder información', 'EN_ESPERA', 'EN_ESPERA', 'SOLICITANTE,RESPONSABLE,LIDER', false, false, 'RESUME', '', false, true, 0),
  ('wt_adm_curso', 'ADMINISTRACION', 'Pasar a en curso', 'EN_ANALISIS', 'EN_CURSO', 'LIDER', false, true, 'CONTINUE', '', false, false, 0),
  ('wt_adm_revision', 'ADMINISTRACION', 'Enviar a revisión', 'EN_CURSO', 'EN_REVISION', 'RESPONSABLE,LIDER', false, false, 'NONE', '', false, false, 0),
  ('wt_adm_hecho', 'ADMINISTRACION', 'Marcar hecho', 'EN_REVISION', 'HECHO', 'SOLICITANTE,LIDER', false, false, 'STOP', 'RESUELTO', false, false, 0),
  ('wt_adm_devolver', 'ADMINISTRACION', 'Devolver', 'EN_REVISION', 'EN_CURSO', 'SOLICITANTE', true, false, 'RESUME', '', false, false, 0),
  ('wt_adm_cancelar', 'ADMINISTRACION', 'Cancelar', 'NUEVO,EN_ANALISIS,EN_CURSO', 'CANCELADO', 'SOLICITANTE,LIDER', true, false, 'STOP', 'CANCELADO_SOLICITANTE', false, false, 0),
  ('wt_adm_reabrir', 'ADMINISTRACION', 'Reabrir', 'HECHO', 'EN_ANALISIS', 'LIDER', true, false, 'NEW_CYCLE', '', true, false, 30),
  ('wt_gro_analisis', 'GROWTH', 'Iniciar análisis', 'NUEVO', 'EN_ANALISIS', 'LIDER', false, false, 'STOP_FIRST', '', false, false, 0),
  ('wt_gro_info', 'GROWTH', 'Pedir información', 'EN_ANALISIS,EN_CURSO,EN_REVISION', 'EN_ESPERA', 'RESPONSABLE,LIDER', true, false, 'PAUSE', '', false, false, 0),
  ('wt_gro_respuesta', 'GROWTH', 'Responder información', 'EN_ESPERA', 'EN_ESPERA', 'SOLICITANTE,RESPONSABLE,LIDER', false, false, 'RESUME', '', false, true, 0),
  ('wt_gro_curso', 'GROWTH', 'Pasar a en curso', 'EN_ANALISIS', 'EN_CURSO', 'LIDER', false, true, 'CONTINUE', '', false, false, 0),
  ('wt_gro_revision', 'GROWTH', 'Enviar a revisión', 'EN_CURSO', 'EN_REVISION', 'RESPONSABLE,LIDER', false, false, 'NONE', '', false, false, 0),
  ('wt_gro_hecho', 'GROWTH', 'Marcar hecho', 'EN_REVISION', 'HECHO', 'SOLICITANTE,LIDER', false, false, 'STOP', 'RESUELTO', false, false, 0),
  ('wt_gro_devolver', 'GROWTH', 'Devolver', 'EN_REVISION', 'EN_CURSO', 'SOLICITANTE', true, false, 'RESUME', '', false, false, 0),
  ('wt_gro_cancelar', 'GROWTH', 'Cancelar', 'NUEVO,EN_ANALISIS,EN_CURSO', 'CANCELADO', 'SOLICITANTE,LIDER', true, false, 'STOP', 'CANCELADO_SOLICITANTE', false, false, 0),
  ('wt_gro_reabrir', 'GROWTH', 'Reabrir', 'HECHO', 'EN_ANALISIS', 'LIDER', true, false, 'NEW_CYCLE', '', true, false, 30)
) AS v(id, team, name, from_keys, to_key, roles, needs_comment, needs_assignee, sla, resolution, clear_resolution, to_previous, reopen_days)
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkflowTransition" t
  WHERE t."team"::text = v.team AND t."name" = v.name AND t."fromKeys" = v.from_keys AND t."toKey" = v.to_key
);

INSERT INTO "RequestType" ("id", "team", "name", "description", "extra", "active", "createdAt")
SELECT v.id, v.team::"Team", v.name, v.description, v.extra, true, NOW()
FROM (VALUES
  ('rt_adm_compra', 'ADMINISTRACION', 'Compra o proveedor', 'Una compra, un pago o la gestión de un proveedor.', ''),
  ('rt_adm_doc', 'ADMINISTRACION', 'Documento interno', 'Un acta, un formato o un documento de la casa.', ''),
  ('rt_adm_proceso', 'ADMINISTRACION', 'Proceso administrativo', 'Un trámite interno de administración.', ''),
  ('rt_adm_personal', 'ADMINISTRACION', 'Soporte de personal', 'Una solicitud de personal, horario o dotación.', ''),
  ('rt_gro_exp', 'GROWTH', 'Experimento de crecimiento', 'Una prueba para aumentar alcance o conversión.', ''),
  ('rt_gro_camp', 'GROWTH', 'Campaña de adquisición', 'Una campaña para traer nuevos interesados.', 'canal'),
  ('rt_gro_embudo', 'GROWTH', 'Análisis de embudo', 'Una lectura de dónde se pierde la gente en el recorrido.', ''),
  ('rt_gro_conv', 'GROWTH', 'Mejora de conversión', 'Un ajuste para que más personas completen un paso.', '')
) AS v(id, team, name, description, extra)
WHERE NOT EXISTS (
  SELECT 1 FROM "RequestType" t WHERE t."team"::text = v.team AND t."name" = v.name
);

INSERT INTO "SlaPolicy" ("id", "team", "priority", "firstResponseMinutes", "resolutionMinutes", "active")
SELECT v.id, v.team::"Team", v.priority, v.first_minutes, v.resolution_minutes, true
FROM (VALUES
  ('sla_adm_critica', 'ADMINISTRACION', 'CRITICA', 240, 960),
  ('sla_adm_alta', 'ADMINISTRACION', 'ALTA', 480, 1440),
  ('sla_adm_media', 'ADMINISTRACION', 'MEDIA', 960, 2400),
  ('sla_adm_baja', 'ADMINISTRACION', 'BAJA', 1440, 3840),
  ('sla_gro_critica', 'GROWTH', 'CRITICA', 240, 960),
  ('sla_gro_alta', 'GROWTH', 'ALTA', 480, 1440),
  ('sla_gro_media', 'GROWTH', 'MEDIA', 960, 2400),
  ('sla_gro_baja', 'GROWTH', 'BAJA', 1440, 4800)
) AS v(id, team, priority, first_minutes, resolution_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM "SlaPolicy" p
  WHERE p."team"::text = v.team AND p."typeId" IS NULL AND p."priority" = v.priority
);

INSERT INTO "AreaRole" ("id", "userId", "team", "role")
SELECT 'ar_adm_' || u."id", u."id", 'ADMINISTRACION', 'LIDER'
FROM "User" u
WHERE lower(u."email") = 'cristianaudit@cifes.edu.co'
  AND NOT EXISTS (
    SELECT 1 FROM "AreaRole" r
    WHERE r."userId" = u."id" AND r."team" = 'ADMINISTRACION' AND r."role" = 'LIDER'
  );
