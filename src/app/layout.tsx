
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: [
    {
      path: "../../public/fonts/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Geist-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Geist-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMono-Regular.woff2",
  weight: "400",
  variable: "--font-geist-mono",
  display: "swap",
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

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
