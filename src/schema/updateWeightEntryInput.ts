import { z } from "zod";

export const updateWeightEntryInput = z.object({
    entryId: z.number().int().positive(),
    weight: z.number().positive().optional(),
    weighedAt: z.date().optional(),
});
