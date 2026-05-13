import { z } from "zod";

export const updatePetInput = z.object({
    petId: z.number().int().positive(),
    name: z.string().min(1).max(128).optional(),
    species: z.string().min(1).max(64).optional(),
    gender: z.string().min(1).max(16).optional(),
    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
        .nullable()
        .optional(),
});

export type UpdatePetInput = z.infer<typeof updatePetInput>;
