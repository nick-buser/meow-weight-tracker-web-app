import { TopNav } from "~/app/_components/topnav";
import { BottomNav } from "~/app/_components/bottom-nav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
            >
                Skip to content
            </a>
            <TopNav />
            <main
                id="main-content"
                className="container mx-auto py-6 pb-24 md:py-8 md:pb-8"
            >
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
