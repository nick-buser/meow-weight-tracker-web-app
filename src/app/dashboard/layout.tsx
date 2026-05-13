import { TopNav } from "~/app/_components/topnav";
import { BottomNav } from "~/app/_components/bottom-nav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <main className="container mx-auto py-6 pb-24 md:py-8 md:pb-8">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
