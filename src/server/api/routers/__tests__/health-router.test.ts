import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

describe("health router", () => {
    it("record rejects Viewer role", async () => {
        const caller = callerWith({
            // assertPetAccess returns Viewer
            selectRows: [[{ role: "Viewer" }]],
        });
        await expect(
            caller.health.record({
                petId: 7,
                eventType: "Vet visit",
                title: "Checkup",
            }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("record succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Editor" }]],
            insertRows: [{ id: 99, petId: 7, eventType: "Vet visit" }],
        });
        const result = await caller.health.record({
            petId: 7,
            eventType: "Vet visit",
            title: "Checkup",
        });
        expect((result as { id: number }).id).toBe(99);
    });

    it("deleteEntry rejects Viewer", async () => {
        const caller = callerWith({
            // loadEntryPetId (returns petId), then assertPetAccess (returns role)
            selectRows: [[{ petId: 7 }], [{ role: "Viewer" }]],
        });
        await expect(
            caller.health.deleteEntry({ entryId: 42 }),
        ).rejects.toBeInstanceOf(TRPCError);
    });

    it("deleteEntry NOT_FOUND when entry missing", async () => {
        const caller = callerWith({
            selectRows: [[]],
        });
        await expect(
            caller.health.deleteEntry({ entryId: 9999 }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
});
