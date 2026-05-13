import { z } from "zod";

export const getPetInput = z.object({
    petId: z.number().int().positive(),
});
