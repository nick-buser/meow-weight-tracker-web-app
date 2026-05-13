"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPets"][number];

export function PetPicker({ pets }: { pets: Pet[] }) {
    const [selectedId, setSelectedId] = useState<number>(pets[0]!.id);

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your cats</h2>
                <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/pets/new">
                        <Plus className="mr-1 h-4 w-4" />
                        Add cat
                    </Link>
                </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {pets.map((pet) => {
                    const isSelected = pet.id === selectedId;
                    return (
                        <button
                            key={pet.id}
                            onClick={() => setSelectedId(pet.id)}
                            className="text-left"
                        >
                            <Card
                                className={cn(
                                    "transition-colors hover:bg-accent",
                                    isSelected && "border-primary ring-2 ring-primary/30",
                                )}
                            >
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-base font-semibold">
                                        {pet.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium">{pet.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {[pet.species, ageLabel(pet.birthDate)]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ageLabel(birthDate: string | null): string | null {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    const now = new Date();
    const months =
        (now.getFullYear() - born.getFullYear()) * 12 +
        (now.getMonth() - born.getMonth());
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    return `${years} yr`;
}
