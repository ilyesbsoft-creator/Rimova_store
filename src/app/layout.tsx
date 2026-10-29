
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
  title: {
    default: "RIMOVA | اكتشف أسلوبك الخاص",
    template: "%s | RIMOVA",
  },
  description:
    "مرحبًا بك في RIMOVA. اكتشف تجربة تسوق سهلة وأنيقة، واختر ما يناسب ذوقك واحتياجاتك.",
  applicationName: "RIMOVA",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  openGraph: {
    title: "RIMOVA | اكتشف أسلوبك الخاص",
    description:
      "اكتشف عالم RIMOVA واستمتع بتجربة تسوق سهلة وأنيقة.",
    siteName: "RIMOVA",
    locale: "ar_DZ",
    type: "website",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
