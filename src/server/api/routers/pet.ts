import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPetRequestInput } from "~/schema/createPetRequestInput";
import { PetPeople, Pets } from "~/server/db/schema";

export const petRouter = createTRPCRouter({
    insertPet: protectedProcedure
        .input(createPetRequestInput)
        .mutation(async ({ ctx, input }) => {
            const { species, gender, name, age } = input;

            return await ctx.db.transaction(async (trx) => {
                const [newPet] = await trx.insert(Pets).values({
                    Species: species,
                    Gender: gender,
                    Name: name,
                    Age: age,
                }).returning({
                    PetID: Pets.PetID,
                    Species: Pets.Species,
                    Gender: Pets.Gender,
                    Name: Pets.Name,
                    Age: Pets.Age,
                });

                if (!newPet) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to create the pet entry",
                    });
                }

                await trx.insert(PetPeople).values({
                    UserID: ctx.userId,
                    PetID: newPet.PetID,
                    CreatedAt: new Date(),
                    UpdatedAt: new Date(),
                    Role: "Owner",
                });

                return newPet;
            });
        }),

    getPets: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.db.select()
                .from(Pets)
                .innerJoin(PetPeople, eq(Pets.PetID, PetPeople.PetID))
                .where(eq(PetPeople.UserID, ctx.userId));
        }),
});
