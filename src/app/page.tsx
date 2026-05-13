import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { Button } from "~/components/ui/button";
import { TopNav } from "~/app/_components/topnav";

export default function Home() {
    const { userId } = auth();
    if (userId) redirect("/dashboard");

    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <main className="container mx-auto flex flex-col items-center justify-center py-24 text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    Meow Weight Tracker
                </h1>
                <p className="mt-4 max-w-md text-muted-foreground">
                    Track your cat&apos;s weight, feedings, and habits. Built for owners
                    helping their cats hit a healthy weight.
                </p>
                <div className="mt-8 flex gap-3">
                    <SignInButton>
                        <Button variant="outline">Sign in</Button>
                    </SignInButton>
                    <SignUpButton>
                        <Button>Get started</Button>
                    </SignUpButton>
                </div>
            </main>
        </div>
    );
}
