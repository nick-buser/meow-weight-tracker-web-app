import { z } from "zod";

export const recordFeedingInput = z.object({
    petId: z.number().int().positive(),
    foodId: z.number().int().positive(),
    quantityGrams: z.number().int().positive(),
    fedAt: z.date().optional(),
});
