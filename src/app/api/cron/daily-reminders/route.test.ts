import { beforeEach, describe, expect, it, vi } from "vitest";

// Mutable env the route reads inside GET; reset before each test.
const { mockEnv } = vi.hoisted(() => ({
    mockEnv: {} as Record<string, string | undefined>,
}));
vi.mock("~/env", () => ({ env: mockEnv }));

// The route imports db/Resend/clerkClient at module load. The guard-path
// tests never reach them; the "no pets" test only needs every query to
// resolve to an empty array.
vi.mock("~/server/db", () => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
        from: () => chain,
        where: () => chain,
        innerJoin: () => chain,
        orderBy: () => chain,
        limit: () => Promise.resolve([]),
        then: (onFulfilled: (rows: unknown[]) => unknown) =>
            Promise.resolve([]).then(onFulfilled),
    });
    return { db: { select: () => chain } };
});
vi.mock("resend", () => ({
    Resend: class {
        emails = { send: vi.fn() };
    },
}));
vi.mock("@clerk/nextjs/server", () => ({
    clerkClient: { users: { getUserList: vi.fn(async () => []) } },
}));

import { GET } from "./route";

const URL = "http://localhost/api/cron/daily-reminders";

beforeEach(() => {
    for (const key of Object.keys(mockEnv)) delete mockEnv[key];
});

describe("daily-reminders cron", () => {
    it("returns 401 when CRON_SECRET is set and the auth header is missing", async () => {
        mockEnv.CRON_SECRET = "s3cret";
        const res = await GET(new Request(URL));
        expect(res.status).toBe(401);
    });

    it("returns 401 when CRON_SECRET is set and the auth header is wrong", async () => {
        mockEnv.CRON_SECRET = "s3cret";
        const res = await GET(
            new Request(URL, {
                headers: { authorization: "Bearer wrong" },
            }),
        );
        expect(res.status).toBe(401);
    });

    it("no-ops with 200 when RESEND is not configured", async () => {
        // CRON_SECRET unset -> auth skipped; RESEND_API_KEY unset -> no-op.
        const res = await GET(new Request(URL));
        expect(res.status).toBe(200);
        expect(await res.text()).toMatch(/not configured/i);
    });

    it("no-ops when RESEND_FROM is missing even with an API key", async () => {
        mockEnv.RESEND_API_KEY = "re_test";
        const res = await GET(new Request(URL));
        expect(res.status).toBe(200);
        expect(await res.text()).toMatch(/not configured/i);
    });

    it("runs and returns empty summaries when configured with no pets", async () => {
        mockEnv.CRON_SECRET = "s3cret";
        mockEnv.RESEND_API_KEY = "re_test";
        mockEnv.RESEND_FROM = "noreply@example.com";
        const res = await GET(
            new Request(URL, {
                headers: { authorization: "Bearer s3cret" },
            }),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            summary: unknown[];
            appointmentSummary: unknown[];
        };
        expect(body.summary).toEqual([]);
        expect(body.appointmentSummary).toEqual([]);
    });
});
