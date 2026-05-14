import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const createContext = async (req: NextRequest) => {
    return createTRPCContext({
        headers: req.headers,
    });
};

const handler = (req: NextRequest) =>
    fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => createContext(req),
        onError: ({ path, error }) => {
            if (env.NODE_ENV === "development") {
                console.error(
                    `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
                );
            }
            // Internal errors only — expected 4xx (UNAUTHORIZED, FORBIDDEN,
            // BAD_REQUEST, NOT_FOUND, TOO_MANY_REQUESTS) aren't noise.
            const code = error.code;
            const isInternal =
                code === "INTERNAL_SERVER_ERROR" ||
                code === "PARSE_ERROR" ||
                code === undefined;
            if (isInternal) {
                Sentry.captureException(error, {
                    tags: { trpcPath: path ?? "unknown" },
                });
            }
        },
    });

export { handler as GET, handler as POST };
