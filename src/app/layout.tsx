import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Permanent_Marker, Caveat, Karla, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Marker for the few places that should look hand-lettered rather than typeset.
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Memory Holder",
  description: "A personal archive of your life together: firsts, highlights and fragments.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    // The init script stamps data-theme on <html> before hydration, so the
    // client tree legitimately differs from the server's here.
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${permanentMarker.variable} ${caveat.variable} ${karla.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
