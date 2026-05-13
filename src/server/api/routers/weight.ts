import { asc, eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { weightHistory } from "~/server/db/schema";
import { getWeightHistoryInput } from "~/schema/getPetWeightInput";
import { recordWeightInput } from "~/schema/recordPetWeightInput";
import { assertPetAccess } from "~/server/api/petAccess";

export const weightRouter = createTRPCRouter({
    recordWeight: protectedProcedure
        .input(recordWeightInput)
        .mutation(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);

            const [entry] = await ctx.db
                .insert(weightHistory)
                .values({
                    petId: input.petId,
                    weight: input.weight,
                    weighedAt: input.recordedAt ?? new Date(),
                })
                .returning();

            if (!entry) {
                throw new Error("Failed to record weight entry.");
            }

            return entry;
        }),

    getWeightHistory: protectedProcedure
        .input(getWeightHistoryInput)
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);

            return ctx.db
                .select()
                .from(weightHistory)
                .where(eq(weightHistory.petId, input.petId))
                .orderBy(asc(weightHistory.weighedAt));
        }),
});
