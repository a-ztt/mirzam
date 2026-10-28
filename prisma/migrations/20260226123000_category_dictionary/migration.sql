-- Category dictionary
CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- Backfill category dictionary from existing products
INSERT INTO "Category" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), trim("category"), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product"
WHERE "category" IS NOT NULL AND trim("category") <> ''
GROUP BY trim("category");
