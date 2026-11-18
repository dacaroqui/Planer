-- Corte de rendimiento: requerimientos del responsable en un periodo, sus pausas y sus tareas.
CREATE INDEX "Request_assigneeId_createdAt_idx" ON "Request"("assigneeId", "createdAt");
CREATE INDEX "Request_assigneeId_resolvedAt_idx" ON "Request"("assigneeId", "resolvedAt");
CREATE INDEX "SlaPause_requestId_startedAt_idx" ON "SlaPause"("requestId", "startedAt");
CREATE INDEX "Tarea_assigneeId_createdAt_idx" ON "Tarea"("assigneeId", "createdAt");
CREATE INDEX "Tarea_assigneeId_completedAt_idx" ON "Tarea"("assigneeId", "completedAt");
