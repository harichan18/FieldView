import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FieldView — Live Camera + GPS Operations Dashboard",
  description:
    "Tactical real-time video streaming, high-accuracy GPS telemetry tracking, and collaborative geospatial mapping.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full bg-[#090a0f] text-zinc-100 antialiased selection:bg-teal-500/30 selection:text-teal-200`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#090a0f] text-zinc-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
