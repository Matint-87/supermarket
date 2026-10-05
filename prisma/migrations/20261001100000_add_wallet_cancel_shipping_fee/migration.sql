-- CreateEnum
CREATE TYPE "CancelActor" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletTxReason" AS ENUM ('ORDER_PAYMENT', 'ORDER_REFUND', 'ADMIN_ADJUST');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "wallet_balance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "shipping_fee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_time" TEXT,
  ADD COLUMN "cancel_reason" TEXT,
  ADD COLUMN "canceled_at" TIMESTAMP(3),
  ADD COLUMN "canceled_by" "CancelActor";

-- سفارش‌های لغوشده‌ی قبلی: زمان لغو = آخرین تغییر
UPDATE "orders" SET "canceled_at" = "updated_at" WHERE "status" = 'CANCELED';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "authority" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_authority_key" ON "transactions"("authority");

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "reason" "WalletTxReason" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "order_code" TEXT,
    "note" TEXT,
    "admin_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_order_code_idx" ON "wallet_transactions"("order_code");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
