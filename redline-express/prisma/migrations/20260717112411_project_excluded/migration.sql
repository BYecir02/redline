-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "excluded" TEXT[] DEFAULT ARRAY[]::TEXT[];
