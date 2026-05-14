"use client";

import { useMemo } from "react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { type WeightUnit } from "~/lib/units";
import { api } from "~/trpc/react";

function listTimezones(): string[] {
    try {
        const supported = (
            Intl as typeof Intl & {
                supportedValuesOf?: (key: string) => string[];
            }
        ).supportedValuesOf?.("timeZone");
        if (supported && supported.length > 0) return supported;
    } catch {
        // fall through to the minimal list
    }
    return ["UTC"];
}

export function SettingsForm() {
    const utils = api.useUtils();
    const { data, isLoading } = api.preferences.get.useQuery();
    const timezones = useMemo(listTimezones, []);

    const update = api.preferences.update.useMutation({
        onMutate: async (patch) => {
            await utils.preferences.get.cancel();
            const previous = utils.preferences.get.getData();
            if (previous) {
                utils.preferences.get.setData(undefined, {
                    ...previous,
                    ...patch,
                });
            }
            return { previous };
        },
        onError: (err, _patch, ctx) => {
            if (ctx?.previous) {
                utils.preferences.get.setData(undefined, ctx.previous);
            }
            toast.error(err.message);
        },
        onSuccess: () => toast.success("Settings saved"),
        onSettled: () => void utils.preferences.get.invalidate(),
    });

    if (isLoading || !data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    const pending = update.isPending;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Units</CardTitle>
                    <CardDescription>
                        How weights are shown and entered. Stored values are
                        unaffected — only the display changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <Label htmlFor="weight-unit">Weight unit</Label>
                        <select
                            id="weight-unit"
                            value={data.weightUnit}
                            disabled={pending}
                            onChange={(e) =>
                                update.mutate({
                                    weightUnit: e.target.value as WeightUnit,
                                })
                            }
                            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="kg">Kilograms (kg)</option>
                            <option value="lb">Pounds (lb)</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Time zone</CardTitle>
                    <CardDescription>
                        Used for daily reminder timing and date grouping.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <Label htmlFor="timezone">Time zone</Label>
                        <select
                            id="timezone"
                            value={data.timezone}
                            disabled={pending}
                            onChange={(e) =>
                                update.mutate({ timezone: e.target.value })
                            }
                            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {timezones.includes(data.timezone) ? null : (
                                <option value={data.timezone}>
                                    {data.timezone}
                                </option>
                            )}
                            {timezones.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tz}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                        Email reminders for pets that haven&apos;t been fed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <label className="flex items-start gap-3 text-sm">
                        <input
                            type="checkbox"
                            checked={data.dailyRemindersEnabled}
                            disabled={pending}
                            onChange={(e) =>
                                update.mutate({
                                    dailyRemindersEnabled: e.target.checked,
                                })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-input"
                        />
                        <span>
                            <span className="font-medium">
                                Daily feeding reminders
                            </span>
                            <span className="block text-muted-foreground">
                                Get an email when a pet you can edit
                                hasn&apos;t been fed in a while.
                            </span>
                        </span>
                    </label>
                </CardContent>
            </Card>
        </div>
    );
}
