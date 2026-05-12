
// Input schema for recording a weight entry
import {z} from "zod";

export const recordWeightInput = z.object({
    petId: z.number(),
    weight: z.number(),
    recordedAt: z.date().optional(), // Optional; defaults to now if not provided
});
