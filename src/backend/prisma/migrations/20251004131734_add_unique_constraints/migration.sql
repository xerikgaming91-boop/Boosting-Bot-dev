/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,realm]` on the table `BoosterChar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[raidId,charId]` on the table `Signup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "BoosterChar_userId_idx" ON "BoosterChar"("userId");

-- CreateIndex
CREATE INDEX "BoosterChar_name_idx" ON "BoosterChar"("name");

-- CreateIndex
CREATE INDEX "BoosterChar_realm_idx" ON "BoosterChar"("realm");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterChar_userId_name_realm_key" ON "BoosterChar"("userId", "name", "realm");

-- CreateIndex
CREATE INDEX "Raid_date_idx" ON "Raid"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Signup_raidId_charId_key" ON "Signup"("raidId", "charId");
