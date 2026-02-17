/*
  Warnings:

  - You are about to drop the column `type` on the `Request` table. All the data in the column will be lost.
  - Added the required column `requestTypeId` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Request" DROP COLUMN "type",
ADD COLUMN     "requestTypeId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "RequestType";

-- CreateTable
CREATE TABLE "RequestType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acceptsAttachments" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
