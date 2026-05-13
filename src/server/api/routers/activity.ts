import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { activityHistory } from "~/server/db/schema";
import { recordActivityInput } from "~/schema/recordActivityInput";
import { getActivityHistoryInput } from "~/schema/getActivityHistoryInput";
import { assertPetAccess } from "~/server/api/petAccess";
import { z } from "zod";

async function loadEntryPetId(
    database: typeof db,
    entryId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: activityHistory.petId })
        .from(activityHistory)
        .where(eq(activityHistory.id, entryId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Activity entry not found.",
        });
    }
    return row.petId;
}

export const activityRouter = createTRPCRouter({
    record: protectedProcedure
        .input(recordActivityInput)
        .mutation(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            const [row] = await ctx.db
                .insert(activityHistory)
                .values({
                    petId: input.petId,
                    activityType: input.activityType,
                    durationMinutes: input.durationMinutes,
                    performedAt: input.performedAt ?? new Date(),
                    notes: input.notes ?? null,
                })
                .returning();
            if (!row) throw new Error("Failed to record activity.");
            return row;
        }),

    getHistory: protectedProcedure
        .input(getActivityHistoryInput)
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(activityHistory)
                .where(eq(activityHistory.petId, input.petId))
                .orderBy(desc(activityHistory.performedAt));
        }),

    deleteEntry: protectedProcedure
        .input(z.object({ entryId: z.number().int().positive() }))
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
                .delete(activityHistory)
                .where(eq(activityHistory.id, input.entryId));
            return { ok: true as const };
        }),
});
