import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
    activityHistory,
    eatingHistory,
    healthEvents,
    petFood,
    petNotes,
    weightHistory,
} from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

// A merged, newest-first view of everything that has happened to a pet:
// weigh-ins, feedings, activity, health events, and notes. Each kind keeps
// its own raw fields so the client can format them (e.g. weight in the
// viewer's preferred unit) and link back to the source card.
export const timelineRouter = createTRPCRouter({
    get: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            const petId = input.petId;

            const [weights, feedings, activities, healthRows, notes] =
                await Promise.all([
                    ctx.db
                        .select()
                        .from(weightHistory)
                        .where(eq(weightHistory.petId, petId)),
                    ctx.db
                        .select({
                            id: eatingHistory.id,
                            fedAt: eatingHistory.fedAt,
                            quantityGrams: eatingHistory.quantityGrams,
                            foodName: petFood.name,
                        })
                        .from(eatingHistory)
                        .innerJoin(
                            petFood,
                            eq(petFood.id, eatingHistory.foodId),
                        )
                        .where(eq(eatingHistory.petId, petId)),
                    ctx.db
                        .select()
                        .from(activityHistory)
                        .where(eq(activityHistory.petId, petId)),
                    ctx.db
                        .select()
                        .from(healthEvents)
                        .where(eq(healthEvents.petId, petId)),
                    ctx.db
                        .select()
                        .from(petNotes)
                        .where(eq(petNotes.petId, petId)),
                ]);

            const items = [
                ...weights.map((w) => ({
                    kind: "weight" as const,
                    id: w.id,
                    occurredAt: w.weighedAt,
                    weightKg: w.weight,
                })),
                ...feedings.map((f) => ({
                    kind: "feeding" as const,
                    id: f.id,
                    occurredAt: f.fedAt,
                    foodName: f.foodName,
                    quantityGrams: f.quantityGrams,
                })),
                ...activities.map((a) => ({
                    kind: "activity" as const,
                    id: a.id,
                    occurredAt: a.performedAt,
                    activityType: a.activityType,
                    durationMinutes: a.durationMinutes,
                    notes: a.notes,
                })),
                ...healthRows.map((h) => ({
                    kind: "health" as const,
                    id: h.id,
                    occurredAt: h.occurredAt,
                    eventType: h.eventType,
                    title: h.title,
                    notes: h.notes,
                })),
                ...notes.map((n) => ({
                    kind: "note" as const,
                    id: n.id,
                    occurredAt: n.writtenAt,
                    body: n.body,
                })),
            ];

            items.sort(
                (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
            );
            return items;
        }),
});
