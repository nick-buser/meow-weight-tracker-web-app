import Link from "next/link";
import { Activity, ArrowRight, Scale, Users, Utensils } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";

const HIGHLIGHTS = [
    {
        icon: Scale,
        title: "Track weight",
        body: "Log readings and watch the trend toward a goal weight.",
    },
    {
        icon: Utensils,
        title: "Log feedings",
        body: "Record meals and keep an eye on daily calories.",
    },
    {
        icon: Activity,
        title: "Note activity & health",
        body: "Walks, play, vet visits, meds — all in one place.",
    },
    {
        icon: Users,
        title: "Share with family",
        body: "Invite others to help track a pet you care for together.",
    },
] as const;

/**
 * First-run experience shown on the dashboard when the account has no
 * pets yet. Orients the user and funnels them into the add-pet form.
 */
export function OnboardingWelcome() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="space-y-2 text-center">
                <div className="text-4xl">🐾</div>
                <h1 className="text-2xl font-semibold">Welcome to Meow</h1>
                <p className="text-muted-foreground">
                    Keep your pet&apos;s weight, meals, and health in one
                    simple place. Start by adding your first pet.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {HIGHLIGHTS.map((h) => {
                    const Icon = h.icon;
                    return (
                        <Card key={h.title}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Icon className="h-4 w-4 text-primary" />
                                    {h.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{h.body}</CardDescription>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex flex-col items-center gap-2">
                <Button asChild size="lg">
                    <Link href="/dashboard/pets/new">
                        Add your first pet
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                    Takes about a minute. You can edit everything later.
                </p>
            </div>
        </div>
    );
}
