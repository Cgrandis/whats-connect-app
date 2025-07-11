/*
  Warnings:

  - Added the required column `body` to the `ReplyLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReplyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "repliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ReplyLog" ("contactNumber", "id", "repliedAt") SELECT "contactNumber", "id", "repliedAt" FROM "ReplyLog";
DROP TABLE "ReplyLog";
ALTER TABLE "new_ReplyLog" RENAME TO "ReplyLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
