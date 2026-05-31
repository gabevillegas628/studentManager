-- Add studentToken as nullable first to handle existing rows
ALTER TABLE "Request" ADD COLUMN "studentToken" TEXT;

-- Backfill existing rows with unique UUIDs
UPDATE "Request" SET "studentToken" = gen_random_uuid()::TEXT WHERE "studentToken" IS NULL;

-- Now enforce NOT NULL and UNIQUE
ALTER TABLE "Request" ALTER COLUMN "studentToken" SET NOT NULL;
ALTER TABLE "Request" ADD CONSTRAINT "Request_studentToken_key" UNIQUE ("studentToken");

-- Create MessageSender enum
CREATE TYPE "MessageSender" AS ENUM ('STUDENT', 'STAFF');

-- Create Message table
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "staffName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "Message" ADD CONSTRAINT "Message_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
