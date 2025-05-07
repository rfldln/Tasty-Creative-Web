import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tasty Creative",
  description: "Admin dashboard for Tasty Creative",
  icons: {
    icon: "/tasty-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={<></>}>{children}</Suspense>
        </Providers>
        <Toaster theme="dark" className="dark" />
      </body>
    </html>
  );
}
