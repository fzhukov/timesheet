/*
  Warnings:

  - You are about to drop the column `isBlocked` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "isBlocked",
ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false;
