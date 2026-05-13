import { TopNav } from "~/app/_components/topnav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <main className="container mx-auto py-8">{children}</main>
        </div>
    );
}
