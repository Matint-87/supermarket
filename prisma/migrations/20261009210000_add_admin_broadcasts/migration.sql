-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_MESSAGE';

-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL', 'SELECTED');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "broadcast_id" UUID,
ADD COLUMN "dismissed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "notification_broadcasts" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "admin_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "audience" "BroadcastAudience" NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_broadcasts_created_at_idx" ON "notification_broadcasts"("created_at");

-- CreateIndex
CREATE INDEX "notifications_broadcast_id_idx" ON "notifications"("broadcast_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "notification_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
