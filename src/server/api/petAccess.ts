import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { type db } from "~/server/db";
import { PetPeople } from "~/server/db/schema";

/**
 * Throws FORBIDDEN if the user does not have a row in PetPeople for the given pet.
 * Returns the user's role on success in case callers want to gate writes on it.
 */
export async function assertPetAccess(
  database: typeof db,
  userId: string,
  petId: number,
) {
  const rows = await database
    .select({ role: PetPeople.Role })
    .from(PetPeople)
    .where(and(eq(PetPeople.PetID, petId), eq(PetPeople.UserID, userId)))
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
