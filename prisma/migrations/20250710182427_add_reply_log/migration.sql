-- CreateTable
CREATE TABLE "ReplyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactNumber" TEXT NOT NULL,
    "repliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
