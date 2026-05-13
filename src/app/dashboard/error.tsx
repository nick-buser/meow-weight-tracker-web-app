"use client";

import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="mx-auto max-w-md py-8">
            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="text-destructive">
                        Couldn&apos;t load this page
                    </CardTitle>
                    <CardDescription>
                        {error.message || "Unknown error."}
                        {error.digest && (
                            <span className="ml-2 text-xs">ref {error.digest}</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Button type="button" onClick={reset}>
                        Try again
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/dashboard">Back to dashboard</a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
