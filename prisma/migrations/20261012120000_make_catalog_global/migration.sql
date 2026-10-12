-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "units_shopId_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT "companies_shopId_fkey";

-- DropForeignKey
ALTER TABLE "product_types" DROP CONSTRAINT "product_types_shopId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_shopId_fkey";

-- DropIndex
DROP INDEX "units_shopId_name_key";

-- DropIndex
DROP INDEX "companies_shopId_name_key";

-- DropIndex
DROP INDEX "product_types_shopId_categoryId_name_key";

-- DropIndex
DROP INDEX "products_shopId_categoryId_idx";

-- AlterTable
ALTER TABLE "units" DROP COLUMN "shopId";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "shopId";

-- AlterTable
ALTER TABLE "product_types" DROP COLUMN "shopId";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "avgCost",
DROP COLUMN "deletedAt",
DROP COLUMN "lowStockLevel",
DROP COLUMN "shopId",
DROP COLUMN "stock";

-- CreateTable
CREATE TABLE "shop_products" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lowStockLevel" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "avgCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_shopId_productId_key" ON "shop_products"("shopId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "units_name_key" ON "units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_types_categoryId_name_key" ON "product_types"("categoryId", "name");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_companyId_idx" ON "products"("companyId");

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

