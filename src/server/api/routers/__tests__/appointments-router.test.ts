import { describe, expect, it } from "vitest";

import { createCaller } from "~/server/api/root";
import { makeStubDb, type StubScenario } from "./mock-db";

function callerWith(scenario: StubScenario, userId = "u_1") {
    const db = makeStubDb(scenario);
    return createCaller({ db, userId, headers: new Headers() });
}

const SCHEDULED_FOR = new Date("2026-06-01T10:00:00Z");

describe("appointments router", () => {
    it("list returns appointments for an accessible pet", async () => {
        const caller = callerWith({
            selectRows: [
                // assertPetAccess
                [{ role: "Viewer" }],
                // appointments.list query
                [
                    { id: 1, petId: 7, title: "Checkup", status: "Scheduled" },
                    { id: 2, petId: 7, title: "Grooming", status: "Completed" },
                ],
            ],
        });
        const rows = await caller.appointments.list({ petId: 7 });
        expect(rows).toHaveLength(2);
    });

    it("list rejects when the user has no access", async () => {
        const caller = callerWith({ selectRows: [[]] });
        await expect(
            caller.appointments.list({ petId: 7 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("create rejects Viewer role", async () => {
        const caller = callerWith({ selectRows: [[{ role: "Viewer" }]] });
        await expect(
            caller.appointments.create({
                petId: 7,
                title: "Annual checkup",
                appointmentType: "Vet visit",
                scheduledFor: SCHEDULED_FOR,
            }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("create succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ role: "Editor" }]],
            insertRows: [{ id: 42, petId: 7, title: "Annual checkup" }],
        });
        const row = await caller.appointments.create({
            petId: 7,
            title: "Annual checkup",
            appointmentType: "Vet visit",
            scheduledFor: SCHEDULED_FOR,
        });
        expect((row as { id: number }).id).toBe(42);
    });

    it("create rejects a non-Date scheduledFor", async () => {
        const caller = callerWith({});
        await expect(
            caller.appointments.create({
                petId: 7,
                title: "Annual checkup",
                appointmentType: "Vet visit",
                // @ts-expect-error - scheduledFor must be a Date
                scheduledFor: "2026-06-01",
            }),
        ).rejects.toBeDefined();
    });

    it("updateEntry returns NOT_FOUND when the appointment is missing", async () => {
        const caller = callerWith({ selectRows: [[]] });
        await expect(
            caller.appointments.updateEntry({
                appointmentId: 9999,
                title: "Rescheduled",
            }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("updateEntry rejects Viewer role", async () => {
        const caller = callerWith({
            selectRows: [
                // loadAppointmentPetId
                [{ petId: 7 }],
                // assertPetAccess
                [{ role: "Viewer" }],
            ],
        });
        await expect(
            caller.appointments.updateEntry({
                appointmentId: 5,
                title: "Rescheduled",
            }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("updateEntry succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ petId: 7 }], [{ role: "Editor" }]],
            updateRows: [{ id: 5, title: "Rescheduled" }],
        });
        const row = await caller.appointments.updateEntry({
            appointmentId: 5,
            title: "Rescheduled",
        });
        expect((row as { id: number }).id).toBe(5);
    });

    it("setStatus rejects Viewer role", async () => {
        const caller = callerWith({
            selectRows: [[{ petId: 7 }], [{ role: "Viewer" }]],
        });
        await expect(
            caller.appointments.setStatus({
                appointmentId: 5,
                status: "Completed",
            }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("setStatus succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ petId: 7 }], [{ role: "Editor" }]],
        });
        const result = await caller.appointments.setStatus({
            appointmentId: 5,
            status: "Completed",
        });
        expect(result).toEqual({ ok: true });
    });

    it("setStatus rejects an invalid status", async () => {
        const caller = callerWith({});
        await expect(
            caller.appointments.setStatus({
                appointmentId: 5,
                // @ts-expect-error - status must be a known enum value
                status: "Maybe",
            }),
        ).rejects.toBeDefined();
    });

    it("deleteEntry rejects Viewer role", async () => {
        const caller = callerWith({
            selectRows: [[{ petId: 7 }], [{ role: "Viewer" }]],
        });
        await expect(
            caller.appointments.deleteEntry({ appointmentId: 5 }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("deleteEntry succeeds for Editor", async () => {
        const caller = callerWith({
            selectRows: [[{ petId: 7 }], [{ role: "Editor" }]],
        });
        const result = await caller.appointments.deleteEntry({
            appointmentId: 5,
        });
        expect(result).toEqual({ ok: true });
    });
});
