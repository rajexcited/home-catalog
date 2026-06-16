import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://home-catalog.vercel.app"),
  title: "Home Catalog",
  description: "A mobile-first home inventory PWA for organizing containers, items, and photos.",
  applicationName: "Home Catalog",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Home Catalog"
  },
  formatDetection: {
    telephone: false
  },
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}
