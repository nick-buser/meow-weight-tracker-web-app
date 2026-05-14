"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-9 w-9" aria-hidden />;
    }

    function next() {
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("system");
        else setTheme("light");
    }

    const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
    const label =
        theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

    return (
        <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={next}
            aria-label={`Theme: ${label}`}
            title={`Theme: ${label}`}
            className={cn("h-9 w-9")}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );
}
