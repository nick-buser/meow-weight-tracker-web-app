"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cat, Plus, Utensils } from "lucide-react";

import { cn } from "~/lib/utils";

const TABS = [
    { href: "/dashboard", label: "Pets", icon: Cat, match: /^\/dashboard(?!\/foods)/ },
    {
        href: "/dashboard/pets/new",
        label: "Add",
        icon: Plus,
        match: /^\/dashboard\/pets\/new$/,
    },
    {
        href: "/dashboard/foods",
        label: "Foods",
        icon: Utensils,
        match: /^\/dashboard\/foods/,
    },
] as const;

export function BottomNav() {
    const pathname = usePathname();
    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
        >
            <ul className="mx-auto grid max-w-md grid-cols-3">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = tab.match.test(pathname);
                    return (
                        <li key={tab.href} className="contents">
                            <Link
                                href={tab.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                                    active
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "h-5 w-5",
                                        active && "text-primary",
                                    )}
                                />
                                {tab.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
