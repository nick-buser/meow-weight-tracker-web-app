import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createPetRequestInput } from "~/schema/createPetRequestInput";
import { getPetInput } from "~/schema/getPetInput";
import { updatePetInput } from "~/schema/updatePetInput";
import { petInvites, petPeople, pets, users } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";
import { enforceRateLimit } from "~/server/api/ratelimit";

const roleSchema = z.enum(["Owner", "Editor", "Viewer"]);

export const petRouter = createTRPCRouter({
    insertPet: protectedProcedure
        .input(createPetRequestInput)
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit("insertPet", ctx.userId, 20, "1 h");
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

    listDeleted: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select({
                id: pets.id,
                name: pets.name,
                species: pets.species,
                photoUrl: pets.photoUrl,
                deletedAt: pets.deletedAt,
                role: petPeople.role,
            })
            .from(pets)
            .innerJoin(petPeople, eq(pets.id, petPeople.petId))
            .where(
                and(
                    eq(petPeople.userId, ctx.userId),
                    eq(petPeople.role, "Owner"),
                    isNotNull(pets.deletedAt),
                ),
            );
    }),

    restorePet: protectedProcedure
        .input(getPetInput)
        .mutation(async ({ ctx, input }) => {
            // assertPetAccess refuses deleted pets, so we check ownership manually here.
            const [access] = await ctx.db
                .select({ role: petPeople.role })
                .from(petPeople)
                .where(
                    and(
                        eq(petPeople.petId, input.petId),
                        eq(petPeople.userId, ctx.userId),
                    ),
                )
                .limit(1);
            if (!access || access.role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can restore a pet.",
                });
            }
            await ctx.db
                .update(pets)
                .set({ deletedAt: null, updatedAt: new Date() })
                .where(eq(pets.id, input.petId));
            return { ok: true as const };
        }),

    listPeople: protectedProcedure
        .input(getPetInput)
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            const rows = await ctx.db
                .select({
                    userId: petPeople.userId,
                    role: petPeople.role,
                    addedAt: petPeople.createdAt,
                })
                .from(petPeople)
                .where(eq(petPeople.petId, input.petId));

            // Best-effort Clerk profile fetch. If Clerk's API fails we still
            // return the rows with nullable profile fields rather than erroring.
            const userIds = rows.map((r) => r.userId);
            const profiles = new Map<
                string,
                {
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    email: string | null;
                }
            >();
            if (userIds.length > 0) {
                try {
                    const list = await clerkClient.users.getUserList({
                        userId: userIds,
                        limit: userIds.length,
                    });
                    const users = Array.isArray(list)
                        ? list
                        : ((list as { data?: unknown }).data ?? []);
                    for (const u of users as Array<{
                        id: string;
                        firstName: string | null;
                        lastName: string | null;
                        imageUrl: string | null;
                        emailAddresses: Array<{ emailAddress: string }>;
                        primaryEmailAddressId: string | null;
                    }>) {
                        const primary =
                            u.emailAddresses.find(
                                (e) =>
                                    (
                                        e as unknown as { id?: string }
                                    ).id === u.primaryEmailAddressId,
                            ) ?? u.emailAddresses[0];
                        profiles.set(u.id, {
                            firstName: u.firstName ?? null,
                            lastName: u.lastName ?? null,
                            imageUrl: u.imageUrl ?? null,
                            email: primary?.emailAddress ?? null,
                        });
                    }
                } catch (err) {
                    console.error("Clerk getUserList failed", err);
                }
            }

            return rows.map((r) => ({
                ...r,
                profile: profiles.get(r.userId) ?? null,
            }));
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
            await enforceRateLimit("createInvite", ctx.userId, 10, "1 h");
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
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const [row] = await ctx.db
                .insert(petInvites)
                .values({
                    token,
                    petId: input.petId,
                    role: input.role,
                    createdBy: ctx.userId,
                    expiresAt,
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

    listInvites: protectedProcedure
        .input(getPetInput)
        .query(async ({ ctx, input }) => {
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can list invites.",
                });
            }
            return ctx.db
                .select()
                .from(petInvites)
                .where(eq(petInvites.petId, input.petId));
        }),

    revokeInvite: protectedProcedure
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
            const role = await assertPetAccess(
                ctx.db,
                ctx.userId,
                invite.petId,
            );
            if (role !== "Owner") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only the Owner can revoke invites.",
                });
            }
            await ctx.db
                .update(petInvites)
                .set({ revokedAt: new Date() })
                .where(eq(petInvites.token, input.token));
            return { ok: true as const };
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
            if (invite.revokedAt !== null) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invite was revoked.",
                });
            }
            if (
                invite.expiresAt !== null &&
                invite.expiresAt.getTime() < Date.now()
            ) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invite has expired.",
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
