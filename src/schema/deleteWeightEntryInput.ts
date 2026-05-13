import { z } from "zod";

export const deleteWeightEntryInput = z.object({
    entryId: z.number().int().positive(),
});
