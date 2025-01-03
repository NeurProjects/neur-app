/*
  Warnings:

  - Added the required column `completionTokens` to the `token_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promptTokens` to the `token_stats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "token_stats" ADD COLUMN     "completionTokens" INTEGER NOT NULL,
ADD COLUMN     "promptTokens" INTEGER NOT NULL;
