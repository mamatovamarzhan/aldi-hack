-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visual" TEXT;

-- AlterTable
ALTER TABLE "ExerciseTranslation" ADD COLUMN     "machineTranslated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlockNote" TEXT;
