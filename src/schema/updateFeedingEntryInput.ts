import { z } from "zod";

export const updateFeedingEntryInput = z.object({
    entryId: z.number().int().positive(),
    foodId: z.number().int().positive().optional(),
    quantityGrams: z.number().int().positive().optional(),
    fedAt: z.date().optional(),
});
