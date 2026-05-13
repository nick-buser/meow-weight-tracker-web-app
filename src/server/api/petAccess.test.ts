import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";

import { assertPetAccess } from "./petAccess";

function makeMockDb(rows: Array<{ role: "Owner" | "Editor" | "Viewer" }>) {
    const chain = {
        select: () => chain,
        from: () => chain,
        innerJoin: () => chain,
        where: () => chain,
        limit: async () => rows,
    };
    return chain as unknown as Parameters<typeof assertPetAccess>[0];
}

describe("assertPetAccess", () => {
    it("returns the role when a row exists", async () => {
        const db = makeMockDb([{ role: "Editor" }]);
        await expect(assertPetAccess(db, "user_1", 42)).resolves.toBe(
            "Editor",
        );
    });

    it("throws FORBIDDEN when no row matches", async () => {
        const db = makeMockDb([]);
        await expect(assertPetAccess(db, "user_1", 42)).rejects.toBeInstanceOf(
            TRPCError,
        );
        try {
            await assertPetAccess(db, "user_1", 42);
        } catch (err) {
            expect(err).toBeInstanceOf(TRPCError);
            expect((err as TRPCError).code).toBe("FORBIDDEN");
        }
    });

    it("returns Owner role correctly", async () => {
        const db = makeMockDb([{ role: "Owner" }]);
        await expect(assertPetAccess(db, "u", 1)).resolves.toBe("Owner");
    });

    it("returns Viewer role correctly", async () => {
        const db = makeMockDb([{ role: "Viewer" }]);
        await expect(assertPetAccess(db, "u", 1)).resolves.toBe("Viewer");
    });
});
