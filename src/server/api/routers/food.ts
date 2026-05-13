import { asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createFoodInput } from "~/schema/createFoodInput";
import { petFood } from "~/server/db/schema";

export const foodRouter = createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db
            .select()
            .from(petFood)
            .orderBy(asc(petFood.name));
    }),

    create: protectedProcedure
        .input(createFoodInput)
        .mutation(async ({ ctx, input }) => {
            const [row] = await ctx.db
                .insert(petFood)
                .values({
                    name: input.name,
                    brand: input.brand ?? null,
                    caloriesPerGram: input.caloriesPerGram,
                    proteinPercent: input.proteinPercent ?? null,
                    fatPercent: input.fatPercent ?? null,
                    carbsPercent: input.carbsPercent ?? null,
                    notes: input.notes ?? null,
                })
                .returning();

            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create the food entry",
                });
            }
            return row;
        }),
});
