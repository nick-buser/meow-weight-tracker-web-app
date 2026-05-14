"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    FoodBreakdownChart,
    KcalTrendChart,
    WeightChart,
    WeightStatsCard,
} from "~/app/dashboard/_components/lazy-charts";
import { PetAlerts } from "~/app/dashboard/_components/pet-alerts";
import { PetPicker } from "~/app/dashboard/_components/pet-picker";
import { RecordActivityDialog } from "~/app/dashboard/_components/record-activity-dialog";
import { RecordFeedingDialog } from "~/app/dashboard/_components/record-feeding-dialog";
import { RecordWeightDialog } from "~/app/dashboard/_components/record-weight-dialog";
import { TodayActivity } from "~/app/dashboard/_components/today-activity";
import { TodayFeedings } from "~/app/dashboard/_components/today-feedings";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPets"][number];

export function DashboardContent({ pets }: { pets: Pet[] }) {
    const [selectedId, setSelectedId] = useState<number>(pets[0]!.id);
    const selectedPet = pets.find((p) => p.id === selectedId) ?? pets[0]!;

    return (
        <div className="space-y-6">
            <h1 className="sr-only">Pet dashboard</h1>
            <PetAlerts petId={selectedPet.id} petName={selectedPet.name} />
            <PetPicker
                pets={pets}
                selectedId={selectedPet.id}
                onSelect={setSelectedId}
            />
            <div className="flex justify-end">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/pets/${selectedPet.id}`}>
                        {selectedPet.name}&apos;s details
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
                <RecordWeightDialog pet={selectedPet} />
                <RecordFeedingDialog pet={selectedPet} />
                <RecordActivityDialog pet={selectedPet} />
            </div>
            <TodayFeedings
                petId={selectedPet.id}
                petName={selectedPet.name}
                dailyKcalTarget={selectedPet.dailyKcalTarget}
                canEdit={selectedPet.role !== "Viewer"}
            />
            <KcalTrendChart
                petId={selectedPet.id}
                petName={selectedPet.name}
                dailyKcalTarget={selectedPet.dailyKcalTarget}
            />
            <FoodBreakdownChart
                petId={selectedPet.id}
                petName={selectedPet.name}
            />
            <TodayActivity
                petId={selectedPet.id}
                petName={selectedPet.name}
                canEdit={selectedPet.role !== "Viewer"}
            />
            <WeightStatsCard
                petId={selectedPet.id}
                petName={selectedPet.name}
                goalWeight={selectedPet.goalWeight}
            />
            <WeightChart
                petId={selectedPet.id}
                petName={selectedPet.name}
                goalWeight={selectedPet.goalWeight}
            />
        </div>
    );
}
