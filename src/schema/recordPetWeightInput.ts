import { z } from "zod";

export const recordWeightInput = z.object({
    petId: z.number().int().positive(),
    weight: z.number().positive(),
    recordedAt: z.date().optional(),
});
