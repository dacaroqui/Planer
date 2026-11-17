CREATE INDEX "Request_updatedAt_idx" ON "Request"("updatedAt");
CREATE INDEX "Request_areaId_idx" ON "Request"("areaId");
CREATE INDEX "Request_resolvedAt_idx" ON "Request"("resolvedAt");
CREATE INDEX "Request_team_status_updatedAt_idx" ON "Request"("team", "status", "updatedAt");
