-- Brand dictionary
CREATE TABLE "Brand" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

INSERT INTO "Brand" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), trim("brand"), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product"
WHERE "brand" IS NOT NULL AND trim("brand") <> ''
GROUP BY trim("brand");

-- Unit dictionary
CREATE TABLE "Unit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");
CREATE INDEX "Unit_isActive_idx" ON "Unit"("isActive");

INSERT INTO "Unit" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), trim("unit"), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product"
WHERE "unit" IS NOT NULL AND trim("unit") <> ''
GROUP BY trim("unit");
