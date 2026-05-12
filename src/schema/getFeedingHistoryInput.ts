import { z } from "zod";

// Input schema for fetching feeding history
export const getFeedingHistoryInput = z.object({
    petId: z.number(),
});