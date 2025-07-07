-- CreateTable
CREATE TABLE "SentMessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactNumber" TEXT NOT NULL,
    "messageTitle" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
