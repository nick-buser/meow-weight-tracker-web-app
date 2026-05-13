import { z } from "zod";

export const getFeedingHistoryInput = z.object({
    petId: z.number().int().positive(),
});
