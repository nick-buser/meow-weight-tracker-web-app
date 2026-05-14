"use client";

import { type WeightUnit } from "~/lib/units";
import { api } from "~/trpc/react";

/**
 * The caller's preferred weight unit. Defaults to "kg" while preferences
 * load. React Query dedupes the underlying preferences.get fetch, so every
 * component using this hook shares one request + cache entry.
 */
export function useWeightUnit(): WeightUnit {
    const { data } = api.preferences.get.useQuery(undefined, {
        staleTime: 5 * 60 * 1000,
    });
    return data?.weightUnit ?? "kg";
}
