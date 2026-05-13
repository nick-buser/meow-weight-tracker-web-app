import { desc, eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eatingHistory, petFood } from "~/server/db/schema";
import { getFeedingHistoryInput } from "~/schema/getFeedingHistoryInput";
import { recordFeedingInput } from "~/schema/recordFeedingInput";
import { assertPetAccess } from "~/server/api/petAccess";

export const feedingRouter = createTRPCRouter({
    recordFeeding: protectedProcedure
        .input(recordFeedingInput)
        .mutation(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);

            const [entry] = await ctx.db
                .insert(eatingHistory)
                .values({
                    petId: input.petId,
                    foodId: input.foodId,
                    quantityGrams: input.quantityGrams,
                    fedAt: input.fedAt ?? new Date(),
                })
                .returning();

            if (!entry) {
                throw new Error("Failed to record feeding entry.");
            }

            return entry;
        }),

    getFeedingHistory: protectedProcedure
        .input(getFeedingHistoryInput)
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);

            return ctx.db
                .select({
                    id: eatingHistory.id,
                    petId: eatingHistory.petId,
                    fedAt: eatingHistory.fedAt,
                    quantityGrams: eatingHistory.quantityGrams,
                    food: petFood,
                })
                .from(eatingHistory)
                .innerJoin(petFood, eq(eatingHistory.foodId, petFood.id))
                .where(eq(eatingHistory.petId, input.petId))
                .orderBy(desc(eatingHistory.fedAt));
        }),
});
