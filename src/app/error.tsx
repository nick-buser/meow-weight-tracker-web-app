"use client";

import { useEffect } from "react";

import { Button } from "~/components/ui/button";

export default function GlobalError({
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
        <div className="container mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
                {error.message || "Unknown error."}
                {error.digest && (
                    <span className="block text-xs">ref {error.digest}</span>
                )}
            </p>
            <div className="flex gap-2">
                <Button type="button" onClick={reset}>
                    Try again
                </Button>
                <Button asChild variant="outline">
                    <a href="/dashboard">Back to dashboard</a>
                </Button>
            </div>
        </div>
    );
}
