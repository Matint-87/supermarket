-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('POST', 'COURIER', 'PICKUP');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shipping_method" "ShippingMethod" NOT NULL DEFAULT 'POST';
