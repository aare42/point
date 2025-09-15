/*
  Warnings:

  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `companyId` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `employmentType` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `experienceLevel` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `salaryMax` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `salaryMin` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Vacancy` table. All the data in the column will be lost.
  - You are about to drop the column `isRequired` on the `VacancyTopic` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `VacancyTopic` table. All the data in the column will be lost.
  - Added the required column `name` to the `Vacancy` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Company";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vacancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vacancy_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Vacancy" ("authorId", "createdAt", "id", "updatedAt") SELECT "authorId", "createdAt", "id", "updatedAt" FROM "Vacancy";
DROP TABLE "Vacancy";
ALTER TABLE "new_Vacancy" RENAME TO "Vacancy";
CREATE TABLE "new_VacancyTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vacancyId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    CONSTRAINT "VacancyTopic_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VacancyTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VacancyTopic" ("id", "topicId", "vacancyId") SELECT "id", "topicId", "vacancyId" FROM "VacancyTopic";
DROP TABLE "VacancyTopic";
ALTER TABLE "new_VacancyTopic" RENAME TO "VacancyTopic";
CREATE UNIQUE INDEX "VacancyTopic_vacancyId_topicId_key" ON "VacancyTopic"("vacancyId", "topicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
