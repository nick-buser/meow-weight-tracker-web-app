import { z } from "zod";

export const getWeightHistoryInput = z.object({
    petId: z.number().int().positive(),
});
