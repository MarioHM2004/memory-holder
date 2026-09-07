import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Permanent_Marker,
  Caveat,
  Karla,
  Space_Mono,
  ZCOOL_KuaiLe,
  Zhi_Mang_Xing,
} from "next/font/google";
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

// The Latin faces above carry no CJK glyphs, so Chinese fell through to
// whatever the system offered and the diary look vanished in that locale.
// These two carry the same spirit into Chinese: ZCOOL KuaiLe is the rounded,
// marker-like one, Zhi Mang Xing the brush handwriting. They're chained after
// their Latin counterparts in globals.css, so each script picks its own face
// even inside one sentence.
//
// preload is off deliberately: Google splits CJK into ~90 unicode-range
// chunks and the browser should fetch only the handful a page actually uses,
// rather than being told to preload them up front.
const zcoolKuaiLe = ZCOOL_KuaiLe({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-zcool-kuaile",
  preload: false,
});

const zhiMangXing = Zhi_Mang_Xing({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-zhi-mang-xing",
  preload: false,
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
      className={`${permanentMarker.variable} ${caveat.variable} ${karla.variable} ${spaceMono.variable} ${zcoolKuaiLe.variable} ${zhiMangXing.variable} h-full antialiased`}
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
