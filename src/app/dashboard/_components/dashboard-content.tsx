"use client";

import { useState } from "react";

import { PetPicker } from "~/app/dashboard/_components/pet-picker";
import { RecordFeedingDialog } from "~/app/dashboard/_components/record-feeding-dialog";
import { RecordWeightDialog } from "~/app/dashboard/_components/record-weight-dialog";
import { WeightChart } from "~/app/dashboard/_components/weight-chart";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPets"][number];

export function DashboardContent({ pets }: { pets: Pet[] }) {
    const [selectedId, setSelectedId] = useState<number>(pets[0]!.id);
    const selectedPet = pets.find((p) => p.id === selectedId) ?? pets[0]!;

    return (
        <div className="space-y-6">
            <PetPicker
                pets={pets}
                selectedId={selectedPet.id}
                onSelect={setSelectedId}
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <RecordWeightDialog pet={selectedPet} />
                <RecordFeedingDialog pet={selectedPet} />
            </div>
            <WeightChart petId={selectedPet.id} petName={selectedPet.name} />
        </div>
    );
}
