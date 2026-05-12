import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { EatingHistory } from "~/server/db/schema";
import { getFeedingHistoryInput } from "~/schema/getFeedingHistoryInput";
import { recordFeedingInput } from "~/schema/recordFeedingInput";

export const feedingRouter = createTRPCRouter({
    // Endpoint to record a pet's feeding
    recordFeeding: publicProcedure
        .input(recordFeedingInput)
        .mutation(async ({ input }) => {
            const { petId, foodId, quantity, fedAt } = input;

            const newFeedingEntry = await db.insert(EatingHistory).values({
                PetID: petId,
                FoodID: foodId,
                Quantity: quantity,
                CreatedAtUTC: new Date(), // When the record was created
                FedAtUTC: fedAt ?? new Date(), // When the feeding occurred
            }).returning({
                EntryID: EatingHistory.EntryID,
                PetID: EatingHistory.PetID,
                FoodID: EatingHistory.FoodID,
                Quantity: EatingHistory.Quantity,
                CreatedAtUTC: EatingHistory.CreatedAtUTC,
                FedAtUTC: EatingHistory.FedAtUTC,
            });

            if (!newFeedingEntry) {
                throw new Error("Failed to record feeding entry.");
            }

            return newFeedingEntry;
        }),

    // Endpoint to get feeding history for a pet
    getFeedingHistory: publicProcedure
        .input(getFeedingHistoryInput)
        .query(async ({ input }) => {
            const { petId } = input;

            const feedingHistory = await db.select()
                .from(EatingHistory)
                .where(EatingHistory.PetID === petId)
                .orderBy(EatingHistory.FedAtUTC.asc())
                .execute();

            if (!feedingHistory) {
                throw new Error("Failed to fetch feeding history or no records found.");
            }

            return feedingHistory;
        }),
});
