import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SafeGenerations OTP People and Users Management & Mapping Tool",
  description:
    "SafeGenerations platform for managing OTP people records, user relationships, and database mappings.",
  openGraph: {
    title: "SafeGenerations OTP People and Users Management & Mapping Tool",
    description:
      "SafeGenerations platform for managing OTP people records, user relationships, and database mappings.",
    type: "website",
    images: [
      {
        url: "/safegenerations-logo.svg",
        width: 120,
        height: 120,
        alt: "SafeGenerations logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeGenerations OTP People and Users Management & Mapping Tool",
    description:
      "SafeGenerations platform for managing OTP people records, user relationships, and database mappings.",
    images: ["/safegenerations-logo.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.svg" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
