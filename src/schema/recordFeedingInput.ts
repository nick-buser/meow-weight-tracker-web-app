import { z } from "zod";
export const recordFeedingInput = z.object({
    petId: z.number(),
    foodId: z.number(),
    quantity: z.number(),
    fedAt: z.date().optional(), // Optional; defaults to now if not provided
});
