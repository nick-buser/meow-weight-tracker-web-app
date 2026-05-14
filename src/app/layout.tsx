import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";

import { TRPCReactProvider } from "~/trpc/react";
import {ClerkProvider} from "@clerk/nextjs";
import {SpeedInsights} from "@vercel/speed-insights/next";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/toaster";

export const metadata = {
  title: "Meow Weight Tracker",
  description: "Track your cat's weight, feedings, and habits.",
  manifest: "/site.webmanifest",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.svg" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "Meow",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <ClerkProvider>
          <html lang="en" suppressHydrationWarning className={`${GeistSans.variable}`}>
          <body>
          <ThemeProvider>
            <TRPCReactProvider>
                <SpeedInsights/>
                {children}
                <Toaster />
            </TRPCReactProvider>
          </ThemeProvider>
          </body>
          </html>
        </ClerkProvider>
  );
}
