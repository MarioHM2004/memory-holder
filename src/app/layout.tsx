import type { Metadata, Viewport } from "next";
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
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { themeInitScript } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";
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

// Installed on a phone there is no address bar, so the status bar above the
// page takes this colour. One value per scheme, matching --ground, keeps it
// from being a white band over a dark diary.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#171612" },
  ],
};

// Built per request rather than as a constant, so the title and description
// — the two lines a search result or a pasted link shows — come out in the
// reader's language.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");

  return {
    // Without this, every relative URL below (the social card among them)
    // would be resolved against localhost at build time.
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s · Memory Holder" },
    description: t("description"),
    applicationName: "Memory Holder",
    openGraph: {
      type: "website",
      siteName: "Memory Holder",
      title: t("title"),
      description: t("description"),
      url: "/",
    },
    twitter: { card: "summary_large_image" },
  };
}

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
