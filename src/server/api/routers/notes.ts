import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { petNotes } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

const recordNoteInput = z.object({
    petId: z.number().int().positive(),
    body: z.string().min(1).max(4096),
    writtenAt: z.date().optional(),
});

async function loadNotePetId(
    database: typeof db,
    entryId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: petNotes.petId })
        .from(petNotes)
        .where(eq(petNotes.id, entryId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Note not found.",
        });
    }
    return row.petId;
}

export const notesRouter = createTRPCRouter({
    record: protectedProcedure
        .input(recordNoteInput)
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot add notes.",
                });
            }
            const [row] = await ctx.db
                .insert(petNotes)
                .values({
                    petId: input.petId,
                    body: input.body,
                    writtenAt: input.writtenAt ?? new Date(),
                    writtenBy: ctx.userId,
                })
                .returning();
            if (!row) throw new Error("Failed to record note.");
            return row;
        }),

    getNotes: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(petNotes)
                .where(eq(petNotes.petId, input.petId))
                .orderBy(desc(petNotes.writtenAt));
        }),

    deleteEntry: protectedProcedure
        .input(z.object({ entryId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const petId = await loadNotePetId(ctx.db, input.entryId);
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot delete notes.",
                });
            }
            await ctx.db
                .delete(petNotes)
                .where(eq(petNotes.id, input.entryId));
            return { ok: true as const };
        }),
});
