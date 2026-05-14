import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

// timeline.get consumes selectRows in this order: assertPetAccess, then the
// Promise.all of weights, feedings, activities, health events, notes.

describe("timeline router", () => {
    it("get rejects when the user has no access", async () => {
        const caller = callerWith({ selectRows: [[]] });
        await expect(
            caller.timeline.get({ petId: 7 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("get returns an empty timeline when there is no history", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Viewer" }], [], [], [], [], []],
        });
        const items = await caller.timeline.get({ petId: 7 });
        expect(items).toEqual([]);
    });

    it("get merges all five history kinds, newest first", async () => {
        const caller = callerWith({
            selectRows: [
                [{ role: "Viewer" }],
                // weights — 2026-01-01
                [{ id: 1, weighedAt: new Date("2026-01-01"), weight: 4.2 }],
                // feedings — 2026-01-02
                [
                    {
                        id: 2,
                        fedAt: new Date("2026-01-02"),
                        quantityGrams: 50,
                        foodName: "Tuna",
                    },
                ],
                // activities — 2026-01-03
                [
                    {
                        id: 3,
                        performedAt: new Date("2026-01-03"),
                        activityType: "Play",
                        durationMinutes: 15,
                        notes: null,
                    },
                ],
                // health events — 2026-01-04
                [
                    {
                        id: 4,
                        occurredAt: new Date("2026-01-04"),
                        eventType: "Vet visit",
                        title: "Checkup",
                        notes: null,
                    },
                ],
                // notes — 2026-01-05
                [
                    {
                        id: 5,
                        writtenAt: new Date("2026-01-05"),
                        body: "Good day",
                    },
                ],
            ],
        });
        const items = await caller.timeline.get({ petId: 7 });
        expect(items.map((i) => i.kind)).toEqual([
            "note",
            "health",
            "activity",
            "feeding",
            "weight",
        ]);
    });

    it("get sorts by date even when sources arrive out of order", async () => {
        const caller = callerWith({
            selectRows: [
                [{ role: "Editor" }],
                // weight — oldest
                [{ id: 1, weighedAt: new Date("2026-01-01"), weight: 4.2 }],
                // feeding — newest
                [
                    {
                        id: 2,
                        fedAt: new Date("2026-03-01"),
                        quantityGrams: 50,
                        foodName: "Tuna",
                    },
                ],
                [],
                [],
                // note — middle
                [{ id: 3, writtenAt: new Date("2026-02-01"), body: "Hi" }],
            ],
        });
        const items = await caller.timeline.get({ petId: 7 });
        expect(items.map((i) => i.kind)).toEqual([
            "feeding",
            "note",
            "weight",
        ]);
    });

    it("get maps kind-specific fields onto each item", async () => {
        const caller = callerWith({
            selectRows: [
                [{ role: "Viewer" }],
                [{ id: 1, weighedAt: new Date("2026-01-01"), weight: 4.2 }],
                [
                    {
                        id: 2,
                        fedAt: new Date("2026-01-02"),
                        quantityGrams: 50,
                        foodName: "Tuna",
                    },
                ],
                [],
                [],
                [],
            ],
        });
        const items = await caller.timeline.get({ petId: 7 });
        const weight = items.find((i) => i.kind === "weight");
        const feeding = items.find((i) => i.kind === "feeding");
        expect(weight).toMatchObject({ kind: "weight", id: 1, weightKg: 4.2 });
        expect(feeding).toMatchObject({
            kind: "feeding",
            id: 2,
            foodName: "Tuna",
            quantityGrams: 50,
        });
    });
});
