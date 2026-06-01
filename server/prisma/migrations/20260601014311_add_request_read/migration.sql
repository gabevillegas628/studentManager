-- CreateTable
CREATE TABLE "RequestRead" (
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestRead_pkey" PRIMARY KEY ("userId","requestId")
);

-- AddForeignKey
ALTER TABLE "RequestRead" ADD CONSTRAINT "RequestRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestRead" ADD CONSTRAINT "RequestRead_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
