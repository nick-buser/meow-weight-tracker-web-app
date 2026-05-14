import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

const PHOTO_URL = "https://blob.example.com/pet-photos/7/123.jpg";

describe("photos router", () => {
    it("list returns photos for a pet the user can access", async () => {
        const caller = callerWith({
            selectRows: [
                // assertPetAccess
                [{ role: "Viewer" }],
                // photos.list query
                [
                    { id: 1, petId: 7, url: PHOTO_URL, caption: "Nap" },
                    { id: 2, petId: 7, url: PHOTO_URL, caption: null },
                ],
            ],
        });
        const rows = await caller.photos.list({ petId: 7 });
        expect(rows).toHaveLength(2);
    });

    it("list rejects when the user has no access", async () => {
        const caller = callerWith({ selectRows: [[]] });
        await expect(
            caller.photos.list({ petId: 7 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("add rejects a non-URL value", async () => {
        const caller = callerWith({});
        await expect(
            caller.photos.add({ petId: 7, url: "not-a-url" }),
        ).rejects.toBeDefined();
    });

    it("add rejects Viewer role", async () => {
        const caller = callerWith({ selectRows: [[{ role: "Viewer" }]] });
        await expect(
            caller.photos.add({ petId: 7, url: PHOTO_URL }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("add succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Editor" }]],
            insertRows: [{ id: 42, petId: 7, url: PHOTO_URL }],
        });
        const row = await caller.photos.add({ petId: 7, url: PHOTO_URL });
        expect((row as { id: number }).id).toBe(42);
    });

    it("remove returns NOT_FOUND when the photo is missing", async () => {
        const caller = callerWith({ selectRows: [[]] });
        await expect(
            caller.photos.remove({ photoId: 9999 }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("remove rejects Viewer role", async () => {
        const caller = callerWith({
            selectRows: [
                // loadPhoto
                [{ id: 5, petId: 7, url: PHOTO_URL }],
                // assertPetAccess
                [{ role: "Viewer" }],
            ],
        });
        await expect(
            caller.photos.remove({ photoId: 5 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("remove succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [
                [{ id: 5, petId: 7, url: PHOTO_URL }],
                [{ role: "Editor" }],
            ],
        });
        const result = await caller.photos.remove({ photoId: 5 });
        expect(result).toEqual({ ok: true });
    });

    it("setPrimary rejects Viewer role", async () => {
        const caller = callerWith({
            selectRows: [
                [{ id: 5, petId: 7, url: PHOTO_URL }],
                [{ role: "Viewer" }],
            ],
        });
        await expect(
            caller.photos.setPrimary({ photoId: 5 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("setPrimary succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [
                [{ id: 5, petId: 7, url: PHOTO_URL }],
                [{ role: "Editor" }],
            ],
        });
        const result = await caller.photos.setPrimary({ photoId: 5 });
        expect(result).toEqual({ ok: true });
    });
});
