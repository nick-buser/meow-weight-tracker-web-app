import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function TopNav() {
    return (
        <nav className="flex w-full items-center justify-between border-b px-4 py-3">
            <Link href="/" className="text-lg font-semibold">
                🐾 Meow
            </Link>
            <div className="flex items-center gap-3">
                <SignedIn>
                    <Link
                        href="/dashboard"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Dashboard
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                    <SignInButton />
                </SignedOut>
            </div>
        </nav>
    );
}
