import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "~/components/theme-toggle";

export function TopNav() {
    return (
        <nav className="flex w-full items-center justify-between border-b px-4 py-3 print:hidden">
            <Link href="/" className="text-lg font-semibold">
                🐾 Meow
            </Link>
            <div className="flex items-center gap-3">
                <SignedIn>
                    <Link
                        href="/dashboard"
                        className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/dashboard/foods"
                        className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
                    >
                        Foods
                    </Link>
                    <Link
                        href="/dashboard/pets/deleted"
                        className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
                    >
                        Deleted
                    </Link>
                    <Link
                        href="/dashboard/settings"
                        className="hidden text-sm text-muted-foreground hover:text-foreground md:inline"
                    >
                        Settings
                    </Link>
                    <ThemeToggle />
                    <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                    <ThemeToggle />
                    <SignInButton />
                </SignedOut>
            </div>
        </nav>
    );
}
