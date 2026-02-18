-- AlterTable
ALTER TABLE "User" ADD COLUMN     "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "digestHour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "digestTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "lastDigestSentAt" TIMESTAMP(3);
