"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPet"];

export function PetEditCard({ pet }: { pet: Pet }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(pet.name);
    const [species, setSpecies] = useState(pet.species);
    const [gender, setGender] = useState(pet.gender);
    const [birthDate, setBirthDate] = useState(pet.birthDate ?? "");
    const [goalWeight, setGoalWeight] = useState(
        pet.goalWeight !== null ? String(pet.goalWeight) : "",
    );
    const [dailyKcalTarget, setDailyKcalTarget] = useState(
        pet.dailyKcalTarget !== null ? String(pet.dailyKcalTarget) : "",
    );

    const utils = api.useUtils();
    const updatePet = api.pet.updatePet.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.pet.getPet.invalidate({ petId: pet.id }),
                utils.pet.getPets.invalidate(),
            ]);
            setEditing(false);
            toast.success(`${pet.name} updated`);
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const goal = goalWeight.trim() ? Number(goalWeight) : null;
        const kcal = dailyKcalTarget.trim() ? Number(dailyKcalTarget) : null;
        updatePet.mutate({
            petId: pet.id,
            name: name.trim(),
            species: species.trim(),
            gender: gender.trim(),
            birthDate: birthDate ? birthDate : null,
            goalWeight: goal,
            dailyKcalTarget: kcal,
        });
    }

    const canEdit = pet.role !== "Viewer";

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>{pet.name}</CardTitle>
                    <CardDescription>
                        {[
                            pet.species,
                            pet.gender,
                            ageLabel(pet.birthDate),
                            pet.goalWeight !== null
                                ? `goal ${pet.goalWeight.toFixed(2)}`
                                : null,
                            pet.dailyKcalTarget !== null
                                ? `${pet.dailyKcalTarget} kcal/day`
                                : null,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </CardDescription>
                </div>
                {canEdit && !editing && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                    </Button>
                )}
            </CardHeader>
            {editing && (
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="edit-species">Species</Label>
                                <select
                                    id="edit-species"
                                    value={species}
                                    onChange={(e) => setSpecies(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="Cat">Cat</option>
                                    <option value="Dog">Dog</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="edit-gender">Gender</Label>
                                <select
                                    id="edit-gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="Female">Female</option>
                                    <option value="Male">Male</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="edit-birth">Birth date</Label>
                            <Input
                                id="edit-birth"
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                max={new Date().toISOString().slice(0, 10)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label htmlFor="edit-goal">Goal weight</Label>
                                <Input
                                    id="edit-goal"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={goalWeight}
                                    onChange={(e) => setGoalWeight(e.target.value)}
                                    placeholder="—"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="edit-kcal">Daily kcal target</Label>
                                <Input
                                    id="edit-kcal"
                                    type="number"
                                    inputMode="numeric"
                                    step="1"
                                    min="0"
                                    value={dailyKcalTarget}
                                    onChange={(e) => setDailyKcalTarget(e.target.value)}
                                    placeholder="—"
                                />
                            </div>
                        </div>
                        {updatePet.error && (
                            <p className="text-sm text-destructive">
                                {updatePet.error.message}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditing(false)}
                                disabled={updatePet.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updatePet.isPending}>
                                {updatePet.isPending ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}
        </Card>
    );
}

function ageLabel(birthDate: string | null): string | null {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    const now = new Date();
    const months =
        (now.getFullYear() - born.getFullYear()) * 12 +
        (now.getMonth() - born.getMonth());
    if (months < 12) return `${months} mo old`;
    const years = Math.floor(months / 12);
    return `${years} yr old`;
}
