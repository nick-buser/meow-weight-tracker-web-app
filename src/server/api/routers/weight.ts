import { asc, eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { WeightHistory } from "~/server/db/schema";
import { getWeightHistoryInput } from "~/schema/getPetWeightInput";
import { recordWeightInput } from "~/schema/recordPetWeightInput";
import { assertPetAccess } from "~/server/api/petAccess";

export const weightRouter = createTRPCRouter({
    recordWeight: protectedProcedure
        .input(recordWeightInput)
        .mutation(async ({ ctx, input }) => {
            const { petId, weight, recordedAt } = input;
            await assertPetAccess(ctx.db, ctx.userId, petId);

            const [newWeightEntry] = await ctx.db.insert(WeightHistory).values({
                PetID: petId,
                Weight: weight,
                CreatedUTC: new Date(),
                WeightedUTC: recordedAt ?? new Date(),
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

    getWeightHistory: protectedProcedure
        .input(getWeightHistoryInput)
        .query(async ({ ctx, input }) => {
            const { petId } = input;
            await assertPetAccess(ctx.db, ctx.userId, petId);

            return ctx.db.select()
                .from(WeightHistory)
                .where(eq(WeightHistory.PetID, petId))
                .orderBy(asc(WeightHistory.WeightedUTC));
        }),
});
