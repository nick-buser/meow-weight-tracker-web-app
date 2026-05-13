import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPetRequestInput } from "~/schema/createPetRequestInput";
import { getPetInput } from "~/schema/getPetInput";
import { updatePetInput } from "~/schema/updatePetInput";
import { petPeople, pets } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

export const petRouter = createTRPCRouter({
    insertPet: protectedProcedure
        .input(createPetRequestInput)
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.transaction(async (trx) => {
                const [newPet] = await trx
                    .insert(pets)
                    .values({
                        species: input.species,
                        gender: input.gender,
                        name: input.name,
                        birthDate: input.birthDate ?? null,
                    })
                    .returning();

                if (!newPet) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to create the pet entry",
                    });
                }

                await trx.insert(petPeople).values({
                    userId: ctx.userId,
                    petId: newPet.id,
                    role: "Owner",
                });

                return newPet;
            });
        }),

    getPets: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select({
                id: pets.id,
                species: pets.species,
                gender: pets.gender,
                name: pets.name,
                birthDate: pets.birthDate,
                createdAt: pets.createdAt,
                updatedAt: pets.updatedAt,
                role: petPeople.role,
            })
            .from(pets)
            .innerJoin(petPeople, eq(pets.id, petPeople.petId))
            .where(
                and(eq(petPeople.userId, ctx.userId), isNull(pets.deletedAt)),
            );
    }),

    getPet: protectedProcedure
        .input(getPetInput)
        .query(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            const [row] = await ctx.db
                .select()
                .from(pets)
                .where(and(eq(pets.id, input.petId), isNull(pets.deletedAt)))
                .limit(1);
            if (!row) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            return { ...row, role };
        }),

    updatePet: protectedProcedure
        .input(updatePetInput)
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot edit this pet.",
                });
            }

            const patch: Record<string, unknown> = { updatedAt: new Date() };
            if (input.name !== undefined) patch.name = input.name;
            if (input.species !== undefined) patch.species = input.species;
            if (input.gender !== undefined) patch.gender = input.gender;
            if (input.birthDate !== undefined) patch.birthDate = input.birthDate;

            const [row] = await ctx.db
                .update(pets)
                .set(patch)
                .where(eq(pets.id, input.petId))
                .returning();

            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update pet.",
                });
            }
            return row;
        }),

    deletePet: protectedProcedure
        .input(getPetInput)
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can delete a pet.",
                });
            }
            const now = new Date();
            await ctx.db
                .update(pets)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(pets.id, input.petId));
            return { ok: true as const };
        }),
});
