"use client";

import { useState } from "react";

import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { PetPicker } from "~/app/dashboard/_components/pet-picker";
import { RecordWeightDialog } from "~/app/dashboard/_components/record-weight-dialog";
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
                <Card aria-disabled className="opacity-60">
                    <CardHeader>
                        <CardTitle>Log feeding</CardTitle>
                        <CardDescription>
                            Coming soon: pick a food, enter grams, done.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
