/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Goal` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "GoalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "motto" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoalTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoalTemplateTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalTemplateId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    CONSTRAINT "GoalTemplateTopic_goalTemplateId_fkey" FOREIGN KEY ("goalTemplateId") REFERENCES "GoalTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GoalTemplateTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "motto" TEXT,
    "deadline" DATETIME,
    "userId" TEXT NOT NULL,
    "goalTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_goalTemplateId_fkey" FOREIGN KEY ("goalTemplateId") REFERENCES "GoalTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("createdAt", "deadline", "description", "id", "motto", "name", "updatedAt", "userId") SELECT "createdAt", "deadline", "description", "id", "motto", "name", "updatedAt", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GoalTemplateTopic_goalTemplateId_topicId_key" ON "GoalTemplateTopic"("goalTemplateId", "topicId");
