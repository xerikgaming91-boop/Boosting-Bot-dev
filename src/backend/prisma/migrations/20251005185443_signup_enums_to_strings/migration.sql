-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Signup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raidId" INTEGER NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DPS',
    "charId" INTEGER,
    "displayName" TEXT,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "class" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SIGNUPED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signup_raidId_fkey" FOREIGN KEY ("raidId") REFERENCES "Raid" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Signup_charId_fkey" FOREIGN KEY ("charId") REFERENCES "BoosterChar" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Signup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Signup" ("charId", "class", "createdAt", "displayName", "id", "note", "raidId", "saved", "status", "type", "userId") SELECT "charId", "class", "createdAt", "displayName", "id", "note", "raidId", "saved", "status", "type", "userId" FROM "Signup";
DROP TABLE "Signup";
ALTER TABLE "new_Signup" RENAME TO "Signup";
CREATE INDEX "Signup_raidId_idx" ON "Signup"("raidId");
CREATE INDEX "Signup_userId_idx" ON "Signup"("userId");
CREATE INDEX "Signup_charId_idx" ON "Signup"("charId");
CREATE UNIQUE INDEX "Signup_raidId_charId_key" ON "Signup"("raidId", "charId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
