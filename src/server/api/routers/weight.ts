import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { petPeople, pets, weightHistory } from "~/server/db/schema";
import { getWeightHistoryInput } from "~/schema/getPetWeightInput";
import { recordWeightInput } from "~/schema/recordPetWeightInput";
import {
    deleteWeightEntryInput,
} from "~/schema/deleteWeightEntryInput";
import {
    updateWeightEntryInput,
} from "~/schema/updateWeightEntryInput";
import { assertPetAccess } from "~/server/api/petAccess";
import { enforceRateLimit } from "~/server/api/ratelimit";

async function loadEntryPetId(
    database: typeof db,
    entryId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: weightHistory.petId })
        .from(weightHistory)
        .where(eq(weightHistory.id, entryId))
        .limit(1);
    if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Weight entry not found." });
    }
    return row.petId;
}

export const weightRouter = createTRPCRouter({
    recordWeight: protectedProcedure
        .input(recordWeightInput)
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit("recordWeight", ctx.userId, 60, "1 m");
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

    // Weight series for every non-deleted pet the user can access, for the
    // multi-pet comparison view. The petPeople join scopes to the user, so
    // no per-pet assertPetAccess is needed.
    getComparison: protectedProcedure.query(async ({ ctx }) => {
        const userPets = await ctx.db
            .select({
                id: pets.id,
                name: pets.name,
                goalWeight: pets.goalWeight,
            })
            .from(pets)
            .innerJoin(petPeople, eq(pets.id, petPeople.petId))
            .where(
                and(
                    eq(petPeople.userId, ctx.userId),
                    isNull(pets.deletedAt),
                ),
            );
        if (userPets.length === 0) return [];

        const rows = await ctx.db
            .select({
                petId: weightHistory.petId,
                weighedAt: weightHistory.weighedAt,
                weight: weightHistory.weight,
            })
            .from(weightHistory)
            .where(
                inArray(
                    weightHistory.petId,
                    userPets.map((p) => p.id),
                ),
            )
            .orderBy(asc(weightHistory.weighedAt));

        const pointsByPet = new Map<
            number,
            { weighedAt: Date; weight: number }[]
        >();
        for (const row of rows) {
            const list = pointsByPet.get(row.petId) ?? [];
            list.push({ weighedAt: row.weighedAt, weight: row.weight });
            pointsByPet.set(row.petId, list);
        }

        return userPets.map((p) => ({
            petId: p.id,
            petName: p.name,
            goalWeight: p.goalWeight,
            points: pointsByPet.get(p.id) ?? [],
        }));
    }),

    updateEntry: protectedProcedure
        .input(updateWeightEntryInput)
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
            if (input.weight !== undefined) patch.weight = input.weight;
            if (input.weighedAt !== undefined) patch.weighedAt = input.weighedAt;
            const [row] = await ctx.db
                .update(weightHistory)
                .set(patch)
                .where(eq(weightHistory.id, input.entryId))
                .returning();
            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update weight entry.",
                });
            }
            return row;
        }),

    deleteEntry: protectedProcedure
        .input(deleteWeightEntryInput)
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
                .delete(weightHistory)
                .where(eq(weightHistory.id, input.entryId));
            return { ok: true as const };
        }),

    bulkImport: protectedProcedure
        .input(
            z.object({
                petId: z.number().int().positive(),
                entries: z
                    .array(
                        z.object({
                            weighedAt: z.date(),
                            weight: z.number().positive(),
                        }),
                    )
                    .min(1)
                    .max(1000),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit("bulkImport", ctx.userId, 5, "1 h");
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot import entries.",
                });
            }
            const rows = input.entries.map((e) => ({
                petId: input.petId,
                weight: e.weight,
                weighedAt: e.weighedAt,
            }));
            const inserted = await ctx.db
                .insert(weightHistory)
                .values(rows)
                .returning({ id: weightHistory.id });
            return { inserted: inserted.length };
        }),
});
