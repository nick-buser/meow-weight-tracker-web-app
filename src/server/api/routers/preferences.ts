import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { userPreferences, users } from "~/server/db/schema";

type PreferencesRow = typeof userPreferences.$inferSelect;

/**
 * Returns the caller's preferences row, creating it with defaults on first
 * access. `users` is upserted first because user_preferences.userId FKs to
 * it and the Clerk webhook that normally seeds `users` may not have fired
 * yet for a brand-new account.
 */
async function loadOrCreatePreferences(
    database: typeof db,
    userId: string,
): Promise<PreferencesRow> {
    const [existing] = await database
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
    if (existing) return existing;

    await database
        .insert(users)
        .values({ id: userId })
        .onConflictDoNothing();
    const [created] = await database
        .insert(userPreferences)
        .values({ userId })
        .onConflictDoNothing()
        .returning();
    if (created) return created;

    // Lost a race with a concurrent insert — re-read.
    const [row] = await database
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);
    if (!row) throw new Error("Failed to load preferences.");
    return row;
}

const updateInput = z.object({
    weightUnit: z.enum(["kg", "lb"]).optional(),
    timezone: z.string().min(1).max(64).optional(),
    dailyRemindersEnabled: z.boolean().optional(),
});

export const preferencesRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        return loadOrCreatePreferences(ctx.db, ctx.userId);
    }),

    update: protectedProcedure
        .input(updateInput)
        .mutation(async ({ ctx, input }) => {
            await loadOrCreatePreferences(ctx.db, ctx.userId);
            const patch: Partial<PreferencesRow> = { updatedAt: new Date() };
            if (input.weightUnit !== undefined) {
                patch.weightUnit = input.weightUnit;
            }
            if (input.timezone !== undefined) {
                patch.timezone = input.timezone;
            }
            if (input.dailyRemindersEnabled !== undefined) {
                patch.dailyRemindersEnabled = input.dailyRemindersEnabled;
            }
            const [row] = await ctx.db
                .update(userPreferences)
                .set(patch)
                .where(eq(userPreferences.userId, ctx.userId))
                .returning();
            if (!row) throw new Error("Failed to update preferences.");
            return row;
        }),
});
