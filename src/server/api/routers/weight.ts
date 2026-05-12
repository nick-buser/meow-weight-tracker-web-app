import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { WeightHistory } from "~/server/db/schema";
import { getWeightHistoryInput } from "~/schema/getPetWeightInput";
import { recordWeightInput } from "~/schema/recordPetWeightInput";


export const weightRouter = createTRPCRouter({
    // Endpoint to record a pet's weight
    recordWeight: publicProcedure
        .input(recordWeightInput)
        .mutation(async ({ input }) => {
            const { petId, weight, recordedAt } = input;

            const newWeightEntry = await db.insert(WeightHistory).values({
                PetID: petId,
                Weight: weight,
                CreatedUTC: new Date(), // When the record was created
                WeightedUTC: recordedAt ?? new Date(), // When the weight was recorded
            }).returning({
                RecordID: WeightHistory.RecordID,
                PetID: WeightHistory.PetID,
                Weight: WeightHistory.Weight,
                WeightedUTC: WeightHistory.WeightedUTC,
                CreatedUTC: WeightHistory.CreatedUTC,
            });

            if (!newWeightEntry) {
                throw new Error("Failed to record weight entry.");
            }

            return newWeightEntry;
        }),

    // Endpoint to get weight history for a pet
    getWeightHistory: publicProcedure
        .input(getWeightHistoryInput)
        .query(async ({ input }) => {
            const { petId } = input;

            const weightHistory = await db.select()
                .from(WeightHistory)
                .where(WeightHistory.PetID === petId)
                .orderBy(WeightHistory.WeightedUTC.asc())
                .execute();

            if (!weightHistory) {
                throw new Error("Failed to fetch weight history or no records found.");
            }

            return weightHistory;
        }),
});
