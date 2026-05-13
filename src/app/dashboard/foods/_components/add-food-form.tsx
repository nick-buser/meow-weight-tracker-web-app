"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

export function AddFoodForm() {
    const utils = api.useUtils();
    const [name, setName] = useState("");
    const [brand, setBrand] = useState("");
    const [caloriesPerGram, setCaloriesPerGram] = useState("");
    const [protein, setProtein] = useState("");
    const [fat, setFat] = useState("");
    const [carbs, setCarbs] = useState("");
    const [notes, setNotes] = useState("");

    const createFood = api.food.create.useMutation({
        onSuccess: async (food) => {
            await utils.food.list.invalidate();
            setName("");
            setBrand("");
            setCaloriesPerGram("");
            setProtein("");
            setFat("");
            setCarbs("");
            setNotes("");
            toast.success(`${food.name} added`);
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const cals = Number(caloriesPerGram);
        if (!Number.isFinite(cals) || cals <= 0) return;
        createFood.mutate({
            name: name.trim(),
            caloriesPerGram: cals,
            ...(brand ? { brand: brand.trim() } : {}),
            ...(protein ? { proteinPercent: Number(protein) } : {}),
            ...(fat ? { fatPercent: Number(fat) } : {}),
            ...(carbs ? { carbsPercent: Number(carbs) } : {}),
            ...(notes ? { notes: notes.trim() } : {}),
        });
    }

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
                <Label htmlFor="food-name">Name</Label>
                <Input
                    id="food-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adult Indoor"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="food-brand">Brand</Label>
                <Input
                    id="food-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Royal Canin"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="food-cals">kcal per gram</Label>
                <Input
                    id="food-cals"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    value={caloriesPerGram}
                    onChange={(e) => setCaloriesPerGram(e.target.value)}
                    placeholder="3.65"
                />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <MacroField id="food-p" label="Protein %" value={protein} onChange={setProtein} />
                <MacroField id="food-f" label="Fat %" value={fat} onChange={setFat} />
                <MacroField id="food-c" label="Carbs %" value={carbs} onChange={setCarbs} />
            </div>
            <div className="space-y-1">
                <Label htmlFor="food-notes">Notes</Label>
                <Input
                    id="food-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                />
            </div>
            {createFood.error && (
                <p className="text-sm text-destructive">
                    {createFood.error.message}
                </p>
            )}
            <Button type="submit" disabled={createFood.isPending} className="w-full">
                {createFood.isPending ? "Saving…" : "Add food"}
            </Button>
        </form>
    );
}

function MacroField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-1">
            <Label htmlFor={id} className="text-xs">
                {label}
            </Label>
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="100"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="—"
            />
        </div>
    );
}
