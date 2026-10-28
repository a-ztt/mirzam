BEGIN TRANSACTION;

-- Category: normalize names and remove case-insensitive duplicates
UPDATE "Category"
SET "name" = trim("name"),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" <> trim("name");

DELETE FROM "Category"
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM "Category"
  WHERE trim("name") <> ''
  GROUP BY lower(trim("name"))
);

DELETE FROM "Category" WHERE trim("name") = '';
DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_norm_key"
ON "Category"(lower(trim("name")));

-- Brand: normalize names and remove case-insensitive duplicates
UPDATE "Brand"
SET "name" = trim("name"),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" <> trim("name");

DELETE FROM "Brand"
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM "Brand"
  WHERE trim("name") <> ''
  GROUP BY lower(trim("name"))
);

DELETE FROM "Brand" WHERE trim("name") = '';
DROP INDEX IF EXISTS "Brand_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_name_norm_key"
ON "Brand"(lower(trim("name")));

-- Unit: normalize names and remove case-insensitive duplicates
UPDATE "Unit"
SET "name" = trim("name"),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" <> trim("name");

DELETE FROM "Unit"
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM "Unit"
  WHERE trim("name") <> ''
  GROUP BY lower(trim("name"))
);

DELETE FROM "Unit" WHERE trim("name") = '';
DROP INDEX IF EXISTS "Unit_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_name_norm_key"
ON "Unit"(lower(trim("name")));

COMMIT;
