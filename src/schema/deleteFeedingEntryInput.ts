import { z } from "zod";

export const deleteFeedingEntryInput = z.object({
    entryId: z.number().int().positive(),
});
