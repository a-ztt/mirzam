-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "catalogNumber" TEXT,
    "unit" TEXT,
    "qty" INTEGER,
    "priceKzt" INTEGER,
    "condition" TEXT NOT NULL DEFAULT 'new',
    "fits" JSONB NOT NULL DEFAULT [],
    "description" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("brand", "catalogNumber", "category", "condition", "createdAt", "description", "id", "isActive", "priceKzt", "qty", "slug", "title", "unit", "updatedAt") SELECT "brand", "catalogNumber", "category", coalesce("condition", 'new') AS "condition", "createdAt", "description", "id", "isActive", "priceKzt", "qty", "slug", "title", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_category_idx" ON "Product"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
