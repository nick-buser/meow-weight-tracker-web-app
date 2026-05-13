import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPetRequestInput } from "~/schema/createPetRequestInput";
import { petPeople, pets } from "~/server/db/schema";

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
            .where(eq(petPeople.userId, ctx.userId));
    }),
});
