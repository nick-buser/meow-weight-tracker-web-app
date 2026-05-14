"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "~/components/ui/skeleton";

/**
 * Recharts ships a big bundle (~140kB gzipped) and we never need it on the
 * server, so dynamic-import each chart with ssr: false. The skeleton
 * keeps the layout stable while the chunk lands.
 */

export const WeightChart = dynamic(
    () =>
        import("./weight-chart").then((m) => ({
            default: m.WeightChart,
        })),
    { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

export const KcalTrendChart = dynamic(
    () =>
        import("./kcal-trend-chart").then((m) => ({
            default: m.KcalTrendChart,
        })),
    { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);

export const FoodBreakdownChart = dynamic(
    () =>
        import("./food-breakdown-chart").then((m) => ({
            default: m.FoodBreakdownChart,
        })),
    { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

export const WeightStatsCard = dynamic(
    () =>
        import("./weight-stats-card").then((m) => ({
            default: m.WeightStatsCard,
        })),
    { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> },
);

export const WeightComparison = dynamic(
    () =>
        import("./weight-comparison").then((m) => ({
            default: m.WeightComparison,
        })),
    { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> },
);
