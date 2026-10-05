-- AlterEnum: واحدهای فروش جدید (جعبه، شانه، حلب)
ALTER TYPE "ProductUnit" ADD VALUE IF NOT EXISTS 'CARTON';
ALTER TYPE "ProductUnit" ADD VALUE IF NOT EXISTS 'TRAY';
ALTER TYPE "ProductUnit" ADD VALUE IF NOT EXISTS 'CAN';
