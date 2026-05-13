"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export function NewPetForm() {
    const router = useRouter();
    const utils = api.useUtils();
    const [name, setName] = useState("");
    const [species, setSpecies] = useState("Cat");
    const [gender, setGender] = useState("Female");
    const [birthDate, setBirthDate] = useState("");

    const createPet = api.pet.insertPet.useMutation({
        onSuccess: async (pet) => {
            await utils.pet.getPets.invalidate();
            router.push("/dashboard");
            router.refresh();
            toast.success(`${pet.name} added`);
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        createPet.mutate({
            name: name.trim(),
            species: species.trim(),
            gender: gender.trim(),
            ...(birthDate ? { birthDate } : {}),
        });
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    required
                    minLength={1}
                    maxLength={128}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Whiskers"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="species">Species</Label>
                <select
                    id="species"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="Cat">Cat</option>
                    <option value="Dog">Dog</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Unknown">Unknown</option>
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="birthDate">Birth date (optional)</Label>
                <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                />
            </div>

            {createPet.error && (
                <p className="text-sm text-destructive">
                    {createPet.error.message}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    disabled={createPet.isPending}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={createPet.isPending}>
                    {createPet.isPending ? "Saving…" : "Add cat"}
                </Button>
            </div>
        </form>
    );
}
