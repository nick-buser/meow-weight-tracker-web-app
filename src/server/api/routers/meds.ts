import { and, desc, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { petMeds } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

async function loadMedPetId(
    database: typeof db,
    medId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: petMeds.petId })
        .from(petMeds)
        .where(eq(petMeds.id, medId))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Med not found." });
    }
    return row.petId;
}

const createInput = z.object({
    petId: z.number().int().positive(),
    name: z.string().min(1).max(256),
    dosage: z.string().max(128).optional(),
    frequencyHours: z.number().int().positive().max(24 * 60),
    startsAt: z.date(),
    endsAt: z.date().optional(),
    notes: z.string().max(1024).optional(),
});

export const medsRouter = createTRPCRouter({
    list: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(petMeds)
                .where(
                    and(
                        eq(petMeds.petId, input.petId),
                        isNull(petMeds.deletedAt),
                    ),
                )
                .orderBy(desc(petMeds.startsAt));
        }),

    create: protectedProcedure
        .input(createInput)
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot add meds.",
                });
            }
            const [row] = await ctx.db
                .insert(petMeds)
                .values({
                    petId: input.petId,
                    name: input.name,
                    dosage: input.dosage ?? null,
                    frequencyHours: input.frequencyHours,
                    startsAt: input.startsAt,
                    endsAt: input.endsAt ?? null,
                    notes: input.notes ?? null,
                })
                .returning();
            if (!row) throw new Error("Failed to create med.");
            return row;
        }),

    markGiven: protectedProcedure
        .input(z.object({ medId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const petId = await loadMedPetId(ctx.db, input.medId);
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot mark meds given.",
                });
            }
            const now = new Date();
            const [row] = await ctx.db
                .update(petMeds)
                .set({ lastGivenAt: now, updatedAt: now })
                .where(eq(petMeds.id, input.medId))
                .returning();
            if (!row) throw new Error("Failed to mark med given.");
            return row;
        }),

    deleteEntry: protectedProcedure
        .input(z.object({ medId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const petId = await loadMedPetId(ctx.db, input.medId);
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot delete meds.",
                });
            }
            const now = new Date();
            await ctx.db
                .update(petMeds)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(petMeds.id, input.medId));
            return { ok: true as const };
        }),
});
