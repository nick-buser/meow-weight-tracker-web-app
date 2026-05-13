import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { healthEvents } from "~/server/db/schema";
import { recordHealthEventInput } from "~/schema/recordHealthEventInput";
import { assertPetAccess } from "~/server/api/petAccess";

async function loadEntryPetId(
    database: typeof db,
    entryId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: healthEvents.petId })
        .from(healthEvents)
        .where(eq(healthEvents.id, entryId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Health event not found.",
        });
    }
    return row.petId;
}

export const healthRouter = createTRPCRouter({
    record: protectedProcedure
        .input(recordHealthEventInput)
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot add health events.",
                });
            }
            const [row] = await ctx.db
                .insert(healthEvents)
                .values({
                    petId: input.petId,
                    eventType: input.eventType,
                    title: input.title,
                    occurredAt: input.occurredAt ?? new Date(),
                    notes: input.notes ?? null,
                })
                .returning();
            if (!row) throw new Error("Failed to record health event.");
            return row;
        }),

    getHistory: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(healthEvents)
                .where(eq(healthEvents.petId, input.petId))
                .orderBy(desc(healthEvents.occurredAt));
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
                .delete(healthEvents)
                .where(eq(healthEvents.id, input.entryId));
            return { ok: true as const };
        }),
});
