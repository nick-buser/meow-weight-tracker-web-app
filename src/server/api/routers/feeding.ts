import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { eatingHistory, petFood } from "~/server/db/schema";
import { getFeedingHistoryInput } from "~/schema/getFeedingHistoryInput";
import { recordFeedingInput } from "~/schema/recordFeedingInput";
import { updateFeedingEntryInput } from "~/schema/updateFeedingEntryInput";
import { deleteFeedingEntryInput } from "~/schema/deleteFeedingEntryInput";
import { assertPetAccess } from "~/server/api/petAccess";
import { enforceRateLimit } from "~/server/api/ratelimit";

async function loadEntryPetId(
    database: typeof db,
    entryId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: eatingHistory.petId })
        .from(eatingHistory)
        .where(eq(eatingHistory.id, entryId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Feeding entry not found.",
        });
    }
    return row.petId;
}

export const feedingRouter = createTRPCRouter({
    recordFeeding: protectedProcedure
        .input(recordFeedingInput)
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit("recordFeeding", ctx.userId, 60, "1 m");
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

    updateEntry: protectedProcedure
        .input(updateFeedingEntryInput)
        .mutation(async ({ ctx, input }) => {
            const petId = await loadEntryPetId(ctx.db, input.entryId);
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot edit entries.",
                });
            }
            const patch: Record<string, unknown> = { updatedAt: new Date() };
            if (input.foodId !== undefined) patch.foodId = input.foodId;
            if (input.quantityGrams !== undefined)
                patch.quantityGrams = input.quantityGrams;
            if (input.fedAt !== undefined) patch.fedAt = input.fedAt;
            const [row] = await ctx.db
                .update(eatingHistory)
                .set(patch)
                .where(eq(eatingHistory.id, input.entryId))
                .returning();
            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update feeding entry.",
                });
            }
            return row;
        }),

    deleteEntry: protectedProcedure
        .input(deleteFeedingEntryInput)
        .mutation(async ({ ctx, input }) => {
            const petId = await loadEntryPetId(ctx.db, input.entryId);
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot delete entries.",
                });
            }
            await ctx.db
                .delete(eatingHistory)
                .where(eq(eatingHistory.id, input.entryId));
            return { ok: true as const };
        }),
});
