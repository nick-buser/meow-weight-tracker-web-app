import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

describe("preferences router", () => {
    it("get returns the existing row", async () => {
        const caller = callerWith({
            selectRows: [
                [
                    {
                        userId: "u_1",
                        weightUnit: "lb",
                        timezone: "America/New_York",
                        dailyRemindersEnabled: false,
                    },
                ],
            ],
        });
        const prefs = await caller.preferences.get();
        expect(prefs.weightUnit).toBe("lb");
        expect(prefs.dailyRemindersEnabled).toBe(false);
    });

    it("get lazily creates a default row when none exists", async () => {
        const caller = callerWith({
            // first select misses, then the insert returns the new row
            selectRows: [[]],
            insertRows: [
                {
                    userId: "u_1",
                    weightUnit: "kg",
                    timezone: "UTC",
                    dailyRemindersEnabled: true,
                },
            ],
        });
        const prefs = await caller.preferences.get();
        expect(prefs.weightUnit).toBe("kg");
        expect(prefs.timezone).toBe("UTC");
    });

    it("update rejects an invalid weight unit", async () => {
        const caller = callerWith({ selectRows: [[{ userId: "u_1" }]] });
        await expect(
            // @ts-expect-error - deliberately invalid enum value
            caller.preferences.update({ weightUnit: "stone" }),
        ).rejects.toBeDefined();
    });

    it("update persists a patched field", async () => {
        const caller = callerWith({
            selectRows: [[{ userId: "u_1", weightUnit: "kg" }]],
            updateRows: [{ userId: "u_1", weightUnit: "lb" }],
        });
        const row = await caller.preferences.update({ weightUnit: "lb" });
        expect((row as { weightUnit: string }).weightUnit).toBe("lb");
    });
});
