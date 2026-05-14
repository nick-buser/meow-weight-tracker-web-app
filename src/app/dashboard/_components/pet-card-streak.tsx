"use client";

import { Flame } from "lucide-react";

import { computeFeedingStreak } from "~/lib/feeding-streak";
import { api } from "~/trpc/react";

export function PetCardStreak({ petId }: { petId: number }) {
    const { data } = api.feeding.getFeedingHistory.useQuery({ petId });
    if (!data) return null;
    const streak = computeFeedingStreak(data);
    if (streak === 0) return null;
    return (
        <span className="ml-auto flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-600">
            <Flame className="h-3 w-3" />
            {streak}d
        </span>
    );
}
