import { clerkClient } from "@clerk/nextjs/server";
import { and, count, eq, ne } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { petPeople, pets, userPreferences } from "~/server/db/schema";

export const accountRouter = createTRPCRouter({
    /**
     * Permanently deletes the caller's account: soft-deletes any pet they
     * solely own, drops every pet membership and their preferences, then
     * removes the Clerk user. The `users` tombstone row is intentionally
     * kept — petNotes / petInvites still FK to it.
     *
     * The DB work runs in one transaction; the Clerk deletion runs after
     * it commits. If Clerk deletion fails the caller can safely retry —
     * the DB steps are idempotent.
     */
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.userId;

        await ctx.db.transaction(async (trx) => {
            const memberships = await trx
                .select({ petId: petPeople.petId, role: petPeople.role })
                .from(petPeople)
                .where(eq(petPeople.userId, userId));

            for (const m of memberships) {
                if (m.role !== "Owner") continue;
                const [others] = await trx
                    .select({ n: count() })
                    .from(petPeople)
                    .where(
                        and(
                            eq(petPeople.petId, m.petId),
                            ne(petPeople.userId, userId),
                        ),
                    );
                // Only soft-delete a pet the caller solely owns; pets with
                // other people stay so co-owners keep their access.
                if ((others?.n ?? 0) === 0) {
                    await trx
                        .update(pets)
                        .set({ deletedAt: new Date() })
                        .where(eq(pets.id, m.petId));
                }
            }

            await trx
                .delete(petPeople)
                .where(eq(petPeople.userId, userId));
            await trx
                .delete(userPreferences)
                .where(eq(userPreferences.userId, userId));
        });

        await clerkClient.users.deleteUser(userId);

        return { ok: true as const };
    }),
});
