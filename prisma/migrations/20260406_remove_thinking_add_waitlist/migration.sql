-- Remove status column and ParticipantStatus enum, add isWaitlist boolean

ALTER TABLE "GameParticipant" DROP COLUMN "status";
ALTER TABLE "GameParticipant" ADD COLUMN "isWaitlist" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "GameParticipant_gameId_isWaitlist_idx" ON "GameParticipant"("gameId", "isWaitlist");

DROP TYPE "ParticipantStatus";
