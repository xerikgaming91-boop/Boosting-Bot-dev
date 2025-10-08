-- CreateTable
CREATE TABLE "Strike" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignupEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER,
    "userId" TEXT NOT NULL,
    "charId" INTEGER,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignupEvent_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SignupEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SignupEvent_charId_fkey" FOREIGN KEY ("charId") REFERENCES "BoosterChar" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Strike_userId_idx" ON "Strike"("userId");

-- CreateIndex
CREATE INDEX "Strike_expiresAt_idx" ON "Strike"("expiresAt");

-- CreateIndex
CREATE INDEX "SignupEvent_raidId_idx" ON "SignupEvent"("raidId");

-- CreateIndex
CREATE INDEX "SignupEvent_userId_idx" ON "SignupEvent"("userId");

-- CreateIndex
CREATE INDEX "SignupEvent_type_idx" ON "SignupEvent"("type");

-- CreateIndex
CREATE INDEX "SignupEvent_createdAt_idx" ON "SignupEvent"("createdAt");
