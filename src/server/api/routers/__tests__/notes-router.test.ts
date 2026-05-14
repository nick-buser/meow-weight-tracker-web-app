import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

describe("notes router", () => {
    it("record rejects Viewer", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Viewer" }]],
        });
        await expect(
            caller.notes.record({ petId: 1, body: "hi" }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("record succeeds for Owner", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Owner" }]],
            insertRows: [{ id: 5, petId: 1, body: "hi" }],
        });
        const out = await caller.notes.record({ petId: 1, body: "hi" });
        expect((out as { id: number }).id).toBe(5);
    });

    it("getNotes resolves for Viewer (read-only)", async () => {
        const caller = callerWith({
            // assertPetAccess returns Viewer, then the SELECT returns []
            selectRows: [[{ role: "Viewer" }], []],
        });
        const rows = await caller.notes.getNotes({ petId: 1 });
        expect(rows).toEqual([]);
    });
});
