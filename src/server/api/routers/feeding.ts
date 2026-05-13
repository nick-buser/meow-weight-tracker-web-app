import { asc, eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { EatingHistory } from "~/server/db/schema";
import { getFeedingHistoryInput } from "~/schema/getFeedingHistoryInput";
import { recordFeedingInput } from "~/schema/recordFeedingInput";
import { assertPetAccess } from "~/server/api/petAccess";

export const feedingRouter = createTRPCRouter({
    recordFeeding: protectedProcedure
        .input(recordFeedingInput)
        .mutation(async ({ ctx, input }) => {
            const { petId, foodId, quantity, fedAt } = input;
            await assertPetAccess(ctx.db, ctx.userId, petId);

            const [newFeedingEntry] = await ctx.db.insert(EatingHistory).values({
                PetID: petId,
                FoodID: foodId,
                Quantity: quantity,
                CreatedAtUTC: new Date(),
                FedAtUTC: fedAt ?? new Date(),
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

    getFeedingHistory: protectedProcedure
        .input(getFeedingHistoryInput)
        .query(async ({ ctx, input }) => {
            const { petId } = input;
            await assertPetAccess(ctx.db, ctx.userId, petId);

            return ctx.db.select()
                .from(EatingHistory)
                .where(eq(EatingHistory.PetID, petId))
                .orderBy(asc(EatingHistory.FedAtUTC));
        }),
});
