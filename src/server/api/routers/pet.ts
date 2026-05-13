import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPetRequestInput } from "~/schema/createPetRequestInput";
import { getPetInput } from "~/schema/getPetInput";
import { updatePetInput } from "~/schema/updatePetInput";
import { petInvites, petPeople, pets, users } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

const roleSchema = z.enum(["Owner", "Editor", "Viewer"]);

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
                goalWeight: pets.goalWeight,
                dailyKcalTarget: pets.dailyKcalTarget,
                photoUrl: pets.photoUrl,
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
            if (input.goalWeight !== undefined) patch.goalWeight = input.goalWeight;
            if (input.dailyKcalTarget !== undefined)
                patch.dailyKcalTarget = input.dailyKcalTarget;
            if (input.photoUrl !== undefined) patch.photoUrl = input.photoUrl;

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

    listPeople: protectedProcedure
        .input(getPetInput)
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select({
                    userId: petPeople.userId,
                    role: petPeople.role,
                    addedAt: petPeople.createdAt,
                })
                .from(petPeople)
                .where(eq(petPeople.petId, input.petId));
        }),

    removePerson: protectedProcedure
        .input(
            z.object({
                petId: z.number().int().positive(),
                userId: z.string().min(1),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can remove people.",
                });
            }
            if (input.userId === ctx.userId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot remove yourself; delete the pet instead.",
                });
            }
            const owners = await ctx.db
                .select({ userId: petPeople.userId })
                .from(petPeople)
                .where(
                    and(
                        eq(petPeople.petId, input.petId),
                        eq(petPeople.role, "Owner"),
                    ),
                );
            if (owners.length === 1 && owners[0]!.userId === input.userId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot remove the last Owner.",
                });
            }
            await ctx.db
                .delete(petPeople)
                .where(
                    and(
                        eq(petPeople.petId, input.petId),
                        eq(petPeople.userId, input.userId),
                    ),
                );
            return { ok: true as const };
        }),

    createInvite: protectedProcedure
        .input(
            z.object({
                petId: z.number().int().positive(),
                role: roleSchema,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can invite people.",
                });
            }
            if (input.role === "Owner") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invitations cannot grant the Owner role.",
                });
            }
            const token = randomUUID().replace(/-/g, "");
            const [row] = await ctx.db
                .insert(petInvites)
                .values({
                    token,
                    petId: input.petId,
                    role: input.role,
                    createdBy: ctx.userId,
                })
                .returning();
            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create invite.",
                });
            }
            return row;
        }),

    acceptInvite: protectedProcedure
        .input(z.object({ token: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const [invite] = await ctx.db
                .select()
                .from(petInvites)
                .where(eq(petInvites.token, input.token))
                .limit(1);
            if (!invite) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Invite not found.",
                });
            }
            if (invite.acceptedAt !== null) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invite already used.",
                });
            }
            await ctx.db
                .insert(users)
                .values({ id: ctx.userId })
                .onConflictDoNothing();
            await ctx.db.transaction(async (trx) => {
                await trx
                    .insert(petPeople)
                    .values({
                        userId: ctx.userId,
                        petId: invite.petId,
                        role: invite.role,
                    })
                    .onConflictDoNothing();
                await trx
                    .update(petInvites)
                    .set({ acceptedAt: new Date(), acceptedBy: ctx.userId })
                    .where(eq(petInvites.token, invite.token));
            });
            return { petId: invite.petId };
        }),
});
