import { type db as RealDb } from "~/server/db";

/**
 * Tiny stubbed db for router unit tests. Each call returns a thenable
 * chain that resolves to the rows passed in the scenario for whichever
 * query shape the router uses next.
 *
 * `selectRows` is a FIFO queue, so multi-step routers (loadEntryPetId
 * then assertPetAccess) get rows in the order the code asks for them.
 */
export type StubScenario = {
    selectRows?: unknown[][];
    insertRows?: unknown[];
    updateRows?: unknown[];
};

export type StubDb = typeof RealDb;

export function makeStubDb(scenario: StubScenario) {
    const selectQueue = [...(scenario.selectRows ?? [])];

    function selectChain() {
        const chain = {
            from: () => chain,
            innerJoin: () => chain,
            where: () => chain,
            orderBy: () => chain,
            limit: () => {
                const next = selectQueue.shift() ?? [];
                return Promise.resolve(next);
            },
            then: (
                onFulfilled?: (rows: unknown[]) => unknown,
                onRejected?: (reason: unknown) => unknown,
            ) => {
                const next = selectQueue.shift() ?? [];
                return Promise.resolve(next).then(onFulfilled, onRejected);
            },
        };
        return chain;
    }

    return {
        select: () => selectChain(),
        insert: () => ({
            values: () => {
                const rows = () =>
                    Promise.resolve(scenario.insertRows ?? [{ id: 1 }]);
                // Chainable + thenable: supports values().returning(),
                // values().onConflictDoNothing() (awaited directly), and
                // values().onConflictDoNothing().returning().
                const valuesChain = {
                    returning: rows,
                    onConflictDoNothing: () => valuesChain,
                    then: (
                        onFulfilled?: (rows: unknown[]) => unknown,
                        onRejected?: (reason: unknown) => unknown,
                    ) => rows().then(onFulfilled, onRejected),
                };
                return valuesChain;
            },
        }),
        update: () => ({
            set: () => ({
                where: () => ({
                    returning: () =>
                        Promise.resolve(scenario.updateRows ?? [{ id: 1 }]),
                    then: (
                        onFulfilled?: (v: unknown) => unknown,
                        onRejected?: (reason: unknown) => unknown,
                    ) =>
                        Promise.resolve(undefined).then(
                            onFulfilled,
                            onRejected,
                        ),
                }),
            }),
        }),
        delete: () => ({
            where: () => Promise.resolve(undefined),
        }),
        transaction: async (cb: (trx: unknown) => Promise<unknown>) =>
            cb(makeStubDb(scenario)),
    } as unknown as StubDb;
}
