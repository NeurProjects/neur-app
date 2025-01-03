-- CreateTable
CREATE TABLE "token_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageIds" TEXT[],
    "totalTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_stats_userId_key" ON "token_stats"("userId");

-- AddForeignKey
ALTER TABLE "token_stats" ADD CONSTRAINT "token_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
