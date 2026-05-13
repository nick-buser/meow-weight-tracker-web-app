import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { type db } from "~/server/db";
import { petPeople, pets } from "~/server/db/schema";

/**
 * Throws FORBIDDEN if the user does not have a row in petPeople for the given pet,
 * or NOT_FOUND if the pet is soft-deleted (deletedAt IS NOT NULL).
 * Returns the user's role on success in case callers want to gate writes on it.
 */
export async function assertPetAccess(
    database: typeof db,
    userId: string,
    petId: number,
) {
    const rows = await database
        .select({ role: petPeople.role })
        .from(petPeople)
        .innerJoin(
            pets,
            and(eq(pets.id, petPeople.petId), isNull(pets.deletedAt)),
        )
        .where(and(eq(petPeople.petId, petId), eq(petPeople.userId, userId)))
        .limit(1);

    const access = rows[0];
    if (!access) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this pet.",
        });
    }
    return access.role;
}
