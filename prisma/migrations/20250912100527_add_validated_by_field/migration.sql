-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_LEARNED',
    "validatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentTopic_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudentTopic" ("createdAt", "id", "status", "topicId", "updatedAt", "userId") SELECT "createdAt", "id", "status", "topicId", "updatedAt", "userId" FROM "StudentTopic";
DROP TABLE "StudentTopic";
ALTER TABLE "new_StudentTopic" RENAME TO "StudentTopic";
CREATE UNIQUE INDEX "StudentTopic_userId_topicId_key" ON "StudentTopic"("userId", "topicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
