
// Input schema for fetching weight history
import {z} from "zod";

export const getWeightHistoryInput = z.object({
    petId: z.number(),
});