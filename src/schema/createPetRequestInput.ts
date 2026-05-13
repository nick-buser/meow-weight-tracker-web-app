import { z } from "zod";

export const createPetRequestInput = z.object({
    species: z.string().min(1).max(64),
    gender: z.string().min(1).max(16),
    name: z.string().min(1).max(128),
    // ISO date string (YYYY-MM-DD); optional if the owner doesn't know.
    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
        .optional(),
});

export type CreatePetRequestInput = z.infer<typeof createPetRequestInput>;
