import { z } from "zod";

export const getActivityHistoryInput = z.object({
    petId: z.number().int().positive(),
});
