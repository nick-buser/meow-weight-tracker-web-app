import { z } from "zod";

export const addPetPhotoInput = z.object({
    petId: z.number().int().positive(),
    url: z.string().url().max(1024),
    caption: z.string().max(256).optional(),
    takenAt: z.date().optional(),
});
