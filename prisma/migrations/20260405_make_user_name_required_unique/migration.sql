-- Fill existing NULL names with a unique placeholder derived from the user id
UPDATE "User" SET "name" = 'user_' || "id" WHERE "name" IS NULL;

-- Make name required
ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
