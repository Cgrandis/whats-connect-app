-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "whatsappId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "pushname" TEXT,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_whatsappId_key" ON "Group"("whatsappId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_number_key" ON "Contact"("number");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
