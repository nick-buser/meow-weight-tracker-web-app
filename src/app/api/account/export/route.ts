import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/server/db";
import {
    activityHistory,
    eatingHistory,
    healthEvents,
    petFood,
    petMeds,
    petNotes,
    petPeople,
    pets,
    userPreferences,
    weightHistory,
} from "~/server/db/schema";

export const dynamic = "force-dynamic";

/**
 * Full account data export: every pet the caller can see (with their
 * role) and all of its history, plus the caller's preferences. Returned
 * as a downloadable JSON file. Dates serialize to ISO via Date#toJSON.
 */
export async function GET() {
    const { userId } = auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const memberships = await db
        .select({ petId: petPeople.petId, role: petPeople.role })
        .from(petPeople)
        .where(eq(petPeople.userId, userId));
    const petIds = memberships.map((m) => m.petId);
    const roleByPet = new Map(memberships.map((m) => [m.petId, m.role]));

    const empty: never[] = [];
    const [
        petRows,
        weights,
        feedings,
        activities,
        health,
        notes,
        meds,
        prefsRows,
    ] = await Promise.all([
        petIds.length
            ? db.select().from(pets).where(inArray(pets.id, petIds))
            : empty,
        petIds.length
            ? db
                  .select()
                  .from(weightHistory)
                  .where(inArray(weightHistory.petId, petIds))
            : empty,
        petIds.length
            ? db
                  .select({
                      id: eatingHistory.id,
                      petId: eatingHistory.petId,
                      fedAt: eatingHistory.fedAt,
                      quantityGrams: eatingHistory.quantityGrams,
                      foodName: petFood.name,
                      foodBrand: petFood.brand,
                      caloriesPerGram: petFood.caloriesPerGram,
                      createdAt: eatingHistory.createdAt,
                  })
                  .from(eatingHistory)
                  .innerJoin(petFood, eq(eatingHistory.foodId, petFood.id))
                  .where(inArray(eatingHistory.petId, petIds))
            : empty,
        petIds.length
            ? db
                  .select()
                  .from(activityHistory)
                  .where(inArray(activityHistory.petId, petIds))
            : empty,
        petIds.length
            ? db
                  .select()
                  .from(healthEvents)
                  .where(inArray(healthEvents.petId, petIds))
            : empty,
        petIds.length
            ? db
                  .select()
                  .from(petNotes)
                  .where(inArray(petNotes.petId, petIds))
            : empty,
        petIds.length
            ? db.select().from(petMeds).where(inArray(petMeds.petId, petIds))
            : empty,
        db
            .select()
            .from(userPreferences)
            .where(eq(userPreferences.userId, userId)),
    ]);

    const byPet = <T extends { petId: number }>(rows: T[], id: number) =>
        rows.filter((r) => r.petId === id);

    const payload = {
        exportedAt: new Date().toISOString(),
        userId,
        preferences: prefsRows[0] ?? null,
        pets: petRows.map((pet) => ({
            ...pet,
            role: roleByPet.get(pet.id) ?? null,
            weights: byPet(weights, pet.id),
            feedings: byPet(feedings, pet.id),
            activities: byPet(activities, pet.id),
            healthEvents: byPet(health, pet.id),
            notes: byPet(notes, pet.id),
            meds: byPet(meds, pet.id),
        })),
    };

    const filename = `meow-export-${new Date().toISOString().slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
